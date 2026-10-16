"""Extract user-facing string literals from built client JS (dist/_astro/*.js and inline <script>s).
Template literals are split on HTML tags; ${...} holes become {0},{1}.. placeholders (matched as regex at runtime)."""
import os, re, sys, json, glob
sys.path.insert(0, os.path.dirname(__file__))
from common import DIST, pages, soup

def scan(js):
    out, i, n = [], 0, len(js)
    while i < n:
        c = js[i]
        if c == '/' and i + 1 < n and js[i + 1] == '/':
            j = js.find('\n', i); i = n if j < 0 else j; continue
        if c == '/' and i + 1 < n and js[i + 1] == '*':
            j = js.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if c in '"\'':
            j, buf = i + 1, []
            while j < n and js[j] != c:
                if js[j] == '\\' and j + 1 < n: buf.append(js[j:j + 2]); j += 2; continue
                if js[j] == '\n': break
                buf.append(js[j]); j += 1
            out.append(('s', ''.join(buf))); i = j + 1; continue
        if c == '`':
            j, parts, cur = i + 1, [], []
            while j < n and js[j] != '`':
                if js[j] == '\\' and j + 1 < n: cur.append(js[j:j + 2]); j += 2; continue
                if js[j] == '$' and j + 1 < n and js[j + 1] == '{':
                    depth, k = 1, j + 2
                    while k < n and depth:
                        if js[k] == '{': depth += 1
                        elif js[k] == '}': depth -= 1
                        elif js[k] in '"\'`':
                            q = js[k]; k += 1
                            while k < n and js[k] != q:
                                k += 2 if js[k] == '\\' else 1
                        k += 1
                    cur.append('\x00'); j = k; continue
                cur.append(js[j]); j += 1
            out.append(('t', ''.join(cur))); i = j + 1; continue
        i += 1
    return out

def unesc(s):
    try:
        return json.loads('"' + s.replace('"', '\\"').replace("\\'", "'") + '"')
    except Exception:
        return s

CODEY = re.compile(r'(=>|function\b|\bvar\b|\blet\b|const |return |\|\||&&|==|\bnull\b|undefined|querySelector|addEventListener|data-[a-z]|^[.#\[]|https?:|^/|\.(js|css|svg|png|webp|json)\b|[{};]|^\w+\(|px\b|rem\b|rgba?\(|var\(--)')
def userfacing(s):
    s = re.sub(r'\s+', ' ', s).strip()
    if len(s) < 2 or not re.search(r'[A-Za-z]', s) or CODEY.search(s):
        return None
    words = s.split(' ')
    if len(words) == 1:
        # single words: only Capitalized words (labels)
        if not re.fullmatch(r'[A-Z][a-z]+[.!?…:]?', s) or s in {'Error', 'Infinity', 'Symbol', 'Promise', 'Object', 'Array', 'Date', 'String', 'Number', 'Boolean', 'Map', 'Set', 'GET', 'POST', 'Math', 'JSON', 'Reflect', 'Proxy', 'Escape', 'Enter', 'Tab', 'Space', 'ArrowDown', 'ArrowUp'}:
            return None
    else:
        if all(re.fullmatch(r'[a-z0-9\-_:/]+', w) for w in words):  # class lists etc.
            return None
        if not re.search(r'[a-z]{2,}', s):
            return None
    return s

def pieces(kind, raw):
    s = unesc(raw) if kind == 's' else raw.replace('\\n', ' ').replace('\\`', '`').replace('\\"', '"').replace("\\'", "'")
    if '<' in s and '>' in s:
        segs = re.split(r'<[^>]*>', s)
    else:
        segs = [s]
    res = []
    for seg in segs:
        seg = re.sub(r'\s+', ' ', seg).strip()
        if '\x00' in seg:
            cnt = [0]
            def rep(_):
                cnt[0] += 1; return '{' + str(cnt[0] - 1) + '}'
            seg2 = re.sub('\x00', rep, seg)
            core = re.sub(r'\{\d+\}', '', seg2)
            if userfacing(core.replace('  ', ' ')) or (re.search(r'[a-z]{3,}', core) and ' ' in core.strip()):
                if not CODEY.search(core):
                    res.append(seg2)
            # literal sub-parts as well
            for part in seg.split('\x00'):
                u = userfacing(part)
                if u: res.append(u)
        else:
            u = userfacing(seg)
            if u: res.append(u)
    return res

def extract():
    found = set()
    for f in glob.glob(os.path.join(DIST, '_astro', '*.js')):
        js = open(f, encoding='utf-8', errors='ignore').read()
        for kind, raw in scan(js):
            found.update(pieces(kind, raw))
    for p in pages():
        s = soup(os.path.join(DIST, p))
        for sc in s.find_all('script'):
            if sc.get('type') in ('application/ld+json',) or sc.get('src'):
                continue
            for kind, raw in scan(sc.string or ''):
                found.update(pieces(kind, raw))
    return sorted(found)

if __name__ == '__main__':
    xs = extract()
    print(len(xs))
    for x in xs: print(repr(x))
