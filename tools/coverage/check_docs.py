"""Docs <-> specs consistency check. Run from the repo root: python tools/coverage/check_docs.py
Reports, without changing anything:
  1. per TC doc: spec files not documented, documented ids without a spec file, file names that differ
  2. per spec: header "Path :" / RUN COMMAND not matching the file's real location
  3. README coverage table vs actual spec counts per folder
Exit code 1 when any inconsistency is found. --fix-renames rewrites doc file names whose TC id matches a spec.
"""
import glob, os, re, sys

DOCS = {  # doc file -> spec folders it documents
    'docs/TC-Login.txt': ['tests/_global/login'], 'docs/TC-Admin.txt': ['tests/admin'], 'docs/TC-PIM.txt': ['tests/pim'],
    'docs/TC-Recruitment.txt': ['tests/recruitment'], 'docs/TC-Buzz.txt': ['tests/buzz'], 'docs/TC-Performance.txt': ['tests/performance'],
    'docs/TC-Claim.txt': ['tests/claim'], 'docs/TC-Leave.txt': ['tests/leave'], 'docs/TC-Time.txt': ['tests/time'],
    'docs/TC-XMOD.txt': ['tests/_global/cross-module'], 'docs/TC-Sweep.txt': ['tests/_global/sweep'],
    'docs/TC-MyInfo.txt': ['tests/my-info'],
}
README_ROWS = {  # README coverage-table label -> folders counted
    'Login': ['tests/_global/login'], 'Admin': ['tests/admin'], 'PIM': ['tests/pim'], 'Recruitment': ['tests/recruitment'],
    'Buzz': ['tests/buzz'], 'Performance': ['tests/performance'], 'Claim': ['tests/claim'], 'Leave': ['tests/leave'],
    'Time': ['tests/time'], 'Cross-module (Leave/Claim/Performance/Time)': ['tests/_global/cross-module'],
    'My Info': ['tests/my-info'], 'Sweep, all menus (data-driven)': ['tests/_global/sweep'],
}
problems = 0
def specs_in(folders):
    out = {}
    for d in folders:
        for f in glob.glob(d + '/**/*.spec.ts', recursive=True):
            f = f.replace(os.sep, '/')
            out[os.path.basename(f)] = f
    return out

print('== 1. TC docs vs spec files')
for doc, folders in DOCS.items():
    specs = specs_in(folders)
    text = open(doc, encoding='utf-8').read() if os.path.exists(doc) else ''
    if not text:
        print(f'  [MISSING DOC] {doc}'); problems += 1; continue
    named = set(re.findall(r'(TC-[A-Z0-9-]+?-\d+[A-Z]?-[A-Za-z0-9-]+\.spec\.ts)', text))
    undocumented = sorted(set(specs) - named)
    orphan = sorted(n for n in named - set(specs) if n.split('-Verify')[0].rsplit('-', 0)[0])
    # an orphan whose TC id still exists under another file name = renamed file
    by_id = {re.match(r'(TC-[A-Z0-9-]+?-\d+[A-Z]?)-', n).group(1): n for n in specs if re.match(r'(TC-[A-Z0-9-]+?-\d+[A-Z]?)-', n)}
    canceled = set(re.findall(r'(TC-[A-Z0-9-]+?-\d+)\s+\[CANCEL\]', text))
    real_orphans = []
    for n in orphan:
        tid = re.match(r'(TC-[A-Z0-9-]+?-\d+[A-Z]?)-', n).group(1)
        if tid in canceled: continue
        if tid in by_id:
            print(f'  [RENAMED] {doc}: doc says {n}, file is {by_id[tid]}'); problems += 1
            if '--fix-renames' in sys.argv:
                text = text.replace(n, by_id[tid]); open(doc, 'w', encoding='utf-8').write(text)
        else: real_orphans.append(n)
    doc_ids = {re.match(r'(TC-[A-Z0-9-]+?-\d+[A-Z]?)-', n).group(1) for n in named if re.match(r'(TC-[A-Z0-9-]+?-\d+[A-Z]?)-', n)}
    for n in undocumented:
        tid = re.match(r'(TC-[A-Z0-9-]+?-\d+[A-Z]?)-', n)
        if tid and tid.group(1) in doc_ids: continue  # already reported as RENAMED
        print(f'  [UNDOCUMENTED] {doc}: {n}'); problems += 1
    for n in real_orphans: print(f'  [NO SPEC FILE] {doc}: {n}'); problems += 1
    print(f'  {doc}: {len(specs)} specs, {len(named)} file names in doc')

print('== 2. Spec headers (Path / RUN COMMAND) vs real location')
for f in glob.glob('tests/**/*.spec.ts', recursive=True):
    f = f.replace(os.sep, '/')
    head = open(f, encoding='utf-8').read().split('*/')[0]
    folder = os.path.dirname(f) + '/'
    m = re.search(r'Path\s*:\s*(\S+)', head)
    if m and m.group(1).rstrip('/') + '/' != folder:
        print(f'  [PATH] {f}: header says {m.group(1)}'); problems += 1
    for cmd in re.findall(r'npx playwright test (\S+\.spec\.ts)', head):
        if cmd.replace('\\', '/') != f:
            print(f'  [RUN] {f}: RUN COMMAND points to {cmd}'); problems += 1

print('== 3. README coverage table vs spec counts')
readme = open('README.md', encoding='utf-8').read()
total = 0
for label, folders in README_ROWS.items():
    n = len(specs_in(folders)); total += n
    m = re.search(r'^\| ' + re.escape(label) + r' \| (\d+) \|', readme, re.M)
    if not m: print(f'  [README] row "{label}" missing'); problems += 1
    elif int(m.group(1)) != n: print(f'  [README] {label}: table says {m.group(1)}, actual {n}'); problems += 1
mt = re.search(r'\| \*\*Total\*\* \| \*\*(\d+)\*\*', readme)
if mt and int(mt.group(1)) != total: print(f'  [README] Total: table says {mt.group(1)}, actual {total}'); problems += 1
print(f'  counted {total} specs in table rows; infra: {len(specs_in(["tests/_global/infra"]))}')
print('PROBLEMS', problems)
sys.exit(1 if problems else 0)
