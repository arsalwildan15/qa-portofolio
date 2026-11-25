# QA Portofolio: OrangeHRM E2E Automation Suite

[![CI](https://github.com/arsalwildan15/qa-portofolio/actions/workflows/playwright.yml/badge.svg)](https://github.com/arsalwildan15/qa-portofolio/actions/workflows/playwright.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-1.49-2EAD33?logo=playwright&logoColor=white)
![Allure](https://img.shields.io/badge/Report-Allure-E12C2C)

End-to-end test automation suite for the [OrangeHRM demo application](https://opensource-demo.orangehrmlive.com/), built with **Playwright + TypeScript** following the Page Object Model, with **Allure** reporting.

> **Why there's no live-hosted report:** the full suite targets a public third-party demo, not an environment this project controls. When run from GitHub Actions' hosted runners, every test fails uniformly across all 3 browsers (0% pass). That pattern is consistent with the public demo blocking or rate-limiting traffic from cloud datacenter IP ranges, not a defect in the suite itself (the same run passes locally, and every bug documented under `docs/` was found that way). CI here is scoped to type-check + lint, which stays reliable regardless of the demo's availability. Run the full regression locally (see **Getting Started** below) to generate and view the Allure/HTML reports yourself.

## Tech Stack

| Concern | Tool |
|---|---|
| Browser automation | [Playwright](https://playwright.dev/) (Chromium, Firefox, WebKit) |
| Language | TypeScript (strict mode) |
| Reporting | [Allure Report](https://allurereport.org/) + Playwright HTML report |
| Code quality | ESLint + Prettier |
| CI/CD | GitHub Actions (type-check + lint on every push) |
| AI-assisted exploration | [Playwright MCP](https://github.com/microsoft/playwright-mcp) (`.mcp.json`) |
| Security scanning (source code) | [Snyk](https://snyk.io/) (SCA/SAST) + [Gitleaks](https://github.com/gitleaks/gitleaks) (secrets) + [Trivy](https://trivy.dev/) (Docker misconfig), see [security/README.md](security/README.md) |
| Security scanning (DAST, planned) | [OWASP ZAP](https://www.zaproxy.org/), on hold, see **Roadmap** below |

> **Playwright MCP is a separate tool from the committed test suite above.** It lets an AI agent drive a real browser interactively (navigate, click, snapshot the accessibility tree) during exploration and debugging, the same role `tests/zz-probe-*.spec.ts` has played manually throughout this project (see **Test Execution & Reporting** below). It doesn't run in CI and doesn't generate spec files; every committed TC is still written, reviewed, and run through `@playwright/test` like normal.

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
├── tests/              # Top-level folders mirror the OrangeHRM sidebar, one folder per menu
│   ├── admin/          #   Admin        (one subfolder per Admin screen, incl. Configuration's 8)
│   ├── pim/            #   PIM          (one subfolder per PIM screen / employee tab, incl. configuration/)
│   ├── leave/          #   Leave
│   ├── time/           #   Time
│   ├── recruitment/    #   Recruitment
│   ├── my-info/        #   My Info
│   ├── performance/    #   Performance
│   ├── dashboard/      #   Dashboard
│   ├── directory/      #   Directory
│   ├── maintenance/    #   Maintenance
│   ├── claim/          #   Claim
│   ├── buzz/           #   Buzz
│   └── _global/        # Not a sidebar menu: login/, sidebar-search/, sweep/ (every menu at once),
│                       #   cross-module/, infra/ (multi-role smoke tests), fixtures/
├── tools/coverage/     # Rebuilds the taxonomy coverage matrix (see "Taxonomy coverage" below)
├── docs/                # Human-readable test case documentation, one file per module
│   ├── TC-<Module>.txt, TC-Sweep.txt, TC-XMOD.txt, Taxonomy-Coverage-Matrix.xlsx/.md
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
- **Soft assertions**: checks use `expect.soft()`, so one failing check doesn't stop the test. Everything still runs and gets reported.
- **Automatic console-error check**: passing `page` into `TestReport` wires up `page.on('console')`/`page.on('pageerror')` and adds a pass/fail check to every TC's summary, no per-file setup needed.
- **API-level verification**: applied to the TCs representative of each unique server behavior (status codes, redirect headers, cookie flags), not duplicated everywhere it wouldn't add new coverage.

Run a single TC with its own `RUN COMMAND`, e.g.:

```bash
npx playwright test tests/_global/login/TC-LOGIN-01-Verify-Valid-Credentials-Redirect-To-Dashboard.spec.ts --project=chromium --headed
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
| Scope | `FE` / `BE` / `FE & BE`, from keyword patterns (console/UI maps to FE, API/HTTP maps to BE) |
| Environment | `BASE_URL` |
| Modul | `<Module> - <Screen>` from the spec's folder path (e.g. `PIM - Job`) |
| Steps to Reproduce | Renumbered `[STEP n]` lines |
| Expected Result | The failed check's own label (already phrased as the expected condition) |
| Actual Result | The failed check's detail, prefixed with context when recognizable (`Browser console error: ...` / `API response: ...`) |
| Severity / Priority | Keyword-heuristic suggestion (`High`/`Medium`/`Low`): XSS/crash/5xx maps to High, invalid data/4xx maps to Medium, console-only/cosmetic maps to Low. Priority mirrors Severity by default. |
| Attachment | Relative path to the auto-captured screenshot/video |
| Detected On / Detected By / Status | Run date, `git config user.name`, `Open` |

These values are **suggestions for faster triage, not a final verdict**. Severity/Priority come from keyword patterns, not real business-impact judgment, so a human spot-check is still worthwhile before the report goes out. If a failing test never calls `TestReport.check()` (a raw exception), the reporter falls back to Playwright's own error message.

**Dedup on regression runs:** a bug is identified by its test script plus title. If the same test fails again, the reporter checks the existing row's `Status`:
- Still **Open**: no new row, same bug.
- **Closed**: a new row is added, since a fix verified closed and now failing again is a separate regression.

So re-running the suite doesn't flood the sheet with duplicates. Only new failures or regressions add rows.

**Auto-close on retest:** when a previously failing test passes again, every still-`Open` row for that script is set to `Closed`, with a note (`Auto-closed: retest passed on <date>`) recording when. A clean pass is treated as resolving every finding previously reported for that script, so `Status` stays accurate without manual bookkeeping.

The file starts empty (header only) and is only touched when there's something to record: a new failure, a regression, or an auto-close. A fully green run with nothing previously open leaves it unchanged.

> **Why a known site bug is left failing instead of using `test.fail()`:** a TC that always fails due to a genuine third-party defect (e.g. `TC-PIM-JOB-01`, see its JSDoc header) is intentionally left as a real `FAILED` result. `test.fail()` would report it as "passed," hiding the finding from Allure's pass rate and silently excluding it from `Bug-List.xlsx` (the reporter only logs `failed`/`timedOut`). A documented failure is a more honest signal of this suite's value than an artificially green one.

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

**`lint-and-typecheck` job** (ubuntu-latest): checkout, setup Node 20, `npm ci`, type-check, lint. This is the only thing CI runs.

**Why CI doesn't run the full suite:** the full suite targets the public OrangeHRM demo, a third-party site this project doesn't control. When run from GitHub Actions' hosted runners, every test fails uniformly across all 3 browsers (0% pass). That pattern is consistent with the demo blocking or rate-limiting traffic from cloud datacenter IP ranges, not a defect in the suite itself (the exact same run passes locally, and every bug documented under `docs/` was found that way). Rather than publish a red, misleading 0%-pass report, the full regression and its Allure/Playwright HTML reports are meant to be run locally. See [docs/TC-Regression-Allure-Guide.txt](docs/TC-Regression-Allure-Guide.txt) and **Getting Started** above.

If targeting a different environment for a local run, set these in `.env` (copied from `.env.example`):
- `BASE_URL`
- `ORANGEHRM_USERNAME`
- `ORANGEHRM_PASSWORD`

## Test Coverage

| Module | TCs | Docs |
|--------|----:|------|
| Login | 46 | [docs/TC-Login.txt](docs/TC-Login.txt) |
| Admin | 153 | [docs/TC-Admin.txt](docs/TC-Admin.txt) |
| PIM | 203 | [docs/TC-PIM.txt](docs/TC-PIM.txt) |
| Recruitment | 68 | [docs/TC-Recruitment.txt](docs/TC-Recruitment.txt) |
| Buzz | 34 | [docs/TC-Buzz.txt](docs/TC-Buzz.txt) |
| Performance | 49 | [docs/TC-Performance.txt](docs/TC-Performance.txt) |
| Claim | 36 | [docs/TC-Claim.txt](docs/TC-Claim.txt) |
| Leave | 33 | [docs/TC-Leave.txt](docs/TC-Leave.txt) |
| Time | 31 | [docs/TC-Time.txt](docs/TC-Time.txt) |
| Cross-module (Leave/Claim/Performance/Time) | 7 | [docs/TC-XMOD.txt](docs/TC-XMOD.txt) |
| My Info | 18 | [docs/TC-MyInfo.txt](docs/TC-MyInfo.txt) |
| Dashboard | 3 | [docs/TC-Dashboard.txt](docs/TC-Dashboard.txt) |
| Maintenance | 4 | [docs/TC-Maintenance.txt](docs/TC-Maintenance.txt) |
| Sidebar Search | 3 | [docs/TC-SidebarSearch.txt](docs/TC-SidebarSearch.txt) |
| Sweep, all menus (data-driven) | 11 | [docs/TC-Sweep.txt](docs/TC-Sweep.txt) |
| **Total** | **699** | (+3 multi-role infrastructure smoke tests in `tests/_global/infra/`) |

**Approach highlights:**
- **Multi-role testing:** the public demo ships only one Admin login, so `tests/_global/infra/` + `src/utils/` (`createEssAccount`, `createSecondAdmin`, `assignSupervisor`, `loginAs`) spin up real accounts on the fly. Performance, Claim, Leave and Time are all tested across roles: an ESS user submits, an Admin approves/rejects in a separate browser context, and each test confirms the ESS user can't self-approve via the API.
- **Environment resilience:** the shared demo flips its global date format at random (`src/utils/dateInput.ts` reads the live placeholder instead of assuming one format) and other users delete shared seed data, so tests that need data create their own (`ensureVacancy.ts`, etc.) rather than relying on it existing.
- **Taxonomy coverage:** `docs/Taxonomy-Coverage-Matrix.xlsx` maps all 109 menu units across every sidebar module against every item in `docs/Test-Case-Taxonomy.txt`; each cell is COVERED (with TC ids), N/A (with a verified reason), or GAP. `tools/coverage/` rebuilds it; `docs/Taxonomy-Coverage-Matrix.md` has the per-module gap backlog.

**App-wide bugs confirmed independently across multiple modules** (same root cause, found and reproduced separately in each, the strongest signal of a systemic code issue rather than a one-off):

| Pattern | Confirmed in | Bug IDs |
|---|---|---|
| Unhandled JS exception on any non-2xx save response (dropped connection / 422 / 404) | Admin, PIM, Recruitment, Buzz, Claim, My Info | BG-199 family |
| Missing clickjacking header (`X-Frame-Options`/CSP) | Login, Recruitment, PIM, Admin, Buzz, cross-module sweep | BG-404 |
| Double-click Save creates duplicate records (no debounce) | Admin, Recruitment, PIM (×5), Performance (×2), Leave, Claim | BG-427 family, 7+ instances |
| "Ghost" foreign-key id crashes the server with 500 instead of a clean 4xx | Recruitment, Leave, Time, Performance, My Info, PIM | BG-460 family |
| Upload validates the claimed file type/extension only, not real content | Admin, PIM (×4), Recruitment, My Info, Claim | BG-003/462/463/464 family |
| No rate limiting on create/submit endpoints | Login, Recruitment, Buzz, Claim (×2) | BG-491/492 family |
| Path-traversal filename accepted and stored verbatim | My Info, PIM, Claim | BG-462/463/493 |

### Per-module highlights

| Module | Coverage | Standout findings |
|---|---|---|
| **Login** | n/a | No rate limiting/lockout on failed logins; missing clickjacking header; Reset Password intermittently hangs with no response (~29% of isolated runs, likely an unreachable SMTP dependency) |
| **Admin** | 84.1% | A System User account can be created for an employee who already has one, across any role (ESS + Admin on the same employee, with a third login accepted on top), with no 1-employee-1-login constraint anywhere (BG-516); the General Information Country field accepts any arbitrary code with zero server-side validation, bypassing the dropdown's whitelist entirely (BG-517); Pay Grade's Add Currency accepts a negative minimum salary with no business-rule check (BG-510); Work Shift crashes with 500 on a malformed start time instead of a clean 4xx (BG-508); renaming a freshly-created Org Structure unit fails with 422 (resends an untouched optional field as `null`, BG-025); Job Title's file upload accepts a renamed executable |
| **PIM** | 97.6% (ceiling) | Full employee-record + configuration coverage. Supervisor/Job/Personal-Details lookup ids crash with 500 instead of 422 (BG-466/467/470); CSV re-import has no idempotency, creating a duplicate employee on retry (BG-484); Report `criteria` filter crashes 500 for every value tried (BG-485) |
| **Recruitment** | 68 TCs | Candidate Shortlist 500s specifically when the vacancy has no hiring manager, root-caused via an 8/8 correlation, not random flakiness; double-click creates duplicate candidates; resume/vacancy-attachment uploads accept renamed executables |
| **Buzz** | 100% (ceiling) | Share Video returns HTTP 500 for *every* value tried, including a benign URL: the feature is broken server-side, not just under-validated (BG-490, High); double-click posts broadcast duplicates company-wide; no rate limiting on post creation |
| **Performance** | 98.1% (ceiling) | Non-numeric KPI ratings silently coerced to `0` on both supervisor- and employee-side endpoints (BG-373/489); an ESS user could read every employee's tracker data, a broken function-level access control issue (BG-460); review end-date-before-start-date accepted via direct API call |
| **Claim** | 100% (ceiling) | Zero-expense claims can be approved straight to PAID; a stale Reject button throws on an already-paid claim; attachment filenames with path traversal or shell metacharacters are stored verbatim with no sanitization (BG-493) |
| **Leave** | 82.4% | `GET leave-entitlements` 500s on any `offset` value; two holidays on the same date are blocked client-side but accepted by the API with no server-side constraint |
| **Time** | 100% (ceiling) | The 24h/day limit is enforced per row, not per day, on BOTH the self-service AND the Admin-edits-another-employee's-timesheet endpoint: two legitimate-looking rows together exceed 24h undetected (BG-402/507); deleting an already-deleted attendance record returns a misleading 403 "Unauthorized" instead of 404, confirmed on both the self-service and the Admin endpoint (BG-499/504); Punch In/Out has no date-range check at all, accepting a date 73 years in the future (BG-502); an emoji is silently corrupted to "??" in the Punch In note (BG-501), and crashes the Employee Name search outright with a 500 (BG-505) |
| **Cross-module** | 7 TCs | None of the four shared-layer modules sends a clickjacking header; an emoji in a name field 500s the server-side uniqueness check; a dropped connection mid-save leaves the form stuck on its spinner forever |
| **My Info** | 76.6% | Fields disabled in the UI (Employee Id, Date of Birth) are still editable through direct API calls (BG-420, High); a cross-site page can overwrite the session cookie and log the employee out |
| **Dashboard / Sidebar Search / Maintenance** | 80.8% / 100% / 88.7% | Maintenance's "Administrator Access" password prompt is UI-only; purge and personal-data export both succeed via the API with no password check at all (BG-440, High) |
| **Sweep (all menus)** | 11 TCs | Confirms the clickjacking gap and an unlabeled-input/icon-button accessibility issue (BG-416) hold app-wide, across every module at once, not just where found individually |

Full reproduction steps, request/response bodies, and the complete bug catalog for each module live in its `docs/TC-<Module>.txt` and in `docs/Bug-List.xlsx`.

**Taxonomy coverage snapshot (2026-11-26):** 91.0% of applicable cells COVERED overall. Recruitment, Dashboard, Sidebar Search, Buzz, Claim and Time are at 100% (all six at their ceiling), Performance at 98.1%, PIM at 97.6%, Maintenance at 88.7%, Leave at 82.4%, Directory at 80.8%, Admin at 84.1% and My Info at 76.6%; My Info is the lowest module (Organization > General Information and Organization > Structure both just closed their gap in full -- 19/19 and 21/21 taxonomy codes covered -- on top of Admin Users and the 12 "reference data" sub-screens closed earlier; Admin's remaining gap is concentrated in the Configuration sub-screens under Corporate Branding). See `docs/Taxonomy-Coverage-Matrix.md` for the per-module gap list.

## Security Scanning (source code, separate from the E2E suite above)

Besides the functional/DAST-style security TCs already inside `tests/recruitment/security/` (IDOR, response headers, rate limiting, race conditions, tested against the *running* demo app), `security/` holds a **source-code-level** scan of OrangeHRM's own open-source repository (`github.com/orangehrm/orangehrm`, GPL-3.0): SCA and SAST via Snyk, secret scanning via Gitleaks, and Dockerfile misconfiguration via Trivy.

**Latest results:** SCA 5 Critical/36 High/64 Medium/4 Low, SAST 1 High/11 Medium/175 Low, Gitleaks 358 secret-pattern hits (inspected and found to be effectively all test fixtures / a known vendored-library false positive, not live credentials), Trivy 1 High/1 Low. Full JSON + PDF evidence and setup instructions: [security/README.md](security/README.md).

## Roadmap

- **OWASP ZAP (on hold):** planned DAST addition, target already decided: a self-hosted OrangeHRM instance via Docker (built from the already-cloned source, which has its own Dockerfile), not the public demo, to allow a full active scan without any third-party risk. See [security/README.md](security/README.md#planned-next-addition-owasp-zap-on-hold) for the full reasoning.

## License

Private portfolio project.
