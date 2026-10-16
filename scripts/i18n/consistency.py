"""Make track names (and a few key terms) consistent per locale: wherever the English key mentions a track name,
the translation must use that locale's canonical name. Inconsistent entries are re-translated by mimo with the glossary."""
import sys, os, re, json, subprocess, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(__file__))
from common import load_dict, save_dict, LOCALES
import translate as T
NAMES = ['Break Free', 'Discipline and a Morning Routine', 'Build Your Future', 'Quit Gaming and the Phone', 'New Identity in Christ',
         'Stand Up & Act Like A Man', 'Faith, Grace, and the Kingdom', 'Free 30-Day Reset', '30-Day Reset', 'Become a partner']
FORCE = {'es': {'Become a partner': 'Hazte colaborador'}}
def run(loc):
    d = load_dict(loc)
    gloss = {}
    for n in NAMES:
        if n in FORCE.get(loc, {}): gloss[n] = FORCE[loc][n]
        elif n in d: gloss[n] = d[n]
    for n, v in gloss.items(): d[n] = v
    bad = []
    for k, v in d.items():
        if k in gloss: continue
        for n, g in gloss.items():
            if n in k.replace('&amp;', '&') and g.lower() not in v.lower().replace('&amp;', '&'):
                bad.append(k); break
    if bad:
        extra = "\n- GLOSSARY (mandatory, use these exact names when the English names appear): " + json.dumps(gloss, ensure_ascii=False)
        for i in range(0, len(bad), 25):
            d.update(T.call(loc, bad[i:i + 25], extra))
    still = [k for k in bad if any(n in k and g.lower() not in d[k].lower() for n, g in gloss.items())]
    return loc, d, gloss, len(bad), len(still)
if __name__ == '__main__':
    with cf.ThreadPoolExecutor(6) as ex:
        for loc, d, g, b, s in ex.map(run, sys.argv[1:] or LOCALES):
            save_dict(loc, d); print(loc, 'fixed', b, 'still', s, json.dumps(g, ensure_ascii=False))
