# Taxonomy coverage tooling

Rebuilds `docs/Taxonomy-Coverage-Matrix.xlsx` / `.md` from the spec files and the live menu inventory.

| File | Role |
|---|---|
| `menu-inventory.json` | Raw live inventory: every sidebar module and top-nav item clicked one by one (2026-11-15), with page traits (tables, inputs, uploads, dates, delete icons). |
| `units.json` | 107 menu units (U001..U107): inventory pages plus units the nav does not expose (login, header items, PIM employee tabs, detail pages). |
| `extract_specs.py` | Reads every `tests/**/*.spec.ts`: TC id, Kategori, `report.check` labels, `goto` URLs. No interpretation. |
| `build_matrix.py` | Maps specs to units and taxonomy codes with explicit rules, decides per unit which taxonomy items apply (unit flags, every N/A carries a reason), flags "weak" TCs (no check verifies an outcome) and excludes them from coverage. |
| `write_matrix.py` | Writes the xlsx (Matrix, Summary with COUNTIFS formulas, Grid, Unit Flags Legend, Weak TCs) and the markdown summary + gap backlog. |

Run from the repo root (any scratch directory works as `<work>`; copy `units.json` there first):

```bash
python tools/coverage/extract_specs.py "$(pwd)" <work>/specs.json
python tools/coverage/build_matrix.py <work> unused.md
python tools/coverage/write_matrix.py <work> docs/Taxonomy-Coverage-Matrix.xlsx docs/Taxonomy-Coverage-Matrix.md
```

Keyword tags are a first pass and are audited by sampling; a rule change must be re-audited the same way.
