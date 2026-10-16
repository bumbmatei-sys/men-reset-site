"""Translate client-side (script-rendered) strings into src/i18n/client/<locale>.json. {0},{1} are placeholders."""
import sys, os, json, re, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(__file__))
from common import LOCALES, ROOT
from client_strings import extract
import translate as T

NOISE = re.compile(r'Astro|Stardrive|Tailwind|TypeScript|Lighthouse|llms|codebase|boilerplate|\bURL\b|Invalid|Session ID|wallet|overlay|handler|`|page number|SDK|iframe|JSON|Failed to|protocol|Vitals|Markdown|AI[- ]|\bAPI\b|component|deploy|on-demand|rendering', re.I)
CDIR = os.path.join(ROOT, 'src', 'i18n', 'client')

def load(loc):
    p = os.path.join(CDIR, f'{loc}.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}

def save(loc, d):
    os.makedirs(CDIR, exist_ok=True)
    json.dump(dict(sorted(d.items())), open(os.path.join(CDIR, f'{loc}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

def units():
    return [u for u in extract() if not NOISE.search(u)]

def main():
    us = units()
    T.SYSTEM += "\n- Strings may contain placeholders like {{0}} or {{1}}: keep them exactly, in a natural position.\n- Some strings are fragments of a sentence (they begin or end mid-sentence). Translate them as fragments that still read correctly when joined."
    def work(loc):
        d = load(loc)
        todo = [u for u in us if u not in d]
        bs = [todo[i:i + 30] for i in range(0, len(todo), 30)]
        with cf.ThreadPoolExecutor(6) as ex:
            for r in ex.map(lambda b: T.call(loc, b), bs):
                d.update({k: v for k, v in r.items() if re.findall(r'\{\d+\}', k) == re.findall(r'\{\d+\}', v) or sorted(re.findall(r'\{\d+\}', k)) == sorted(re.findall(r'\{\d+\}', v))})
        save(loc, d)
        return loc, len(todo), len([u for u in us if u not in d])
    with cf.ThreadPoolExecutor(6) as ex:
        for r in ex.map(work, sys.argv[1:] or LOCALES):
            print(r, flush=True)

if __name__ == '__main__':
    main()
