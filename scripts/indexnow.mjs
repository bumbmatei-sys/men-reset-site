#!/usr/bin/env node
// Submit URLs to IndexNow (Bing, Yandex, Seznam, Naver and others).
// Usage: npm run indexnow            -> every URL in the live sitemap
//        npm run indexnow -- <url>... -> only the given URLs
const HOST = 'calltoreset.site';
const KEY = '87311d254ac36fef9aa959f0bf4f922b';
const ORIGIN = `https://${HOST}`;

async function sitemapUrls(url) {
  const xml = await (await fetch(url)).text();
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (/<sitemapindex/.test(xml)) {
    const nested = await Promise.all(locs.map(sitemapUrls));
    return nested.flat();
  }
  return locs;
}

const urlList = process.argv.length > 2 ? process.argv.slice(2) : await sitemapUrls(`${ORIGIN}/sitemap-index.xml`);
const unique = [...new Set(urlList)].filter((u) => u.startsWith(ORIGIN));
if (!unique.length) {
  console.error('No URLs to submit.');
  process.exit(1);
}
for (let i = 0; i < unique.length; i += 10000) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList: unique.slice(i, i + 10000) }),
  });
  console.log(`IndexNow: ${res.status} ${res.statusText} for ${unique.slice(i, i + 10000).length} URLs`);
  if (res.status >= 400) process.exitCode = 1;
}
