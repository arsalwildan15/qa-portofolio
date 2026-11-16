"""Write curated taxonomy codes into the 'Kategori :' header line of older specs.

Usage (repo root): python tools/coverage/apply_codes.py tools/coverage/pim_codes.json [--dry-run]

The JSON maps a TC id to the codes the spec really verifies ("2.1 3.1"), or "-" when it verifies
nothing a taxonomy item names. The header becomes e.g.
    * Kategori : Negative (-) 2.1 | Boundary (B) 3.1
keeping any trailing tag such as [TEMUAN] or [API VERIFICATION]. Only the header comment changes;
test behaviour is untouched. build_matrix.py reads codes from this line (explicit mode).
"""
import glob, json, os, re, sys

GROUP = {'1': 'Positive (+)', '2': 'Negative (-)', '3': 'Boundary (B)', '4': 'Edge Case (!)', '5': 'Security (S)',
         '6': 'API (A)', '7': 'Console (7)', '8': 'UI (8)'}
LINE = re.compile(r'^(\s*\*\s*Kategori\s*:\s*)(.*)$', re.M)

def render(codes: str, old: str) -> str:
    tags = ' '.join(re.findall(r'\[[^\]]+\]', old))
    if codes.strip() == '-':
        # Idempotent: drop tags and any marker already written by an earlier run.
        base = re.sub(r'(\s*\|\s*kode:\s*-)+', '', re.sub(r'\s*\[[^\]]+\]', '', old)).strip()
        return f"{base} | kode: -{(' ' + tags) if tags else ''}"
    by = {}
    for c in codes.split():
        by.setdefault(c[0], []).append(c)
    text = ' | '.join(f"{GROUP[k]} {' '.join(v)}" for k, v in sorted(by.items()))
    return f"{text}{(' ' + tags) if tags else ''}"

def main():
    mapping = {k: v for k, v in json.load(open(sys.argv[1], encoding='utf-8')).items() if not k.startswith('_')}
    dry = '--dry-run' in sys.argv
    seen, changed = set(), 0
    for f in glob.glob('tests/**/*.spec.ts', recursive=True):
        m = re.match(r'(TC-[A-Z0-9-]+?-\d+[A-Z]?)-', os.path.basename(f))
        if not m or m.group(1) not in mapping:
            continue
        tc = m.group(1); seen.add(tc)
        src = open(f, encoding='utf-8').read()
        km = LINE.search(src)
        if not km:
            print(f'[NO KATEGORI] {f}'); continue
        new = render(mapping[tc], km.group(2))
        if new != km.group(2):
            changed += 1
            print(f'{tc}: "{km.group(2)}" -> "{new}"')
            if not dry:
                open(f, 'w', encoding='utf-8', newline='').write(src[:km.start(2)] + new + src[km.end(2):])
    missing = sorted(set(mapping) - seen)
    print(f'changed={changed} missing={missing}')

if __name__ == '__main__':
    main()
