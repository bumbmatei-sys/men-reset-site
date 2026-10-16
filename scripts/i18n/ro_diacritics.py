"""Romanian diacritics pass: cedilla -> comma-below, then a mimo pass that may only add/fix diacritics.
A suggested change is accepted only if it equals the original once diacritics are stripped."""
import sys, os, json, re, subprocess, unicodedata, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(__file__))
from common import load_dict, save_dict

def strip(s):
    s = s.replace('ș', 's').replace('ț', 't').replace('Ș', 'S').replace('Ț', 'T')
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

CED = str.maketrans({'ş': 'ș', 'ţ': 'ț', 'Ş': 'Ș', 'Ţ': 'Ț'})
SYS = ("You are a Romanian proofreader. For each string, fix ONLY Romanian diacritics: add missing ă â î ș ț, "
       "fix wrong ones (e.g. â vs î by Romanian rules, ă vs a), use comma-below ș ț. Do not change any other character, word, "
       "punctuation, spacing or HTML. If a string is already correct, return it unchanged. Input: JSON array. Output: ONLY the JSON array, same length.")

def run(batch):
    try:
        r = subprocess.run(['mimo', '--max-tokens', '16000', '-s', SYS, json.dumps(batch, ensure_ascii=False)], capture_output=True, text=True, timeout=900)
        o = r.stdout.strip(); arr = json.loads(o[o.index('['): o.rindex(']') + 1])
        return arr if len(arr) == len(batch) else None
    except Exception:
        return None

d = load_dict('ro')
changes = []
for k, v in d.items():
    nv = v.translate(CED)
    if nv != v:
        d[k] = nv
keys = list(d)
batches = [keys[i:i + 25] for i in range(0, len(keys), 25)]
with cf.ThreadPoolExecutor(10) as ex:
    for ks, arr in zip(batches, ex.map(lambda b: run([d[k] for k in b]), batches)):
        if not arr:
            print('batch failed', file=sys.stderr); continue
        for k, nv in zip(ks, arr):
            if not isinstance(nv, str): continue
            nv = nv.translate(CED)
            if nv != d[k] and strip(nv) == strip(d[k]):
                changes.append((d[k], nv)); d[k] = nv
save_dict('ro', d)
json.dump(changes, open('/tmp/ro-diacritics-diff.json', 'w'), ensure_ascii=False, indent=1)
print('cedilla fixed; mimo diacritic changes:', len(changes))
