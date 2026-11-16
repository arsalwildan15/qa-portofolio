# Taxonomy coverage tooling

Rebuilds `docs/Taxonomy-Coverage-Matrix.xlsx` / `.md` from the spec files and the live menu inventory.

| File | Role |
|---|---|
| `menu-inventory.json` | Raw live inventory: every sidebar module and top-nav item clicked one by one (2026-11-15), with page traits (tables, inputs, uploads, dates, delete icons). |
| `units.json` | 107 menu units (U001..U107): inventory pages plus units the nav does not expose (login, header items, PIM employee tabs, detail pages). |
| `extract_specs.py` | Reads every `tests/**/*.spec.ts`: TC id, Kategori, `report.check` labels, `goto` URLs. No interpretation. |
| `build_matrix.py` | Maps specs to units and taxonomy codes with explicit rules, decides per unit which taxonomy items apply (unit flags, every N/A carries a reason), flags "weak" TCs (no check verifies an outcome) and excludes them from coverage. |
| `check_docs.py` | Docs <-> specs consistency: every spec documented in its `docs/TC-*.txt` under its real file name, header `Path :`/RUN COMMAND match the file location, README coverage table matches spec counts. Exit 1 on any mismatch; `--fix-renames` rewrites doc file names whose TC id matches. |
| `write_matrix.py` | Writes the xlsx (Matrix, Summary with COUNTIFS formulas, Grid, Unit Flags Legend, Weak TCs) and the markdown summary + gap backlog. |

Run from the repo root (any scratch directory works as `<work>`; copy `units.json` there first):

```bash
python tools/coverage/extract_specs.py "$(pwd)" <work>/specs.json
python tools/coverage/build_matrix.py <work> unused.md
python tools/coverage/write_matrix.py <work> docs/Taxonomy-Coverage-Matrix.xlsx docs/Taxonomy-Coverage-Matrix.md
```

Keyword tags are a first pass and are audited by sampling; a rule change must be re-audited the same way.

Explicit codes win (since 2026-11-16): when at least 80% of a spec's `report.check` labels name their taxonomy code (`"1.1-C / 6.1 POST valid -> 200"`, `"[U013 ...] 4.4 ..."`), the spec is tagged with those codes only and the keyword pass is skipped for it. The audit that introduced this found keyword misfires on such labels (e.g. "Content-Type" header -> 5.3-ContentType upload, "hapus query" -> 1.1-D, "sesi" -> 5.7) that had inflated coverage by about 5 points. A code a TC genuinely verifies must therefore be written in its label.

Flag `NOAPI` marks a unit that sends no server request (proven by a TC check); server-response items (5.6, 5.8, 6.1-6.5) are N/A for it. The sidebar-search folder is mapped only to the Sidebar unit: the Dashboard it stands on is the host page, not the subject.

Before every commit that adds, moves or renames specs:

```bash
python tools/coverage/check_docs.py
```
