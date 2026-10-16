"""Post-build: generate dist/<locale>/... pages from the English build using src/i18n/site/<locale>.json.
Adds hreflang alternates, lang attr, og:locale, JSON-LD inLanguage, localized links and sitemap entries.
Strings missing from a dictionary stay English. Run after `astro build` (npm run build does this)."""
import sys, os, json, re
from bs4 import NavigableString, BeautifulSoup
sys.path.insert(0, os.path.dirname(__file__))
from common import *

SITE = 'https://calltoreset.site'

def loc_url(path, loc):
    if loc == 'en':
        return path
    return f'/{loc}' if path == '/' else f'/{loc}{path}'

def add_alternates(s, path):
    head = s.head
    for l in head.find_all('link', rel='alternate'):
        if l.get('hreflang'):
            l.decompose()
    for loc in ['en', *LOCALES]:
        t = s.new_tag('link', rel='alternate', hreflang=loc, href=SITE + loc_url(path, loc))
        head.append(t)
    head.append(s.new_tag('link', rel='alternate', hreflang='x-default', href=SITE + path))

def translate_page(rel, loc, d, page_paths, stats):
    src = os.path.join(DIST, rel)
    s = soup(src)
    path = page_url(rel)
    hit = miss = 0

    def tr(text):
        nonlocal hit, miss
        k = norm(text)
        if k in d:
            hit += 1
            v = d[k]
            if k[:1].isupper() and v[:1].islower():
                v = v[:1].upper() + v[1:]
            return v
        miss += 1
        stats.setdefault('missing', set()).add(k)
        return None

    def do_html(el):
        r = tr(inner(el))
        if r is not None:
            el.clear()
            frag = BeautifulSoup(r, 'html.parser')
            for c in list(frag.contents):
                el.append(c)

    def do_text(node):
        raw = str(node)
        r = tr(raw)
        if r is not None:
            lead = raw[: len(raw) - len(raw.lstrip())]
            trail = raw[len(raw.rstrip()):]
            node.replace_with(NavigableString(lead + r + trail))

    walk_units(s.html, do_html, do_text)
    for el in s.find_all(True):
        if el.name in NOTEXT and el.name != 'svg':
            continue
        if no_translate(el):
            continue
        for a in ATTRS:
            v = el.attrs.get(a)
            if isinstance(v, str) and translatable(v):
                r = tr(v)
                if r is not None:
                    el.attrs[a] = r
    for m in s.find_all('meta'):
        if (m.get('name') in META_NAMES or m.get('property') in META_PROPS) and translatable(m.get('content', '')):
            r = tr(m['content'])
            if r is not None:
                m['content'] = r
        if m.get('property') == 'og:locale':
            m['content'] = OG[loc]
        if m.get('property') == 'og:url':
            m['content'] = SITE + loc_url(path, loc)
    for sc in s.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(sc.string or '')
        except Exception:
            continue
        ld_walk(data, tr)
        def set_lang(n):
            if isinstance(n, list):
                for x in n: set_lang(x)
            elif isinstance(n, dict):
                if 'inLanguage' in n: n['inLanguage'] = loc
                for k, v in n.items():
                    if isinstance(v, str) and (v == SITE or v.startswith(SITE + '/')):
                        m2 = re.match(r'([^?#]*)(.*)', v[len(SITE):])
                        p = m2.group(1).rstrip('/') or '/'
                        if p in page_paths:
                            n[k] = SITE + loc_url(p, loc) + m2.group(2)
                    elif not isinstance(v, str):
                        set_lang(v)
        set_lang(data)
        if isinstance(data, dict) and data.get('@type') in ('WebPage', 'Article', 'BlogPosting', 'Course', 'WebSite', 'CollectionPage') and 'inLanguage' not in data:
            data['inLanguage'] = loc
        sc.string = json.dumps(data, ensure_ascii=False)
    # links
    for a in s.find_all(['a', 'link', 'form']):
        attr = 'action' if a.name == 'form' else 'href'
        h = a.get(attr)
        if not isinstance(h, str) or not h.startswith('/') or h.startswith('//') or no_translate(a):
            continue
        if a.name == 'link' and a.get('rel') and ('alternate' in a['rel'] and a.get('hreflang')):
            continue
        p, sep, rest = re.match(r'([^?#]*)([?#]?)(.*)', h).groups()
        p2 = p.rstrip('/') or '/'
        if p2 in page_paths:
            a[attr] = loc_url(p2, loc) + sep + rest
    for c in s.find_all('link', rel='canonical'):
        c['href'] = SITE + loc_url(path, loc)
    s.html['lang'] = loc
    if s.head is not None:
        tag = s.new_tag('script', src=f'/_i18n/{loc}.js')
        first = s.head.find(['script', 'link', 'style'])
        (first.insert_before(tag) if first else s.head.append(tag))
    add_alternates(s, path)
    out = os.path.join(DIST, f'{loc}.html') if rel == 'index.html' else os.path.join(DIST, loc, rel)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write(str(s))
    stats['hit'] = stats.get('hit', 0) + hit
    stats['miss'] = stats.get('miss', 0) + miss

def sitemap(page_paths):
    p = os.path.join(DIST, 'sitemap-0.xml')
    if not os.path.exists(p):
        return
    x = open(p, encoding='utf-8').read()
    if 'xmlns:xhtml' not in x:
        x = x.replace('<urlset ', '<urlset xmlns:xhtml="http://www.w3.org/1999/xhtml" ', 1)
    urls = re.findall(r'<url>(.*?)</url>', x, re.S)
    out = []
    for u in urls:
        m = re.search(r'<loc>(.*?)</loc>', u)
        path = m.group(1)[len(SITE):] or '/'
        alts = ''.join(f'<xhtml:link rel="alternate" hreflang="{l}" href="{SITE}{loc_url(path, l)}"/>' for l in ['en', *LOCALES]) + f'<xhtml:link rel="alternate" hreflang="x-default" href="{SITE}{path}"/>'
        clean = re.sub(r'<xhtml:link[^>]*/>', '', u)
        out.append(f'<url>{clean}{alts}</url>')
        if path in page_paths:
            for l in LOCALES:
                out.append(f'<url>{clean.replace(m.group(0), f"<loc>{SITE}{loc_url(path, l)}</loc>")}{alts}</url>')
    x = re.sub(r'<url>.*</url>', lambda _: ''.join(out), x, count=1, flags=re.S)
    open(p, 'w', encoding='utf-8').write(x)

def client_bundle(loc):
    p = os.path.join(ROOT, 'src', 'i18n', 'client', f'{loc}.json')
    d = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
    exact = {k: v for k, v in d.items() if not re.search(r'\{\d+\}', k)}
    pats = []
    for k, v in d.items():
        if re.search(r'\{\d+\}', k):
            parts = re.split(r'(\{\d+\})', k)
            src = ''.join('(.+?)' if re.fullmatch(r'\{\d+\}', x) else re.escape(x) for x in parts)
            # renumber placeholders by order of appearance so m[i+1] lines up
            order = [int(x[1:-1]) for x in parts if re.fullmatch(r'\{\d+\}', x)]
            vv = re.sub(r'\{(\d+)\}', lambda m: '{' + str(order.index(int(m.group(1)))) + '}' if int(m.group(1)) in order else m.group(0), v)
            pats.append([src, vv])
    js = open(os.path.join(os.path.dirname(__file__), 'runtime.js'), encoding='utf-8').read()
    js = js.replace('__DICT__', json.dumps(exact, ensure_ascii=False)).replace('__PATTERNS__', json.dumps(pats, ensure_ascii=False))
    os.makedirs(os.path.join(DIST, '_i18n'), exist_ok=True)
    open(os.path.join(DIST, '_i18n', f'{loc}.js'), 'w', encoding='utf-8').write(js)

def main():
    for loc in LOCALES:
        client_bundle(loc)
    rels = pages()
    page_paths = {page_url(r) for r in rels}
    for loc in LOCALES:
        d = load_dict(loc)
        stats = {}
        for rel in rels:
            translate_page(rel, loc, d, page_paths, stats)
        print(f'[i18n] {loc}: {len(rels)} pages, {stats.get("hit",0)} strings translated, {stats.get("miss",0)} left in English ({len(stats.get("missing", []))} unique)')
    # English pages: add alternates + keep lang
    for rel in rels:
        src = os.path.join(DIST, rel)
        s = soup(src)
        add_alternates(s, page_url(rel))
        with open(src, 'w', encoding='utf-8') as fh:
            fh.write(str(s))
    sitemap(page_paths)
    with open(os.path.join(DIST, 'i18n-pages.json'), 'w') as fh:
        json.dump(sorted(page_paths), fh)

def hide():
    """I18N_PUBLIC!=1 (production default): English only. No locale pages, no switcher, no hreflang,
    no first-visit redirect (middleware only routed for /api), locale URLs 301 to English."""
    for rel in pages():
        src = os.path.join(DIST, rel)
        s = soup(src)
        for el in s.select('[data-lang-switch], .lang-switch-list, link[rel~=alternate][hreflang]'):
            el.decompose()
        with open(src, 'w', encoding='utf-8') as fh:
            fh.write(str(s))
    with open(os.path.join(DIST, '_routes.json'), 'w') as fh:
        json.dump({'version': 1, 'include': ['/api/*', '/email/*'], 'exclude': []}, fh)
    with open(os.path.join(DIST, '_redirects'), 'a') as fh:
        fh.write('\n' + ''.join(f'/{l} / 301\n/{l}/* /:splat 301\n' for l in LOCALES))
    print('[i18n] hidden (I18N_PUBLIC != 1): English only')

if __name__ == '__main__':
    hide() if os.environ.get('I18N_PUBLIC') != '1' else main()
