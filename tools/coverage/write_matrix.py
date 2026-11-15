"""Write docs/Taxonomy-Coverage-Matrix.xlsx (+ .md summary) from matrix.json / tags.json / weak.json."""
import json, sys
from collections import defaultdict
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

S, XLSX, MD = sys.argv[1], sys.argv[2], sys.argv[3]
m = json.load(open(S + '/matrix.json', encoding='utf-8'))
tags = json.load(open(S + '/tags.json', encoding='utf-8'))
weak = json.load(open(S + '/weak.json', encoding='utf-8'))
units, flags, matrix, items = m['units'], m['flags'], m['matrix'], m['items']
ARIAL = 'Arial'
HDR = Font(name=ARIAL, bold=True, color='FFFFFF'); HFILL = PatternFill('solid', fgColor='305496')
BODY = Font(name=ARIAL, size=10)
FILL = {'COVERED': PatternFill('solid', fgColor='C6EFCE'), 'GAP': PatternFill('solid', fgColor='FFC7CE'), 'N/A': PatternFill('solid', fgColor='EDEDED')}
FLAG_DOC = {'L': 'list', 'C': 'create', 'E': 'edit', 'D': 'delete', 'T': 'free text', 'N': 'numeric', 'DT': 'date', 'UP': 'upload',
            'W': 'workflow/status', 'RJ': 'reject/cancel action', 'ID': 'id-keyed record', 'AO': 'admin-only', 'ESS': 'used by ESS',
            'URL': 'URL field', 'UQ': 'unique name', 'SR': 'search/filter', 'PII': 'personal data', 'LOG': 'auth flow', 'RO': 'read-only',
            'SET': 'single settings form', 'EXP': 'file path import/export', 'PE': 'privilege boundary (read-only for ESS)'}
module = lambda p: p.split(' > ')[0]

def header(ws, cols, widths):
    for i, (c, w) in enumerate(zip(cols, widths), 1):
        cell = ws.cell(row=1, column=i, value=c); cell.font = HDR; cell.fill = HFILL
        cell.alignment = Alignment(vertical='center', wrap_text=True)
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = 'A2'

wb = Workbook()
# ---- Matrix (long format)
ws = wb.active; ws.title = 'Matrix'
header(ws, ['Unit ID', 'Module', 'Menu Path', 'Unit Flags', 'Item Code', 'Taxonomy Item', 'Status', 'Evidence (TC IDs) / N/A Reason'], [9, 14, 46, 28, 16, 40, 11, 90])
r = 2
for uid in sorted(units):
    u = units[uid]
    for code, label in items:
        status, ev = matrix[uid][code]
        vals = [uid, module(u['path']), u['path'], ' '.join(flags.get(uid, [])), code, label, status, ev]
        for c, v in enumerate(vals, 1):
            cell = ws.cell(row=r, column=c, value=v); cell.font = BODY
        ws.cell(row=r, column=7).fill = FILL[status]
        r += 1
last = r - 1
ws.auto_filter.ref = f'A1:H{last}'

# ---- Summary (formulas over Matrix)
sm = wb.create_sheet('Summary')
header(sm, ['Module', 'Units', 'Applicable', 'COVERED', 'GAP', 'N/A', 'Coverage % (COVERED / Applicable)'], [16, 8, 12, 11, 9, 9, 22])
mods = sorted({module(u['path']) for u in units.values()})
for i, mod in enumerate(mods, 2):
    sm.cell(row=i, column=1, value=mod).font = BODY
    n_units = sum(1 for u in units.values() if module(u['path']) == mod)
    sm.cell(row=i, column=2, value=n_units).font = BODY
    rng = lambda col: f"Matrix!${col}$2:${col}${last}"
    sm.cell(row=i, column=4, value=f'=COUNTIFS({rng("B")},A{i},{rng("G")},"COVERED")')
    sm.cell(row=i, column=5, value=f'=COUNTIFS({rng("B")},A{i},{rng("G")},"GAP")')
    sm.cell(row=i, column=6, value=f'=COUNTIFS({rng("B")},A{i},{rng("G")},"N/A")')
    sm.cell(row=i, column=3, value=f'=D{i}+E{i}')
    sm.cell(row=i, column=7, value=f'=IF(C{i}=0,0,D{i}/C{i})').number_format = '0.0%'
    for c in range(3, 8): sm.cell(row=i, column=c).font = BODY
t = len(mods) + 2
sm.cell(row=t, column=1, value='TOTAL').font = Font(name=ARIAL, bold=True)
for c, col in zip(range(2, 7), 'BCDEF'):
    sm.cell(row=t, column=c, value=f'=SUM({col}2:{col}{t-1})').font = Font(name=ARIAL, bold=True)
sm.cell(row=t, column=7, value=f'=IF(C{t}=0,0,D{t}/C{t})').number_format = '0.0%'
notes = [
 'Cara membaca: setiap unit menu (dari inventaris LIVE) x setiap item docs/Test-Case-Taxonomy.txt.',
 'COVERED = minimal satu TC benar-benar memverifikasi item itu pada unit tsb (ID TC di sheet Matrix).',
 'N/A = item tidak berlaku krn karakteristik unit (kolom Unit Flags; alasan tertulis per sel), sesuai aturan taksonomi "tidak relevan karena X".',
 'GAP = berlaku tapi belum ada TC -> masuk backlog (docs/Taxonomy-Coverage-Matrix.md).',
 'TC "lemah" (tak ada check yg memverifikasi hasil) TIDAK dihitung sbg coverage -- lihat sheet Weak TCs.',
 'Tag TC->item dihasilkan aturan keyword eksplisit atas nama file + Kategori + label check, lalu diaudit sampling manual.',
]
for i, n in enumerate(notes):
    sm.cell(row=t + 2 + i, column=1, value=n).font = Font(name=ARIAL, italic=True, size=9)

# ---- Grid
gd = wb.create_sheet('Grid')
codes = [c for c, _ in items]
header(gd, ['Unit ID', 'Menu Path'] + codes, [9, 46] + [6] * len(codes))
SYM = {'COVERED': 'C', 'GAP': 'GAP', 'N/A': '-'}
for ri, uid in enumerate(sorted(units), 2):
    gd.cell(row=ri, column=1, value=uid).font = BODY
    gd.cell(row=ri, column=2, value=units[uid]['path']).font = BODY
    for ci, code in enumerate(codes, 3):
        st = matrix[uid][code][0]
        cell = gd.cell(row=ri, column=ci, value=SYM[st]); cell.font = Font(name=ARIAL, size=8); cell.fill = FILL[st]
        cell.alignment = Alignment(horizontal='center')
gd.freeze_panes = 'C2'

# ---- Flags legend
fl = wb.create_sheet('Unit Flags Legend')
header(fl, ['Flag', 'Meaning'], [8, 40])
for i, (k, v) in enumerate(FLAG_DOC.items(), 2):
    fl.cell(row=i, column=1, value=k).font = BODY; fl.cell(row=i, column=2, value=v).font = BODY

# ---- Weak TCs
wk = wb.create_sheet('Weak TCs')
header(wk, ['Spec', 'Reason'], [100, 60])
for i, p in enumerate(weak, 2):
    wk.cell(row=i, column=1, value=p).font = BODY
    wk.cell(row=i, column=2, value='Tidak ada check yg memverifikasi hasil (hanya "tanpa exception") -> tidak dihitung coverage').font = BODY
wb.save(XLSX)

# ---- Markdown summary + gap backlog
cnt = defaultdict(lambda: defaultdict(int)); gaps_by_item = defaultdict(list)
for uid, row in matrix.items():
    for code, (st, _) in row.items():
        cnt[module(units[uid]['path'])][st] += 1
        if st == 'GAP': gaps_by_item[code].append(units[uid]['path'])
label = dict(items)
lines = ['# Taxonomy Coverage Matrix', '',
         f'Scope: the 12 sidebar modules (Admin, PIM, Leave, Time, Recruitment, My Info, Performance, Dashboard, '
         f'Directory, Maintenance, Claim, Buzz) plus the sidebar Search box -- {len(units)} menu units taken from a live '
         'click-through. Login and header items are outside this matrix (their existing TCs still run). '
         'Full cell-level detail (TC ids per cell, N/A reasons) lives in `docs/Taxonomy-Coverage-Matrix.xlsx`.', '',
         '| Module | COVERED | GAP | N/A | Coverage of applicable |', '|---|---:|---:|---:|---:|']
tot = defaultdict(int)
for mod in sorted(cnt):
    c, g, n = cnt[mod]['COVERED'], cnt[mod]['GAP'], cnt[mod]['N/A']
    for k, v in (('C', c), ('G', g), ('N', n)): tot[k] += v
    lines.append(f'| {mod} | {c} | {g} | {n} | {c / (c + g) * 100 if c + g else 0:.1f}% |')
lines.append(f"| **Total** | **{tot['C']}** | **{tot['G']}** | **{tot['N']}** | **{tot['C'] / (tot['C'] + tot['G']) * 100:.1f}%** |")
lines += ['', f'Weak TCs (not counted as coverage): {len(weak)} -- see the xlsx sheet "Weak TCs".', '',
          '## Gap backlog by taxonomy item', '', '| Item | Taxonomy | Units with GAP |', '|---|---|---:|']
for code in [c for c, _ in items]:
    if gaps_by_item.get(code):
        lines.append(f'| {code} | {label[code]} | {len(gaps_by_item[code])} |')
open(MD, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('rows', last - 1, 'modules', len(mods))
