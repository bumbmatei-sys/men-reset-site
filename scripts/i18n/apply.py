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

def add_alternates(s, path, published=None):
    head = s.head
    for l in head.find_all('link', rel='alternate'):
        if l.get('hreflang'):
            l.decompose()
    for loc in ['en', *(published if published is not None else LOCALES)]:
        t = s.new_tag('link', rel='alternate', hreflang=loc, href=SITE + loc_url(path, loc))
        head.append(t)
    head.append(s.new_tag('link', rel='alternate', hreflang='x-default', href=SITE + path))

def translate_page(rel, loc, d, page_paths, stats, published_paths=None):
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
    for a in list(s.find_all(['a', 'link', 'form'])):
        attr = 'action' if a.name == 'form' else 'href'
        h = a.get(attr)
        if not isinstance(h, str) or not h.startswith('/') or h.startswith('//') or no_translate(a):
            continue
        if a.name == 'link' and a.get('rel') and ('alternate' in a['rel'] and a.get('hreflang')):
            continue
        p, sep, rest = re.match(r'([^?#]*)([?#]?)(.*)', h).groups()
        p2 = p.rstrip('/') or '/'
        if p2 in page_paths:
            if published_paths is not None and p2 not in published_paths:
                if a.name == 'a':
                    # Do not expose untranslated content in localized lists or navigation.
                    card = a.find_parent(['article', 'li'])
                    (card if card is not None else a).decompose()
                continue
            a[attr] = loc_url(p2, loc) + sep + rest
    for c in s.find_all('link', rel='canonical'):
        c['href'] = SITE + loc_url(path, loc)
    s.html['lang'] = loc
    if s.head is not None:
        tag = s.new_tag('script', src=f'/_i18n/{loc}.js')
        first = s.head.find(['script', 'link', 'style'])
        (first.insert_before(tag) if first else s.head.append(tag))
    add_alternates(s, path, [loc] if published_paths is not None else None)
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

def german_only():
    """Publish only complete German pages; no English fallback and no other locales."""
    loc = 'de'
    rels = pages()
    d = load_dict(loc)
    eligible = []
    for rel in rels:
        units = {norm(u) for u in collect_page(os.path.join(DIST, rel)) if translatable(u)}
        # An absent translation or a copied English value does not count as translated.
        if units and all(u in d and norm(d[u]) and norm(d[u]) != u for u in units):
            eligible.append(rel)
    paths = {page_url(r) for r in eligible}
    all_paths = {page_url(r) for r in rels}
    stats = {}
    client_bundle(loc)
    for rel in eligible:
        translate_page(rel, loc, d, all_paths, stats, paths)
    for rel in rels:
        src = os.path.join(DIST, rel)
        s = soup(src)
        if page_url(rel) in paths:
            add_alternates(s, page_url(rel), ['de'])
        else:
            for el in s.select('[data-lang-switch] a[href^="/de"], .lang-switch-list a[href^="/de"]'):
                el.decompose()
        with open(src, 'w', encoding='utf-8') as fh:
            fh.write(str(s))
    # Sitemap German entries and hreflang only for published translations.
    sitemap_german(paths)
    with open(os.path.join(DIST, 'i18n-pages.json'), 'w') as fh:
        json.dump(sorted(paths), fh)
    if '/' not in paths:
        raise RuntimeError('German homepage is incomplete: refusing to publish an unusable German site')
    print(f'[i18n] German published: {len(eligible)}/{len(rels)} fully translated pages; other languages hidden')


def sitemap_german(paths):
    p = os.path.join(DIST, 'sitemap-0.xml')
    if not os.path.exists(p):
        return
    x = open(p, encoding='utf-8').read()
    if 'xmlns:xhtml' not in x:
        x = x.replace('<urlset ', '<urlset xmlns:xhtml="http://www.w3.org/1999/xhtml" ', 1)
    def entry(m):
        u = m.group(0)
        found = re.search(r'<loc>(.*?)</loc>', u)
        if not found:
            return u
        path = found.group(1)[len(SITE):] or '/'
        if path not in paths:
            return u
        alt = ''.join(f'<xhtml:link rel="alternate" hreflang="{l}" href="{SITE}{loc_url(path,l)}"/>' for l in ['en','de'])
        german = u.replace(found.group(0), f'<loc>{SITE}{loc_url(path,"de")}</loc>')
        return u.replace('</url>', alt + '</url>') + german.replace('</url>', alt + '</url>')
    x = re.sub(r'<url>.*?</url>', entry, x, flags=re.S)
    open(p, 'w', encoding='utf-8').write(x)

def main():
    german_only()

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
    main() if os.environ.get('I18N_PUBLIC') in ('de', '1') else hide()
