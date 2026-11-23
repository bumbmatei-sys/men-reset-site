/**
 * First-visit language redirect. Only for English (unprefixed) HTML pages, only when no `lang`
 * cookie is set, and never for bots. The header language switcher sets the cookie.
 */
const LOCALES = ['de'] as const;
type Locale = (typeof LOCALES)[number];
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|whatsapp|telegram|discord|slack|linkedin|vkshare|w3c_validator|lighthouse|headless|preview|curl|wget|python|httpclient|go-http|java\/|axios|node-fetch|monitor|uptime|ahrefs|semrush|mj12|dotbot|petal|yandex|baidu|duckduck|applebot|google|bing/i;
const COUNTRY: Record<string, Locale> = { DE: 'de', AT: 'de', LI: 'de' };

function fromAcceptLanguage(header: string | null): Locale | 'en' | null {
  if (!header) return null;
  const prefs = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { tag, q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((p) => p.tag && p.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of prefs) {
    const base = tag.split('-')[0];
    if (base === 'en') return 'en';
    if ((LOCALES as readonly string[]).includes(base)) return base as Locale;
  }
  return prefs.length ? 'en' : null;
}

export const onRequest: PagesFunction = async (context) => {
  const { request, next } = context;
  if (request.method !== 'GET') return next();
  const url = new URL(request.url);
  const path = url.pathname;
  const first = path.split('/')[1];
  if ((LOCALES as readonly string[]).includes(first) || path.startsWith('/api/') || /\.[a-z0-9]+$/i.test(path)) return next();
  const accept = request.headers.get('accept') || '';
  if (!accept.includes('text/html')) return next();
  const cookie = request.headers.get('cookie') || '';
  if (/(?:^|;\s*)lang=/.test(cookie)) return next();
  const ua = request.headers.get('user-agent') || '';
  if (!ua || BOT.test(ua)) return next();

  let target = fromAcceptLanguage(request.headers.get('accept-language'));
  if (target === null) {
    const country = (request as Request & { cf?: { country?: string } }).cf?.country || request.headers.get('cf-ipcountry') || '';
    target = COUNTRY[country.toUpperCase()] ?? 'en';
  }
  if (target === 'en') return next();

  const res = await next();
  if (res.status !== 200 || !(res.headers.get('content-type') || '').includes('text/html')) return res;
  const dest = new URL(url);
  dest.pathname = path === '/' ? `/${target}` : `/${target}${path.replace(/\/$/, '')}`;
  return new Response(null, {
    status: 302,
    headers: { location: dest.pathname + dest.search, vary: 'Accept-Language, Cookie', 'cache-control': 'private, no-store' },
  });
};
