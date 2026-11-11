# QA Portofolio: OrangeHRM E2E Automation Suite

[![CI](https://github.com/arsalwildan15/qa-portofolio/actions/workflows/playwright.yml/badge.svg)](https://github.com/arsalwildan15/qa-portofolio/actions/workflows/playwright.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-1.49-2EAD33?logo=playwright&logoColor=white)
![Allure](https://img.shields.io/badge/Report-Allure-E12C2C)

End-to-end test automation suite for the [OrangeHRM demo application](https://opensource-demo.orangehrmlive.com/), built with **Playwright + TypeScript** following the Page Object Model, with **Allure** reporting.

> **Why there's no live-hosted report:** the full suite targets a public third-party demo, not an environment this project controls. Run from GitHub Actions' hosted runners, every test failed uniformly across all 3 browsers (0% pass) — a pattern consistent with the public demo blocking/rate-limiting traffic from cloud datacenter IP ranges, not a defect in the suite (the same run passes locally, and every bug documented under `docs/` was found this way). CI here is scoped to type-check + lint, which is reliable regardless of the demo's availability; run the full regression locally (see **Getting Started** below) to generate and view the Allure/HTML reports yourself.

## Tech Stack

| Concern | Tool |
|---|---|
| Browser automation | [Playwright](https://playwright.dev/) (Chromium, Firefox, WebKit) |
| Language | TypeScript (strict mode) |
| Reporting | [Allure Report](https://allurereport.org/) + Playwright HTML report |
| Code quality | ESLint + Prettier |
| CI/CD | GitHub Actions → Allure report published to GitHub Pages |

## Architecture

The suite follows a layered **Page Object Model**: tests never touch locators directly, locators never touch assertions, and environment/test data are isolated from both.

```
qa-portofolio/
├── src/
│   ├── config/         # Environment resolution (env.ts): single source of truth for BASE_URL/credentials
│   ├── types/          # Shared domain types (e.g. NewEmployee)
│   ├── data/           # Test data factories: unique names, collision-free dates
│   ├── pages/          # Page Object Model: one class per screen, barrel-exported via index.ts
│   ├── fixtures/       # Custom Playwright fixtures: inject page objects, provide authenticatedTest
│   ├── utils/          # testReport.ts, createTestEmployee.ts, createTestCandidate.ts, advanceCandidateStatus.ts
│   └── reporters/
│       └── bugListReporter.ts   # Custom Playwright reporter: appends failed TCs to docs/Bug-List.xlsx
├── tests/
│   ├── login/          # One module = one folder. Specs are named by test case ID.
│   ├── admin/          # One subfolder per Admin sub-screen (~16 total, incl. Configuration's 8)
│   ├── pim/             # One subfolder per PIM screen (incl. configuration/ and security/)
│   ├── recruitment/     # One subfolder per Recruitment screen (incl. security/)
│   └── e2e/             # Cross-cutting / not-yet-split specs (PIM smoke test, Leave)
├── docs/                # Human-readable test case documentation, one file per module
│   ├── TC-Login.txt / TC-Admin.txt / TC-PIM.txt / TC-Recruitment.txt
│   ├── PIM-Findings-Summary.txt         # Digest of exploration findings across the whole PIM suite
│   ├── TC-Regression-Allure-Guide.txt   # How to run a full regression and view the Allure HTML report
│   └── Bug-List.xlsx                    # Auto-generated draft bug tracker (created on first test failure)
├── security/            # Source-code-level security scanning of OrangeHRM's own open-source repo
│   ├── scripts/         # scan_orangehrm.py (SCA/SAST/Gitleaks/Trivy -> JSON), generate_report.py (JSON -> PDF)
│   ├── evidence/        # JSON + PDF evidence, one numbered folder per run
│   └── README.md        # Setup, scope, latest results, ethics note
├── .github/workflows/   # CI pipeline definition
├── playwright.config.ts
├── tsconfig.json
└── eslint.config.js
```

See the **Test Coverage** section below for exactly which screens each module's sub-folders cover.

**Why this shape:**
- **`pages/`**: every selector lives behind a typed class, so a DOM change means editing one file, not every spec that touches that screen.
- **`fixtures/`**: wires page objects into Playwright's dependency-injection model and exposes `authenticatedTest`, so specs needing a logged-in session never duplicate login steps.
- **`config/`** and **`data/`**: keep environment and test data out of both page objects and specs, so each layer has one reason to change.
- **`tests/<module>/`**: mirrors the app's menu structure. One spec per test case, named `TC-<MODULE>-<NN>-Verify-<Name>.spec.ts`, tagged in its JSDoc header by scenario type: `(+)` positive, `(-)` negative, `(B)` boundary, `(S)` security, `(!)` edge case. A module with several screens (e.g. PIM) gets one subfolder per screen instead of a flat file list.
- **`docs/TC-<Module>.txt`**: the readable counterpart to each `tests/<module>/` folder, same TC IDs and scenario legend, for reviewing coverage without reading TypeScript.

## Test Execution & Reporting

Every spec starts with a JSDoc header (TC ID, title, module, category, env, file path, purpose, and a copy-pasteable `RUN COMMAND`), so any single test case can be run and understood on its own.

Each test uses the shared `TestReport` utility (`src/utils/testReport.ts`) instead of raw `expect()`:

- **Step logging**: every action prints `[STEP n] description...` as it happens.
- **Summary block**: TC ID, env, duration, step count, a numbered pass/fail checklist, optional findings, and a final pass/fail line.
- **Soft assertions**: checks use `expect.soft()`, so one failing check doesn't stop the test; everything still runs and gets reported.
- **Automatic console-error check**: passing `page` into `TestReport` wires up `page.on('console')`/`page.on('pageerror')` and adds a pass/fail check to every TC's summary, no per-file setup needed.
- **API-level verification**: applied to the TCs representative of each unique server behavior (status codes, redirect headers, cookie flags), not duplicated everywhere it wouldn't add new coverage.

Run a single TC with its own `RUN COMMAND`, e.g.:

```bash
npx playwright test tests/login/TC-LOGIN-01-Verify-Valid-Credentials-Redirect-To-Dashboard.spec.ts --project=chromium --headed
```

> **Note:** custom reporters are registered in `playwright.config.ts`'s `reporter` array. The CLI flag `--reporter=<name>` replaces that whole array, so run a bare `npx playwright test` (no `--reporter` flag) to keep the bug list reporter active.

## Automatic Bug List (`docs/Bug-List.xlsx`)

Every time a test case **fails**, `src/reporters/bugListReporter.ts` appends one draft row to `docs/Bug-List.xlsx`, using the same column layout as manual bug tracking: `Bug ID`, `Summary`, `Category`, `Scope`, `Environment`, `Modul`, `Steps to Reproduce`, `Expected Result`, `Actual Result`, `Severity`, `Priority`, `Attachment`, `Detected On`, `Detected By`, `Status`, `Assigned To`, `Notes`, `Script Test Case`.

Every field comes from the `[CHECK_FAIL] <label> | <detail>` log line `TestReport.check()` emits on each failing check, plus the `[STEP n]` log for reproduction steps:

| Column | How it's derived |
|---|---|
| Bug ID | Auto-incrementing `BG-XXX` |
| Summary | `<Modul>: <first failed check>`, truncated to one line |
| Category | `Bug` |
| Scope | `FE` / `BE` / `FE & BE`, from keyword patterns (console/UI → FE, API/HTTP → BE) |
| Environment | `BASE_URL` |
| Modul | `<Module> - <Screen>` from the spec's folder path (e.g. `PIM - Job`) |
| Steps to Reproduce | Renumbered `[STEP n]` lines |
| Expected Result | The failed check's own label (already phrased as the expected condition) |
| Actual Result | The failed check's detail, prefixed with context when recognizable (`Browser console error: ...` / `API response: ...`) |
| Severity / Priority | Keyword-heuristic suggestion (`High`/`Medium`/`Low`), e.g. XSS/crash/5xx → High, invalid data/4xx → Medium, console-only/cosmetic → Low. Priority mirrors Severity by default. |
| Attachment | Relative path to the auto-captured screenshot/video |
| Detected On / Detected By / Status | Run date, `git config user.name`, `Open` |

These values are **suggestions for faster triage, not a final verdict**. Severity/Priority come from keyword patterns, not real business-impact judgment, so a human spot-check is still worthwhile before the report goes out. If a failing test never calls `TestReport.check()` (a raw exception), the reporter falls back to Playwright's own error message.

**Dedup on regression runs:** a bug is identified by its test script + title. If the same test fails again, the reporter checks the existing row's `Status`:
- Still **Open**: no new row, same bug.
- **Closed**: a new row is added, since a fix verified closed and now failing again is a separate regression.

So re-running the suite doesn't flood the sheet with duplicates, only new failures or regressions add rows.

**Auto-close on retest:** when a previously failing test passes again, every still-`Open` row for that script is set to `Closed`, with a note (`Auto-closed: retest passed on <date>`) recording when. A clean pass is treated as resolving every finding previously reported for that script, so `Status` stays accurate without manual bookkeeping.

The file starts empty (header only) and is only touched when there's something to record: a new failure, a regression, or an auto-close. A fully green run with nothing previously open leaves it unchanged.

> **Why a known site bug is left failing instead of using `test.fail()`:** a TC that always fails due to a genuine third-party defect (e.g. `TC-PIM-JOB-01`, see its JSDoc header) is intentionally left as a real `FAILED` result. `test.fail()` would report it as "passed", hiding the finding from Allure's pass rate and silently excluding it from `Bug-List.xlsx` (the reporter only logs `failed`/`timedOut`). A documented failure is a more honest signal of this suite's value than an artificially green one.

## Getting Started

### 1. Install dependencies

```bash
npm install
npx playwright install --with-deps
```

### 2. Configure environment

```bash
cp .env.example .env
```

Adjust `BASE_URL`, `ORANGEHRM_USERNAME`, `ORANGEHRM_PASSWORD` if needed (defaults target the public OrangeHRM demo).

### 3. Run tests

```bash
npm test                  # run all tests, all browsers
npm run test:chromium     # chromium only
npm run test:headed       # headed mode
npm run test:ui           # Playwright UI mode
npm run test:debug        # step-through debugger
```

### 4. Reports

```bash
npm run report:html               # Playwright HTML report
npm run report:allure:generate    # build Allure report from allure-results/
npm run report:allure:open        # open the generated Allure report
```

### 5. Code quality

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write
```

## CI/CD

GitHub Actions workflow: [`.github/workflows/playwright.yml`](.github/workflows/playwright.yml).

**Triggers:** push to `main`, pull requests targeting `main`, and manual dispatch.

**`lint-and-typecheck` job** (ubuntu-latest): checkout → setup Node 20 → `npm ci` → type-check → lint. This is the only thing CI runs.

**Why CI doesn't run the full suite:** the full suite targets the public OrangeHRM demo, a third-party site this project doesn't control. Run from GitHub Actions' hosted runners, every test failed uniformly across all 3 browsers (0% pass) — a pattern consistent with the demo blocking/rate-limiting traffic from cloud datacenter IP ranges, not a defect in the suite itself (the exact same run passes locally, and every bug documented under `docs/` was found that way). Rather than publish a red, misleading 0%-pass report, the full regression — and its Allure/Playwright HTML reports — is meant to be run locally. See [docs/TC-Regression-Allure-Guide.txt](docs/TC-Regression-Allure-Guide.txt) and **Getting Started** above.

If targeting a different environment for a local run, set these in `.env` (copied from `.env.example`):
- `BASE_URL`
- `ORANGEHRM_USERNAME`
- `ORANGEHRM_PASSWORD`

## Test Coverage

| Module | TCs | Docs |
|--------|----:|------|
| Login | 43 | [docs/TC-Login.txt](docs/TC-Login.txt) |
| Admin | 138 | [docs/TC-Admin.txt](docs/TC-Admin.txt) |
| PIM | 161 | [docs/TC-PIM.txt](docs/TC-PIM.txt) |
| Recruitment | 54 | [docs/TC-Recruitment.txt](docs/TC-Recruitment.txt) |
| Leave | 1 | N/A |
| **Total** | **397** | |

### Login (43 TCs)

Positive, negative, boundary, security, edge.

**Confirmed bugs:**
- No rate limiting/lockout after repeated failed logins
- Missing `X-Frame-Options` / CSP `frame-ancestors` (clickjacking)

CSRF and session-fixation checks confirmed **effective** (no bug).

### Admin (138 TCs)

Full coverage across all ~16 Admin sub-screens:

- User Management > Users (6)
- Job: Job Titles incl. file-upload security (8), Pay Grades (5), Employment Status (5), Job Categories (5), Work Shifts (5)
- Corporate Branding: logo/banner upload security — validate-only, never clicks "Publish" since it would change the shared demo's global theme (5)
- Qualifications: Skills incl. a second Description field + IDOR (8), Education — confirmed to use a "Level" field label rather than "Name" (5), Licenses (5), Languages (5), Memberships — admin-level master data, distinct from PIM's employee-level tabs (5)
- Nationalities — confirmed ~196 real seed records with no UI search/filter, so Add/Delete TCs verify via the API directly (6)
- Organization: General Information — single global record with an Edit switch, every mutating TC restores the original value afterward (6); Locations — 9 fields, real server-backed Name-uniqueness check, edit-form URL with the id in the path / IDOR (9); Structure — genuine hierarchical org-chart tree, gated behind an Edit switch (9)
- Configuration (39 TCs, all 8 sub-screens) — risk-driven methodology, classified by actual blast radius on the shared public demo rather than a blanket rule:
  - **Validate-only** (never clicks Save, since a bad write would change shared infrastructure): Email Configuration (5), Localization (5), Modules (5), Social Media Authentication (5), LDAP Configuration (5, highest-risk screen in the suite per the app's own data-corruption warning)
  - **Fully exercised** (save-then-restore / add-then-delete, confirmed additive/reversible): Email Subscriptions (5), Language Packages (4), OAuth Client (5 — registers API/mobile-app token clients, not the login page, correcting an initial higher-risk assumption)
- Security: clickjacking header + CSRF cross-origin mutation (2)

**Confirmed bugs:**
- Job Title's "Job Specification" file upload accepts an executable renamed to `.jpg` (same extension-only validation pattern as PIM/Recruitment) — `TC-ADMIN-JOBTITLE-07`
- A freshly-added Organization Structure unit can't be renamed afterward — editing resends its untouched optional `unitId`/`description` as `null`, server rejects with HTTP 422 — `TC-ADMIN-STRUCTURE-07`
- Missing `X-Frame-Options` / CSP `frame-ancestors` — the **4th app-wide confirmation** of the same clickjacking gap also found in Login, Recruitment, and PIM

Corporate Branding's logo/banner inputs, by contrast, reject the same renamed-executable payload by decoding it as a real image client-side. IDOR TCs (Skills, Nationalities, Locations) found no multi-tenant boundary to breach — consistent with this demo's single-admin-role architecture, documented as N/A rather than a false-positive vulnerability. Cross-origin mutation (CSRF) on pay-grade creation confirmed **blocked by CORS** (no bug).

### PIM (161 TCs)

Full module coverage, no open functional gaps: Employee List (14), Add Employee (30), Personal Details + 9 sub-tabs (Contact Details, Job, Emergency Contacts, Dependents, Immigration, Salary, Report-to, Qualifications with all 5 sub-sections, Memberships), Configuration (Optional Fields, Custom Fields, Data Import, Reporting Methods, Termination Reasons), Reports, plus 8 cross-cutting file-upload security TCs and 2 IDOR/clickjacking security TCs.

**Confirmed bugs:**
- Extension-only validation lets an executable disguised as a photo through on both profile-photo upload points
- Missing `X-Frame-Options` / CSP `frame-ancestors` on Employee List — the **3rd app-wide confirmation** of the same clickjacking gap also found in Login and Recruitment

IDOR on personal-details/salary access confirmed N/A (single-role architecture, same as other modules). Report-to's "Add Supervisor/Subordinate" TCs (3) have a known intermittent UI-verification issue — the underlying save is confirmed working via its own API-level TC, only the text-match assertion is unreliable.

### Recruitment (54 TCs)

Vacancies incl. edit/deactivate/pagination/sorting (17), Candidates incl. resume upload/download and list filters (18), candidate status workflow state machine through to terminal "Hired" (14), cross-cutting security: IDOR, response headers, rate limiting, concurrent-write race condition, cross-origin mutation/CSRF (5).

**Critical confirmed bug:** the candidate Shortlist endpoint (`PUT .../candidates/<id>/shortlist`) returns a 500 Internal Server Error for every candidate — confirmed reproducible in isolation across 3 separate candidates, with the server independently verified healthy each time. Since Shortlist is the earliest status transition and a prerequisite for almost every other status-workflow TC, this one bug cascades into failures across most of that suite.

**Other confirmed bugs:**
- Resume upload accepts an executable disguised as a `.pdf` — same extension-only validation pattern as PIM
- A genuine race condition on the candidate status-transition endpoint: two mutually-exclusive concurrent status changes (Reject vs. Schedule Interview) on the same candidate can both report success, with no server-side locking/versioning
- Missing `X-Frame-Options` (clickjacking, same app-wide gap as Login/PIM)
- No rate limiting on candidate creation

Cross-origin mutation (CSRF) on vacancy creation confirmed **blocked by CORS** (no bug). Plus a documented intermittent client-side rendering bug (Application Stage/Candidate History cards occasionally stuck loading forever with no underlying API error).

### Leave (1 TC)

> The public demo account has no assigned leave entitlement, so a successful application can't be exercised. Instead the test verifies the deterministic behavior that's actually there: an insufficient-balance message once a date range is selected.

## Security Scanning (source code, separate from the E2E suite above)

Besides the functional/DAST-style security TCs already inside `tests/recruitment/security/` (IDOR, response headers, rate limiting, race conditions -- tested against the *running* demo app), `security/` holds a **source-code-level** scan of OrangeHRM's own open-source repository (`github.com/orangehrm/orangehrm`, GPL-3.0): SCA and SAST via Snyk, secret scanning via Gitleaks, and Dockerfile misconfiguration via Trivy.

**Latest results:** SCA 5 Critical/36 High/64 Medium/4 Low, SAST 1 High/11 Medium/175 Low, Gitleaks 358 secret-pattern hits (inspected -- effectively all test fixtures / a known vendored-library false positive, not live credentials), Trivy 1 High/1 Low. Full JSON + PDF evidence and setup instructions: [security/README.md](security/README.md).

## Roadmap

- **OWASP ZAP (on hold):** planned DAST addition, target already decided -- a self-hosted OrangeHRM instance via Docker (built from the already-cloned source, which has its own Dockerfile), not the public demo, to allow a full active scan without any third-party risk. See [security/README.md](security/README.md#planned-next-addition-owasp-zap-on-hold) for the full reasoning.

## License

Private portfolio project.
