"""Translate new strings from dist/ into src/i18n/site/<locale>.json using the box `mimo` CLI.
Usage: python3 scripts/i18n/translate.py [locale ...]   (run after an English `npm run build`)"""
import sys, os, json, re, subprocess, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(__file__))
from common import *

LANG = {
 'ro': ('Romanian (use correct diacritics ă â î ș ț; spell Jesus as Isus, as in Cornilescu)', 'Cornilescu (1924)'), 'es': ('Spanish', 'Reina-Valera 1960'),
 'fr': ('French', 'Louis Segond 1910'), 'pt': ('Portuguese (European, natural for Brazil too)', 'Almeida Revista e Corrigida'),
 'nb': ('Norwegian Bokmål', 'Bibelen 1930 (or Norsk Bibel 1988 wording)'), 'de': ('German', 'Luther 1912'),
}
SYSTEM = """You translate the website Call to Reset, a free Christian-rooted course that helps men and women break free from addiction (porn, gaming, phone, alcohol, any habit), build discipline and take initiative.
Target language: {lang}.
Voice: warm, plain, honest. Short plain sentences. Spoken, natural phrasing a native speaker would actually use, not word-for-word. Jesus named. Grace before challenge. No hype.
Hard rules:
- Never use em dashes or en dashes. Use a period, comma or colon instead.
- Bible quotes: use the wording of {bible} when quoting Scripture, and keep the reference (book names in {lang}, e.g. John 8:32 becomes the {lang} book name + 8:32).
- Keep every HTML tag and attribute exactly as given (same tags, same order, same href/class/id values). Only translate the human text between tags. Do not add or remove tags.
- Do not translate: Call to Reset, The Harvest, Matei, Matei Bumb, Christ for all Nations, URLs, email addresses, code, prices like $20.
- Keep the same tone of address as the source (use informal "you": tu / tú / tu / tu / du / du).
- UI labels (buttons, nav) stay short.
Input: a JSON array of strings. Output: ONLY a JSON array of the same length with the translations in the same order. No commentary, no code fences."""

TAG = re.compile(r'<[^>]+>')
def tags(s): return [re.sub(r'\s+', ' ', t.split()[0] if t.startswith('</') else t.split()[0]) for t in TAG.findall(s)]

def call(loc, batch):
    lang, bible = LANG[loc]
    for attempt in range(3):
        try:
            r = subprocess.run(['mimo', '--max-tokens', '16000', '-s', SYSTEM.format(lang=lang, bible=bible), json.dumps(batch, ensure_ascii=False)],
                               capture_output=True, text=True, timeout=900)
            out = r.stdout.strip()
            out = re.sub(r'^```(?:json)?|```$', '', out).strip()
            arr = json.loads(out[out.index('['): out.rindex(']') + 1])
            if len(arr) != len(batch):
                raise ValueError(f'length {len(arr)} != {len(batch)}')
            good = {}
            for src, dst in zip(batch, arr):
                if not isinstance(dst, str):
                    continue
                if tags(src) != tags(dst):
                    continue
                dst = dst.replace(' — ', ', ').replace(' – ', ', ').replace('—', ', ').replace('–', '-')
                good[src] = dst
            return good
        except Exception as e:
            err = e
    print(f'[{loc}] batch failed: {err}', file=sys.stderr)
    return {}

def main():
    locs = sys.argv[1:] or LOCALES
    units = set()
    for p in pages():
        units |= set(collect_page(os.path.join(DIST, p)))
    for loc in locs:
        d = load_dict(loc)
        todo = sorted(u for u in units if u not in d)
        print(f'[{loc}] {len(todo)} new strings')
        batches, cur, size = [], [], 0
        for u in todo:
            if cur and (size + len(u) > 6000 or len(cur) >= int(os.environ.get('BATCH', 40))):
                batches.append(cur); cur, size = [], 0
            cur.append(u); size += len(u)
        if cur: batches.append(cur)
        with cf.ThreadPoolExecutor(8) as ex:
            for i, res in enumerate(ex.map(lambda b: call(loc, b), batches)):
                d.update(res)
                if i % 5 == 0: save_dict(loc, d)
        save_dict(loc, d)
        missing = [u for u in units if u not in d]
        print(f'[{loc}] done, {len(missing)} still missing')

if __name__ == '__main__':
    main()
