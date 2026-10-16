"""Lesson Scripture blocks: replace verse text with the locale's Bible version and set the version label."""
import sys, os, re, json, glob, subprocess, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(__file__))
from common import ROOT, load_dict, save_dict, LOCALES
VER = {'ro': ('Romanian', 'Cornilescu 1924 (Biblia Cornilescu, ortografie actuală cu â/î și ș ț)', 'Cornilescu'),
       'es': ('Spanish', 'Reina-Valera 1960', 'RVR1960'), 'fr': ('French', 'Louis Segond 1910', 'LSG'),
       'pt': ('Portuguese', 'João Ferreira de Almeida Revista e Corrigida', 'ARC'),
       'nb': ('Norwegian Bokmål', 'Bibelen 1930', 'Bibelen 1930'), 'de': ('German', 'Lutherbibel 1912', 'Luther 1912')}
items = []
for f in sorted(glob.glob(os.path.join(ROOT, 'src/content/lessons/*.md'))):
    fm = open(f).read().split('---')[1]
    m = re.search(r'^scripture:\n((?:[ \t]+.*\n)+)', fm, re.M)
    if not m: continue
    blk = m.group(1)
    def val(key):
        mm = re.search(r'^\s+' + key + r':\s*(.+)$', blk, re.M)
        if not mm: return None
        v = mm.group(1).strip()
        if v[:1] in '"\'': v = json.loads(v) if v[0] == '"' else v[1:-1]
        return v
    t, r = val('text'), val('reference')
    if t and r:
        items.append((re.sub(r'\s+', ' ', t).strip(), r.strip()))
def work(loc):
    lang, ver, label = VER[loc]
    prompt = (f"For each Bible reference below, give the exact verse text from the {ver} in {lang}, and the reference with the {lang} book name "
              f"(use the punctuation convention of that Bible, e.g. German 'Johannes 3,16'). The English (KJV) text is given only to identify the passage. "
              f"Quote the version faithfully; do not paraphrase. Never use em or en dashes; for verse ranges use a plain hyphen. "
              f"Output ONLY a JSON array of objects {{\"ref\": ..., \"text\": ...}} in the same order.\n\n" + json.dumps([{'ref': r, 'kjv': t} for t, r in items], ensure_ascii=False))
    arr = None
    for _ in range(3):
        try:
            out = subprocess.run(['mimo', '--max-tokens', '16000', prompt], capture_output=True, text=True, timeout=900).stdout
            arr = json.loads(out[out.index('['): out.rindex(']') + 1])
            if len(arr) == len(items) and all('text' in a and 'ref' in a for a in arr): break
            arr = None
        except Exception:
            arr = None
    if arr is None:
        print(loc, 'FAILED'); return loc, None
    d = load_dict(loc)
    for (t, r), a in zip(items, arr):
        d[t] = a['text'].replace('—', ', ').replace('–', '-')
        d[f'{r} (KJV)'] = f"{a['ref']} ({label})"
    # any other leftover KJV label in values
    for k, v in d.items():
        if '(KJV)' in v:
            d[k] = v.replace('(KJV)', f'({label})')
    return loc, d
if __name__ == '__main__':
    locs = sys.argv[1:] or LOCALES
    with cf.ThreadPoolExecutor(6) as ex:
        res = list(ex.map(work, locs))
    for loc, d in res:
        if d is not None: save_dict(loc, d); print(loc, 'ok')
