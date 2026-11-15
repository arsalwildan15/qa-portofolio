"""Extract, per spec file: TC id, path, header Kategori/TUJUAN text, report.check labels, goto URLs and
API paths. Output: specs.json (raw facts used by the tagger -- no interpretation here)."""
import glob, json, re, sys

ROOT = sys.argv[1]
OUT = sys.argv[2]
rows = []
for f in sorted(glob.glob(ROOT + '/tests/**/*.spec.ts', recursive=True)):
    f = f.replace(chr(92), '/')
    if '/zz-probe' in f:
        continue
    s = open(f, encoding='utf-8').read()
    rel = f[len(ROOT) + 1:]
    m = re.search(r"(TC-[A-Z0-9-]+?-\d+[A-Z]?)\b", s)
    header = s.split('*/')[0] if '*/' in s else ''
    kat = re.search(r"Kategori\s*:\s*(.+)", header)
    checks = re.findall(r"report\.check\(\s*[`'\"](.+?)[`'\"]\s*,", s)
    findings = re.findall(r"report\.finding\(\s*[`'\"](.+?)[`'\"]", s)
    gotos = re.findall(r"goto\(\s*[`'\"]([^`'\"]+)", s)
    apis = sorted(set(re.findall(r"/api/v2/([a-z0-9/_-]+)", s)))
    po = sorted(set(re.findall(r"\b([a-z][A-Za-z]+Page)\b", s)))
    rows.append({
        'tc': m.group(1) if m else rel.split('/')[-1][:30],
        'path': rel,
        'kategori': kat.group(1).strip() if kat else '',
        'header': re.sub(r"\s+", ' ', header)[:1500],
        'checks': checks, 'findings': findings, 'gotos': gotos, 'apis': apis, 'pageObjects': po,
        'intentionalFail': bool(re.search(r"SENGAJA (dibiarkan )?FAILED|sengaja FAILED|TC sengaja FAILED|SENGAJA FAILED", header)),
        'bugs': sorted(set(re.findall(r"BG-\d{3}", header))),
    })
json.dump(rows, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(rows))
