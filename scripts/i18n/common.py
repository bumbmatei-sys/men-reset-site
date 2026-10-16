"""Shared helpers for the post-build translation pipeline."""
import json, os, re, hashlib
from bs4 import BeautifulSoup, NavigableString, Comment, Doctype

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIST = os.path.join(ROOT, 'dist')
DICT_DIR = os.path.join(ROOT, 'src', 'i18n', 'site')
LOCALES = ['ro', 'es', 'fr', 'pt', 'nb', 'de']
NAMES = {'en': 'English', 'ro': 'Română', 'es': 'Español', 'fr': 'Français', 'pt': 'Português', 'nb': 'Norsk', 'de': 'Deutsch'}
OG = {'en': 'en_US', 'ro': 'ro_RO', 'es': 'es_ES', 'fr': 'fr_FR', 'pt': 'pt_PT', 'nb': 'nb_NO', 'de': 'de_DE'}
SKIP_PAGES = {'404_dynamic.html'}
BLOCK = {'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'figcaption', 'dt', 'dd', 'td', 'th',
         'label', 'button', 'summary', 'legend', 'option', 'title', 'a'}
NOTEXT = {'script', 'style', 'code', 'pre', 'svg', 'template', 'noscript', 'textarea'}
ATTRS = ['alt', 'title', 'placeholder', 'aria-label', 'data-tooltip']
META_NAMES = {'description', 'twitter:title', 'twitter:description', 'twitter:image:alt'}
META_PROPS = {'og:title', 'og:description', 'og:image:alt', 'og:site_name'}
LD_KEYS = {'description', 'headline', 'text', 'name', 'abstract', 'alternativeHeadline', 'articleSection'}
LD_NAME_SKIP_TYPES = {'Person', 'Organization', 'Brand', 'ImageObject'}
HAS_LETTERS = re.compile(r'[A-Za-z]')


def pages():
    out = []
    for dp, _, fs in os.walk(DIST):
        rel = os.path.relpath(dp, DIST)
        if rel.split(os.sep)[0] in LOCALES or rel.startswith('_astro'):
            continue
        for f in fs:
            if f.endswith('.html'):
                r = os.path.normpath(os.path.join(rel, f))
                if r not in SKIP_PAGES and r[:-5] not in LOCALES:
                    out.append(r)
    return sorted(out)


def page_url(rel):
    """dist-relative file -> public path (build.format=file, trailingSlash never)."""
    p = '/' + rel[:-5]
    if p == '/index':
        return '/'
    if p.endswith('/index'):
        p = p[:-6]
    return p


def soup(path):
    with open(path, encoding='utf-8') as fh:
        return BeautifulSoup(fh.read(), 'html.parser')


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def translatable(s):
    s = norm(s)
    return bool(s) and bool(HAS_LETTERS.search(s))


def no_translate(el):
    for e in [el, *el.parents]:
        if getattr(e, 'attrs', None) and (e.attrs.get('translate') == 'no' or 'data-no-translate' in e.attrs):
            return True
    return False


def inner(el):
    return norm(el.decode_contents())


def walk_units(root, fn_html, fn_text):
    """Call fn_html(el) for block units, fn_text(node) for loose text nodes."""
    for child in list(root.children):
        if isinstance(child, (Comment, Doctype)):
            continue
        if isinstance(child, NavigableString):
            if translatable(str(child)) and not no_translate(root):
                fn_text(child)
            continue
        name = child.name
        if name in NOTEXT or no_translate(child):
            continue
        if name in BLOCK and translatable(child.get_text()):
            # a block holding other blocks: descend instead
            if child.find(lambda t: t.name in BLOCK - {'a'} or t.name in {'div', 'ul', 'ol', 'section', 'p'}):
                walk_units(child, fn_html, fn_text)
            else:
                fn_html(child)
            continue
        walk_units(child, fn_html, fn_text)


def collect_page(path):
    s = soup(path)
    units = []
    if s.html is None:
        return units
    walk_units(s.html, lambda el: units.append(inner(el)), lambda n: units.append(norm(str(n))))
    for el in s.find_all(True):
        if el.name in NOTEXT and el.name != 'svg':
            continue
        for a in ATTRS:
            v = el.attrs.get(a)
            if isinstance(v, str) and translatable(v) and not no_translate(el):
                units.append(norm(v))
    for m in s.find_all('meta'):
        if (m.get('name') in META_NAMES or m.get('property') in META_PROPS) and translatable(m.get('content', '')):
            units.append(norm(m['content']))
    for sc in s.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(sc.string or '')
        except Exception:
            continue
        ld_walk(data, lambda v: units.append(norm(v)))
    return units


def ld_walk(node, fn, parent_type=None):
    if isinstance(node, list):
        for i, v in enumerate(node):
            r = ld_walk(v, fn, parent_type)
            if r is not None:
                node[i] = r
        return None
    if isinstance(node, dict):
        t = node.get('@type')
        t = t[0] if isinstance(t, list) and t else t
        for k, v in list(node.items()):
            if isinstance(v, str):
                if k in LD_KEYS and translatable(v) and not (k == 'name' and t in LD_NAME_SKIP_TYPES) and not v.startswith('http'):
                    r = fn(v)
                    if r is not None:
                        node[k] = r
            else:
                ld_walk(v, fn, t)
    return None


def load_dict(loc):
    p = os.path.join(DICT_DIR, f'{loc}.json')
    if os.path.exists(p):
        with open(p, encoding='utf-8') as fh:
            return json.load(fh)
    return {}


def save_dict(loc, d):
    os.makedirs(DICT_DIR, exist_ok=True)
    with open(os.path.join(DICT_DIR, f'{loc}.json'), 'w', encoding='utf-8') as fh:
        json.dump(dict(sorted(d.items())), fh, ensure_ascii=False, indent=1)
