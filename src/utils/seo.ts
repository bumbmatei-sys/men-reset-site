import { themeConfig } from '~/theme.config';

/**
 * Meta description for search snippets: the page's own description, cut to about 160 characters.
 * Cuts at the last full sentence when that keeps enough text, otherwise at a word, with an ellipsis.
 */
export function snippet(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  if (sentenceEnd >= 90) return cut.slice(0, sentenceEnd + 1);
  const word = cut.lastIndexOf(' ');
  return `${cut.slice(0, word > 0 ? word : max - 1).replace(/[,;:.]$/, '')}…`;
}

/** Absolute URL on the site for a public path like /images/x.webp. */
export function absoluteUrl(path: string): string {
  return new URL(path, themeConfig.site).toString();
}
