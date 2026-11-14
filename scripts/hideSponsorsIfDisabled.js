#!/usr/bin/env node
/**
 * When SPONSORS_ENABLED is false, drop built partner pages from dist, point
 * the partner aliases at home, and strip those URLs from the sitemap and
 * llms.txt. The source files stay in the repo. Flip the flag and rebuild to
 * restore them.
 */
import { readdirSync, readFileSync, unlinkSync, writeFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { SPONSORS_ENABLED } from '../src/data/site.ts';

if (SPONSORS_ENABLED) {
  console.log('ℹ️  Sponsors are enabled. Leaving partner pages in the build.');
  process.exit(0);
}

const distDir = path.join(process.cwd(), 'dist');
const hiddenFiles = ['partner.html', 'partners.html', 'partner/index.html', 'partners/index.html'];

// Exact /partner and /partners only. Do not touch paths like
// /teachings/christian-accountability-partner.
const hiddenLoc = /<url>\s*<loc>https?:\/\/[^/<]+\/partners?<\/loc>\s*<\/url>/g;
const hiddenLink = /https?:\/\/[^/\s)]+\/partners?(?=[)"<\s]|$)/;

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const removed = new Set();
function removeFile(file) {
  if (!existsSync(file) || !statSync(file).isFile() || removed.has(file)) return;
  unlinkSync(file);
  removed.add(file);
  console.log(`🗑️  Removed ${path.relative(distDir, file)} from dist (sponsors hidden).`);
}

for (const rel of hiddenFiles) removeFile(path.join(distDir, rel));

for (const file of walk(distDir)) {
  const rel = path.relative(distDir, file).replaceAll('\\', '/');
  if (/^([a-z]{2}\/)?partners?(\/index)?\.html$/.test(rel)) removeFile(file);
}

const redirectsPath = path.join(distDir, '_redirects');
if (existsSync(redirectsPath)) {
  let redirects = readFileSync(redirectsPath, 'utf8');
  redirects = redirects
    .replace(/^\/advertise\s+\/partner\s+301\s*$/m, '/advertise / 301')
    .replace(/^\/sponsors\s+\/partners\s+301\s*$/m, '/sponsors / 301')
    .replace(/^\/sponsor\s+\/partner\s+301\s*$/m, '/sponsor / 301');
  const lines = [];
  if (!/^\/partner\s+\//m.test(redirects)) lines.push('/partner / 301');
  if (!/^\/partners\s+\//m.test(redirects)) lines.push('/partners / 301');
  if (lines.length) redirects = `${lines.join('\n')}\n${redirects}`;
  writeFileSync(redirectsPath, redirects);
  console.log('🔀  Partner URLs in _redirects now point to /.');
}

for (const file of walk(distDir)) {
  const rel = path.relative(distDir, file).replaceAll('\\', '/');
  if (/(^|\/)sitemap[^/]*\.xml$/.test(rel)) {
    const before = readFileSync(file, 'utf8');
    const after = before.replace(hiddenLoc, '');
    if (after !== before) {
      writeFileSync(file, after);
      console.log(`✂️  Stripped partner URLs from ${rel}.`);
    }
  }
  if (/(^|\/)llms\.txt$/.test(rel)) {
    const before = readFileSync(file, 'utf8');
    const after = before
      .split(/\r?\n/)
      .filter((line) => !hiddenLink.test(line))
      .join('\n');
    if (after !== before) {
      writeFileSync(file, after);
      console.log(`✂️  Stripped partner URLs from ${rel}.`);
    }
  }
}

console.log(`✅ Sponsor hide step done (${removed.size} page file(s) removed).`);
