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
| Admin | 144 | [docs/TC-Admin.txt](docs/TC-Admin.txt) |
| PIM | 202 | [docs/TC-PIM.txt](docs/TC-PIM.txt) |
| Recruitment | 68 | [docs/TC-Recruitment.txt](docs/TC-Recruitment.txt) |
| Buzz | 32 | [docs/TC-Buzz.txt](docs/TC-Buzz.txt) |
| Performance | 41 | [docs/TC-Performance.txt](docs/TC-Performance.txt) |
| Claim | 29 | [docs/TC-Claim.txt](docs/TC-Claim.txt) |
| Leave | 33 | [docs/TC-Leave.txt](docs/TC-Leave.txt) |
| Time | 21 | [docs/TC-Time.txt](docs/TC-Time.txt) |
| Cross-module (Leave/Claim/Performance/Time) | 7 | [docs/TC-XMOD.txt](docs/TC-XMOD.txt) |
| My Info | 18 | [docs/TC-MyInfo.txt](docs/TC-MyInfo.txt) |
| Dashboard | 3 | [docs/TC-Dashboard.txt](docs/TC-Dashboard.txt) |
| Maintenance | 4 | [docs/TC-Maintenance.txt](docs/TC-Maintenance.txt) |
| Sidebar Search | 3 | [docs/TC-SidebarSearch.txt](docs/TC-SidebarSearch.txt) |
| Sweep, all menus (data-driven) | 11 | [docs/TC-Sweep.txt](docs/TC-Sweep.txt) |
| **Total** | **662** | (+3 multi-role infrastructure smoke tests in `tests/_global/infra/`) |

**Multi-role testing (2026-11-15):** the public demo only ships one Admin login, which earlier made approval flows look untestable ("N/A"). `tests/_global/infra/` and `src/utils/` now create real accounts on the fly (`createEssAccount`, `createSecondAdmin`, `assignSupervisor`, `loginAs`), so Performance, Claim, Leave and Time are tested across roles: an Employee Self-Service (ESS) user submits, an Admin approves or rejects in a separate browser context, and each test also checks the ESS user cannot approve their own request via the API. This also overturned an older "Approve/Reject is N/A" conclusion in Leave.

**Environment resilience:** the shared demo periodically resets and flips its global date format between `yyyy-dd-mm` and `yyyy-mm-dd`, and typed dates are parsed in whichever format is currently displayed. `src/utils/dateInput.ts` reads the live placeholder and converts values. That restored four Leave tests that had broken purely because of the drift, and the same helper now drives every date field in PIM and Recruitment too. Other users of the demo also delete shared data: it has been seen with no vacancies and an empty Buzz feed. Tests that need such data create it themselves (for example `src/utils/ensureVacancy.ts`) instead of relying on seed records.

**Taxonomy coverage:** `docs/Taxonomy-Coverage-Matrix.xlsx` maps every menu unit of the 12 sidebar modules plus the sidebar Search (109 units, taken from a live click-through of the sidebar and top navigation plus pages and tabs the nav does not expose, such as the PIM and My Info employee tabs) against every item of `docs/Test-Case-Taxonomy.txt`. Each cell is COVERED (with the TC ids), N/A (with the reason, derived from what the page actually contains), or GAP. Tests whose only check is "ran without exception" are listed as weak and do not count. `docs/Taxonomy-Coverage-Matrix.md` summarizes coverage per module and the open gap backlog; `tools/coverage/` rebuilds both. Checks that apply identically to every page (security headers, console errors, failed requests, load time) run as data-driven sweeps over all units (`tests/_global/sweep/`).

**Cross-cutting edge cases (2026-11-12):** two scenarios that are easy to forget in test design, refreshing mid-submit and a dropped connection mid-submit, were added to the main create/save flow of every module (Login, Admin, PIM, Recruitment, Buzz). This surfaced an app-wide bug: when a create/save request fails because of a dropped network connection, the SPA throws an unhandled JS exception that reaches the console/global error handler instead of being caught at its source, reproduced identically (same exception name) in Admin, PIM, Recruitment, and Buzz. The app still shows the user a generic "Unexpected Error!" toast in all four cases, so this is a code-level error-handling defect, not a silent failure the user would never notice. Login is unaffected, since its login form submits via a real top-level HTML form POST rather than fetch/XHR, so a dropped connection there replaces the whole page with the browser's native error screen instead. See the Admin, PIM, Recruitment, and Buzz sections below for each module's confirmed-bug entry.

A third scenario, rapid double-click on Save, was then extended to the two modules that didn't have it yet (Admin Users/Job Titles, Recruitment Candidates/Vacancies; Login, PIM, and Buzz already covered it). This surfaced two more distinct confirmed bugs: a genuine data-integrity issue on Recruitment Candidates (double-click creates two real duplicate records, since this form neither debounces the button nor enforces a unique-email constraint server-side) and a client-side crash on Recruitment Vacancies (`Cannot read properties of undefined (reading 'id')` in the app's own save handler). On Admin, double-click reproduced the same app-wide unhandled-exception bug again, this time triggered by a real 422 validation conflict rather than a simulated network drop, which is good independent evidence the underlying defect reacts to any non-2xx response, not just network failures.

### Login (46 TCs)

Organized into `tests/_global/login/positive/`, `negative/`, `boundary/`, `security/`, and `edge/`, one subfolder per scenario group, the same per-category structure used by the other modules.

**Confirmed bugs:**
- No rate limiting/lockout after repeated failed logins
- Missing `X-Frame-Options` / CSP `frame-ancestors` (clickjacking)
- Submitting Reset Password with a valid username **intermittently hangs with no response** (`TC-LOGIN-46`, added 2026-11-12). Not deterministic, but reproducible well above noise level: 4/4 when run back-to-back in quick succession, roughly 29% (2/7) when run as isolated, separately-launched runs. An invalid username always completes quickly (3-6s) by contrast, so this is specific to whatever the valid-username path triggers, most likely an attempt to send a real reset email through SMTP that isn't reachable from this public demo. The exact server-side cause can't be confirmed from the client side, but the practical effect is real: a genuine user on this demo can't reliably reset their password.

CSRF and session-fixation checks confirmed **effective** (no bug). Re-verifying the full suite after reorganizing these files into subfolders also surfaced and fixed 2 script bugs unrelated to the reorganization itself: a race condition reading the post-login URL before the redirect completed (`TC-LOGIN-29`), and a cross-origin CSRF check whose UI assertion expected the browser to stay on the attacker's origin, when a real form POST always follows its redirect as normal top-level navigation (`TC-LOGIN-41`). Neither affected the tests' underlying security conclusions.

### Admin (144 TCs)

Full coverage across all ~16 Admin sub-screens:

- User Management > Users (11, incl. combined filter and bulk delete added 2026-11-12)
- Job: Job Titles incl. file-upload security (8), Pay Grades (5), Employment Status (5), Job Categories (5), Work Shifts (5)
- Corporate Branding: logo/banner upload security, validate-only and never clicks "Publish" since it would change the shared demo's global theme (5)
- Qualifications: Skills incl. a second Description field + IDOR (8), Education (confirmed to use a "Level" field label rather than "Name", 5), Licenses (5), Languages (5), Memberships (admin-level master data, distinct from PIM's employee-level tabs, 5)
- Nationalities: confirmed ~196 real seed records with no UI search/filter, so Add/Delete TCs verify via the API directly (6)
- Organization: General Information, a single global record with an Edit switch where every mutating TC restores the original value afterward (6); Locations, 9 fields with a real server-backed Name-uniqueness check and an edit-form URL with the id in the path / IDOR (9); Structure, a genuine hierarchical org-chart tree gated behind an Edit switch (9)
- Configuration (39 TCs, all 8 sub-screens), using a risk-driven methodology classified by actual blast radius on the shared public demo rather than a blanket rule:
  - **Validate-only** (never clicks Save, since a bad write would change shared infrastructure): Email Configuration (5), Localization (5), Modules (5), Social Media Authentication (5), LDAP Configuration (5, the highest-risk screen in the suite per the app's own data-corruption warning)
  - **Fully exercised** (save-then-restore / add-then-delete, confirmed additive/reversible): Email Subscriptions (5), Language Packages (4), OAuth Client (5, registers API/mobile-app token clients rather than the login page, correcting an initial higher-risk assumption)
- Security: clickjacking header + CSRF cross-origin mutation (2)

**Confirmed bugs:**
- Job Title's "Job Specification" file upload accepts an executable renamed to `.jpg` (same extension-only validation pattern as PIM/Recruitment), see `TC-ADMIN-JOBTITLE-07`
- A freshly-added Organization Structure unit can't be renamed afterward: editing resends its untouched optional `unitId`/`description` as `null`, and the server rejects with HTTP 422, see `TC-ADMIN-STRUCTURE-07`
- Missing `X-Frame-Options` / CSP `frame-ancestors`, the **4th app-wide confirmation** of the same clickjacking gap also found in Login, Recruitment, and PIM
- When a create-user request fails because of a dropped network connection, the SPA throws an unhandled JS exception that reaches the console instead of being caught at its source (a generic "Unexpected Error!" toast is still shown to the user, so this is a code-level defect rather than a silent failure). This is the **1st of 4 identical confirmations** of this app-wide gap; see also PIM, Recruitment, and Buzz
- The same unhandled-exception bug reproduces again on double-click (Users and Job Titles), this time triggered by a real HTTP 422 validation conflict rather than a simulated dropped connection, good independent evidence the defect reacts to any non-2xx response. No duplicate data is created in either case; the server's own unique-name validation rejects the second request.

Corporate Branding's logo/banner inputs, by contrast, reject the same renamed-executable payload by decoding it as a real image client-side. IDOR TCs (Skills, Nationalities, Locations) found no multi-tenant boundary to breach, consistent with this demo's single-admin-role architecture, so they're documented as N/A rather than a false-positive vulnerability. Cross-origin mutation (CSRF) on pay-grade creation is confirmed **blocked by CORS** (no bug).

**Users list filter + bulk delete** (`TC-ADMIN-USER-10`/`11`, added 2026-11-12) were previously untested. Combined Role+Status filtering is confirmed to AND together server-side as expected. The Username filter field turned out to be **exact-match (case-insensitive), not a substring search**. It looks like a plain free-text search box with no visual hint that it needs the full username, which is a UX gap worth flagging even though the server behavior itself isn't wrong. Bulk delete (checkbox-select 2+ rows, then "Delete Selected") is confirmed to send a single `DELETE` with `{"ids":[...]}` for every selected row at once, the same pattern already seen on Languages/Nationalities/Qualifications.

### PIM (202 TCs)

Full module coverage, no open functional gaps: Employee List (14), Add Employee (30), Personal Details + 9 sub-tabs (Contact Details, Job incl. Terminate Employment, Emergency Contacts, Dependents, Immigration, Salary, Report-to, Qualifications with all 5 sub-sections, Memberships), Configuration (Optional Fields, Custom Fields, Data Import, Reporting Methods, Termination Reasons), Reports, plus 8 cross-cutting file-upload security TCs and 2 IDOR/clickjacking security TCs.

**Terminate Employment** (`TC-PIM-JOB-09`, added 2026-11-12) was previously untested. Confirmed working end-to-end (`PUT .../terminations` returns 200, response carries the submitted date/reason/note). Two findings came up along the way: a script-side locator collision (the modal renders on top of the still-present Job Details form, which has its own "Joined Date" input sharing the exact same placeholder, the same root-cause pattern as the Buzz Edit Post bug below, fixed by scoping every modal interaction to `page.getByRole('dialog')`), and an app-side one: the button doesn't flip from "Terminate Employment" to "Activate Employment" without a page reload, the same no-client-side-refresh pattern already documented for Buzz's own feed. Also noted: the section header itself reads "Employee Termination / Activiation," a typo in the app, not in this documentation.

**Confirmed bugs:**
- Extension-only validation lets an executable disguised as a photo through on both profile-photo upload points
- Missing `X-Frame-Options` / CSP `frame-ancestors` on Employee List, the **3rd app-wide confirmation** of the same clickjacking gap also found in Login and Recruitment
- The same unhandled-exception-on-dropped-connection bug as Admin (**2nd of 4 confirmations**), reproduced identically on create-employee
- Rapid double-click on Save in Add Employee intermittently sends 2 requests (~83% reproduction over 6 isolated runs). The second is correctly rejected by the server (no duplicate data), but handling that rejection triggers the same unhandled-exception pattern already confirmed on Admin's own double-click case, a new instance of an already-known app-wide defect, found during full-suite regression (2026-11-12)

IDOR on personal-details/salary access is confirmed N/A (single-role architecture, same as other modules). Report-to's "Add Supervisor/Subordinate" TCs (3) used to fail intermittently; on 2026-11-17 the cause was proven to be in the tests, not the app (the table shows first + last name without the middle name the autocomplete option includes, and the list reloads about 3 s after the save), and the tests were fixed.

**Employee tab APIs (2026-11-17):** `TC-PIM-API-01` checks the API of all 12 employee tabs (contract, paging, wrong method, no session, unknown employee) and that an ESS user cannot change their own Job, Salary or supervisors (108/108 pass). `TC-PIM-MUT-01` creates, updates and deletes rows on the 6 writable tabs with invalid, unicode, injected and mass-assigned input. Bug: Work Experience with an invalid date or an unknown id returns 500 (BG-439, Low).

**Taxonomy gap closure (2026-11-17), 2 new tests:** `TC-PIM-OPTFIELD-04` drives the site-wide Optional Fields toggle (`PUT pim/optional-field`, wrapped in `withConfigRestore`) directly via the API: both directions persist and are confirmed by a follow-up GET, an unknown field in the body is correctly rejected with 422 (strict schema), and non-boolean values (`"true"`, `1`, `null`) are coerced consistently to their truthy/falsy boolean equivalent rather than causing confusion — a finding, not a bug. All 13 checks pass; the config is restored and reverified afterward.

`TC-PIM-ATTACHMENT-API-01` then confirmed the Employee Attachments API (any tab, any employee — same JSON+base64 body discovered in My Info) correctly enforces its size limit and content-type allowlist, safely stores injected text in the description, and that Admin managing another employee's attachments is the intended workflow, not an IDOR. Bug: the same path-traversal filename issue as `BG-462` reproduces here too — a filename like `../../etc/passwd.pdf` is accepted and stored verbatim, confirming the Admin-side endpoint shares the exact same unvalidated code path as the ESS-side one (`BG-463`, Medium).

`TC-PIM-PHOTO-API-01` found the Profile Picture API (`PUT pim/employees/<N>/picture`) is a separate endpoint with the same upload-validation code: size limit and content-type allowlist both hold, a foreign `empNumber` in the body is ignored, and an employee id that doesn't exist correctly returns 422 rather than 500 (a pleasant contrast to the "ghost id crashes the server" pattern elsewhere). The same two bugs as `BG-462`/`BG-463` reproduce here too — a `bad.php.png` claiming `image/png` is accepted, and a path-traversal filename is stored verbatim — confirming all four upload variants (Attachments and Profile Picture, Admin and ESS) share the exact same unvalidated code path (`BG-464`, Medium).

`TC-PIM-REPORT-API-01` swept the Reports API end to end (create/read/delete, a confirmed 255-character name limit, SQL/XSS injection safely stored and never reflected in search, strict rejection of unknown body fields, 404 for an id that doesn't exist, method and session) — all 16 checks pass clean, no bug found.

`TC-PIM-REPORTTO-API-01` found the Supervisor/Subordinate API performs essentially no server-side validation beyond its body schema: an out-of-range `reportingMethodId`, a non-numeric `empNumber`, a supervisor id that doesn't exist, and adding the same supervisor twice all crash the endpoint with HTTP 500 instead of a 422 — only an unknown field in the body is correctly rejected (`BG-466`, High). Create/read/update/delete with valid data all work correctly.

`TC-PIM-DATAIMPORT-API-01` swept the CSV Import API (same JSON+base64 body as Attachments, but the response is an import summary rather than file metadata): size limit and content-type allowlist hold, an empty CSV (header only) returns a clean zero-count rather than an error, SQL-injected cell values are stored safely, and unknown body fields are rejected. All 14 checks pass clean, no bug — but it surfaces a worth-noting finding: a cell value starting with `=` (e.g. `=1+1`) is imported and stored as literal text; harmless on import itself, but a classic CSV-injection risk if that data is ever exported back to a spreadsheet someone opens (not verified further — out of this test's scope).

`TC-PIM-JOB-API-01` found the Job Details API validates exactly one of its four lookup ids correctly: a `subUnitId` that doesn't exist is rejected with 422, but `jobTitleId`, `empStatusId` and `locationId` that don't exist all crash the endpoint with HTTP 500 instead — the same per-field validation inconsistency as `BG-466` (`BG-467`, High). Date validation, mass-assignment rejection, and the Employment Contract's start/end date ordering check all work correctly.

`TC-PIM-CUSTOMFIELD-API-01` confirmed the real field-name length limit is 250 characters (an initial probe using identical strings across repeated trials gave a false boundary, caught and corrected by re-running with a unique name per trial). Bug: a field name that already exists is correctly rejected by the Add Custom Field form ("Already exists"), but accepted as a second row when posted directly to the API — the uniqueness check only lives in the form (`BG-468`, Low, the same form-only-validation pattern already confirmed elsewhere, e.g. Leave Holidays).

`TC-PIM-ADD-API-01` found the same photo-upload backend (now the 4th confirmed instance) on employee creation itself: a `bad.php.png` claiming `image/png` is accepted and a path-traversal filename is accepted too (`BG-469`, Medium) — though unlike Attachments, that filename is never echoed back by any employee endpoint tested, so a read-back exposure isn't confirmed here even though the underlying validation gap is identical. The content-type allowlist, size limit, required fields, and mass-assignment rejection all work correctly.

`TC-PIM-PD-API-01` confirmed Personal Details correctly validates `gender` and an unknown `empNumber`, and correctly rejects mass-assignment, while safely storing SQL/XSS/unicode input. Bug: `nationalityId` for a lookup value that doesn't exist crashes the endpoint with HTTP 500 — the 3rd confirmed instance of the same per-field validation inconsistency as Report-to (`BG-466`) and Job (`BG-467`) (`BG-470`, High).

While adding `TC-PIM-CONTACT-API-01`, a genuine script bug surfaced in the older `TC-PIM-CONTACT-03`: it concluded "invalid email format is accepted without validation" from an HTTP 200 and an absent DOM error alone, without ever checking the request body that was actually sent. Re-investigating with real network capture showed the opposite — the form silently clears an invalid email before Save, so the 200 reflects a clean `workEmail: null`, never the invalid string. Both are rewritten: `CONTACT-03` now verifies the real payload (confirming the field is always cleared, though whether an error message happens to appear first is itself inconsistent run to run — a minor race condition, noted as a finding) and `CONTACT-API-01` proves the server *does* correctly reject a malformed email with 422 when sent directly, bypassing the form.

`TC-PIM-EMERGENCY-API-01` confirmed Emergency Contacts correctly requires `relationship` while leaving all three phone fields optional, and rejects a malformed phone number with 422 — no bug.

`TC-PIM-DEPENDENT-API-01` confirmed Dependents' optional `dateOfBirth` and format validation, and the `relationshipType: "other"` + free-text `relationship` pairing — no bug. A future date of birth is accepted without a logical-age check, consistent with the same already-documented behavior on Personal Details, not a new finding.

`TC-PIM-IMMIGRATION-API-01` confirms the Admin-side Immigration endpoint is the exact same backend already tested from My Info: optional dates and date-format validation both hold, and an expiry date before the issue date is accepted on this side too — the same `BG-433` already logged for the ESS side, not a second bug.

`TC-PIM-SALARY-API-01` confirmed the per-Pay-Grade salary min/max business rule is enforced correctly in both directions, and that an unknown Pay Grade id is safely rejected (400) rather than crashing — no bug.

`TC-PIM-QUALIFICATION-API-01` confirmed Work Experience's optional dates and, notably, that a `toDate` before `fromDate` is correctly rejected with 422 here (unlike Immigration's `BG-433`). A ghost record id on `PUT` still crashes with 500, the same `BG-434` already confirmed from My Info, not a new bug.

`TC-PIM-MEMBERSHIP-API-01` confirmed Memberships correctly rejects a negative subscription fee and a renewal date before the commence date — both enforced properly, in contrast to the gaps found elsewhere. No bug. This closes out taxonomy gaps across all 9 employee tabs (Personal Details, Contact, Emergency, Dependents, Immigration, Job, Salary, Qualifications, Memberships).

`TC-PIM-LIST-API-01` confirmed a real employee delete from the Employee List, a unicode search, and a negative `limit` parameter — all correct, no bug.

`TC-PIM-REPORTMETHOD-API-01` and `TC-PIM-TERMREASON-API-01` confirmed the Reporting Methods and Termination Reasons APIs (Configuration) both enforce a 100-character `name` limit, reject mass-assignment of unknown fields, and reject a whitespace-only name — no bug. Both are single-field config endpoints with no optional fields or entity relations to vary.

`TC-PIM-CSRF-01` confirmed PIM shares the same CSRF architecture already proven on My Info: no endpoint tested (Personal Details, Contact Details, Job, Emergency Contacts, Dependents, Immigration, Memberships, Work Experience, Salary) validates the `Origin` header, so the session's `SameSite=Lax` cookie is the only real defense — a real cross-site attacker page could not change an employee's data. `TC-PIM-TABEDGE-01` swept 8 of the 9 employee tabs (all but Report-to) for success-toast consistency, double-click save, browser back/forward after save, a dropped connection mid-save, and two concurrent writes, since the existing add-form sweeps only cover simple named-entity config pages, not these multi-field edit tabs — all pass, no new bug.

`TC-PIM-PD-API-02` closed Personal Details' remaining gaps: optional-field combinations and the Nationality lookup relation resolve correctly, including after changing it — no bug, this tab's taxonomy coverage is now complete. `TC-PIM-JOB-API-02` found two real bugs on the termination endpoint: a termination date earlier than the employee's join date is accepted instead of rejected (`BG-473`, Medium), and two simultaneous terminations on the same employee both succeed with no locking, silently losing one of them (`BG-474`, Medium). `TC-PIM-REPORTTO-API-02` closed Report-to's remaining feedback/double-submit/concurrency/rate-limit gaps safely by using distinct supervisors per operation, since adding the same supervisor twice is already a known crash (`BG-466`) — no new bug, and confirmed live that Report-to genuinely has no search UI or free-text fields (so those taxonomy items are a verified N/A, not untested). Two existing tests (`TC-PIM-IMMIGRATION-API-01`, `TC-PIM-QUALIFICATION-API-01`) each gained a leap-year and extreme-date-range check to close a remaining boundary-date gap — no bug.

Attachments (`U098`) has no URL of its own — it's a widget embedded in 8 employee tabs, which is why it was absent from the generic page sweeps (not an oversight: those sweeps need one navigable URL per unit, and this one genuinely has none). `TC-PIM-ATTACHMENT-API-02` closed the update, optional-field, ESS-self-service and access-control gaps — an ESS user can upload to their own attachments but is correctly blocked (422) from another employee's, and the list endpoint flat-out rejects a `sortField` parameter, confirming at the API level that it has no search/filter/sort capability at all. `TC-PIM-CONTACT-10` tested the same widget's UI behavior (feedback, navigation, connection loss, concurrency, responsive, cross-browser, accessibility) directly on the Contact Details tab as a representative instance, and found a new bug: double-clicking Save on the attachment modal saves the file twice (`BG-475`, Medium) — the 4th confirmed instance of the app's known double-submit pattern (`BG-427`, `TC-PIM-ADD-33`). `TC-PIM-ATTACHMENT-API-03` closed Attachments' last 5 gaps: an executable renamed with a `.pdf` name and claimed `application/pdf` type is still accepted (same already-logged `BG-462`/`BG-463` pattern, not a new bug), a forged `Origin` header gets the same status as none at all (consistent with `TC-PIM-CSRF-01`), 6 parallel uploads all succeed with no rate limiting (finding, not a bug), no console warnings on opening the upload modal, and API response times are well within a sane bound for a shared public demo — no bug. This closes Attachments (`U098`) entirely except the already-proven-structural `1.6`. `TC-PIM-PHOTO-API-02` closed Profile Picture's remaining API gaps (read contract, required field, direct `.exe` upload rejected but the same file renamed with a `.png` name/type is accepted — same already-logged pattern, not a new bug — plus a CSRF Origin check and a privilege-escalation attempt that's correctly rejected), and `TC-PIM-PD-12` closed its UI edge cases (feedback toast, back/forward, dropped connection, double-click, two-user concurrency) on the photo widget in Personal Details — unlike Attachments this is a `PUT`/replace, not a `POST`/create, so double-submit can't duplicate a row, only overwrite idempotently. This closes Profile Picture (`U099`) entirely. `TC-PIM-LIST-15` closed Employee List's last 5 gaps on its delete flow: success toast, double-click on the confirmation dialog (which closes after the first click, so there's no duplicate delete), a dropped connection, and a forged CSRF `Origin` — no bug, and Employee List (`U002`) is now closed entirely. An audit found `TC-PIM-CSRF-01`'s docstring overclaiming coverage of 4 Configuration units it never actually tested — fixed by extending the real check code to genuinely exercise Reporting Methods, Termination Reasons, Add Employee and Reports (all pass, Origin still isn't validated anywhere), and correcting the docstring to match. `TC-PIM-OPTFIELD-05` closes Optional Fields (`U036`) entirely: read contract, an omitted boolean field is accepted (there's no "required" concept across 4 independent toggles), mass-assignment rejected, CSRF, save feedback, navigation, a dropped connection, and two-admin concurrency — no bug. `TC-PIM-CUSTOMFIELD-07` closes Custom Fields (`U037`) and finds a new bug: double-clicking Save on the Add Custom Field form creates two duplicate fields (`BG-483`, Medium) — the 5th confirmed instance of the same double-submit pattern. Two small additions to the existing Reporting Methods/Termination Reasons tests (delete-then-recreate gets a fresh id, no name reservation) close their last non-structural gap, leaving only the already-documented `1.2`/`1.4` flag-based limitation. `TC-PIM-DATAIMPORT-07` closes Data Import (`U038`) entirely and finds a new bug: re-importing the exact same CSV file (simulating a retry after a connection drop) creates a second, fully duplicate employee record instead of being detected as a repeat (`BG-484`, Medium) — the import endpoint has no idempotency key. Also noted: CSV import's success feedback renders as an inline results panel rather than the `.oxd-toast` pattern used by the rest of the app — a real but harmless feedback-mechanism inconsistency, not a bug. `TC-PIM-ADD-34` closes Add Employee (`U041`) entirely: read contract, no rate limiting (finding), save feedback, and — unlike CSV import — creating a second employee with the same Employee Id is correctly rejected (422), a genuine positive contrast with `BG-484`.

### Recruitment (68 TCs)

Vacancies incl. edit/deactivate/pagination/sorting (17), Candidates incl. resume upload/download and list filters (18), candidate status workflow state machine through to terminal "Hired" (14), cross-cutting security: IDOR, response headers, rate limiting, concurrent-write race condition, cross-origin mutation/CSRF (5).

**Critical confirmed bug:** the candidate Shortlist endpoint (`PUT .../candidates/<id>/shortlist`) returns a 500 Internal Server Error, confirmed reproducible with the server independently verified healthy each time. **Root cause pinpointed (2026-11-12):** the 500 occurs specifically when the candidate's vacancy has no hiring manager assigned (`hiringManager: null`), not for every candidate as first assumed. This was verified with a clean 8/8 correlation across 8 independent trials: vacancies with a hiring manager always returned 200, vacancies without one always returned 500. Every existing test happened to hit this because the shared `createTestCandidate()` helper always picked the first vacancy in the dropdown, which has no hiring manager, cascading into failures across almost every other status-workflow test. The helper has since been fixed to pick a vacancy with a hiring manager instead (querying the vacancies API dynamically rather than hardcoding a name), which unblocked all 12 previously-blocked status-workflow tests. That's a test-data workaround, though, not an application fix. The underlying bug is still very much present, so a dedicated regression test (`TC-RECRUITMENT-STATUS-15`) deliberately keeps exercising the no-hiring-manager case so it stays tracked.

Also confirmed: the same unhandled-exception-on-dropped-connection bug as Admin and PIM (**3rd of 4 confirmations**), reproduced identically on create-candidate.

Two more distinct bugs confirmed on double-click: rapid double-clicking Save on Add Candidate creates two genuinely duplicate candidate records, since this form neither debounces the button nor enforces a unique-email constraint server-side (candidates allow duplicate emails by design, per `TC-RECRUITMENT-CANDIDATE-14`). This was confirmed via the raw API response bodies returning two distinct candidate IDs, not just a UI-list count. The same scenario on Add Vacancy instead crashes the app's own save handler (`Cannot read properties of undefined (reading 'id')`) without creating a duplicate, a client-side defect rather than a data-integrity one.

**Taxonomy gap closure (2026-11-17), 9 new tests, Recruitment matrix 54.6% to 100%:** every endpoint behind the candidate and vacancy detail pages was first recorded live, then covered by `TC-RECRUITMENT-API-01` (contract, wrong method, no session, unknown ids, ESS denied on all 9 operations), `MUT-01` (server validation, unicode, injection stored as text, mass assignment rejected), `VALID-01` (each form rule proven in the form, then the same body sent to the API), `UPLOAD-01` (resume and vacancy attachments: types, 1 MB limit, disguised and malicious file names, safe download headers), `SECURITY-06` (parallel writes, two admins editing one candidate, cross-site requests, burst creation), and three UI tests for editing a candidate, the candidate list filters, and editing a vacancy with its attachments. Confirmed bugs:
- The API accepts what the forms reject: vacancy names over 50 characters or duplicated, 0/-1/100 positions, emails over 50 characters, attachment comments over 200 characters, and candidates for an inactive vacancy (who then cannot be shortlisted). The Notes field shows no message for what the server rejects (BG-445, Medium)
- An emoji in a candidate's name is silently saved as "?", right after a "Successfully Updated" toast (BG-442, Medium)
- Vacancy attachments accept an executable renamed to `.pdf`, the same content-blind check as resumes (BG-447, Medium; resumes are BG-004)
- A single-day date filter (From = To) passes the form but the server returns 400, and the list stays unfiltered (BG-443, Low)
- Uploading a resume for a non-existent candidate returns 500 (BG-444, Low); a double-click on Save stores the vacancy attachment twice (BG-446, Low)

### Buzz (32 TCs)

OrangeHRM's internal social feed, broadcasting posts to every logged-in employee company-wide rather than a scoped role, the widest blast radius of any module tested, so validation gaps here were treated as higher-impact. Organized into `tests/buzz/posts/` (post lifecycle: create/cancel/delete/boundary), `tests/buzz/engagement/` (like/unlike/comment/share/interacting with another employee's post), `tests/buzz/feed-filters/` (the Most Liked / Most Commented tabs), and `tests/buzz/security/`, the same per-category subfolder structure used by Recruitment. Covers: text posts incl. empty/very-long boundary and photo-only boundary (4), valid photo upload, like/unlike, delete own post, comment incl. empty-comment rejection, share-post counter, viewing another employee's post (7), feed filter tabs (2), composer cancel/discard and rapid double-click-submit edge cases (2), plus 11 security TCs covering XSS and SQL injection on both post text and comment text, extension-only file-upload bypass via "Share Photo" with a rejected-`.exe` baseline control, a malicious-URL check on the text-only "Share Video" field, cross-origin mutation (CSRF), clickjacking headers, rate limiting on post creation, and a read-only IDOR baseline.

**Confirmed bugs:**
- Extension-only validation on the "Share Photo" upload accepts an executable renamed to `.jpg`, same pattern as PIM/Recruitment/Admin, now reproduced in the module with the widest broadcast radius. Reproduction is flaky (roughly 3 of 5 isolated reruns accepted the file) but still classified as a confirmed bug, since it reproduces the majority of the time and matches a pattern already deterministic elsewhere.
- Rapid double-click on the composer's "Post" button is not debounced, sending 2 identical POST requests and creating 2 duplicate posts broadcast to the whole company, the same race-condition pattern as Recruitment's candidate-creation bug.
- No rate limiting on post creation: 8 rapid POST requests all succeeded with no throttling, the same gap already confirmed on Login and Recruitment, but higher-impact here since the result is broadcast company-wide rather than written to one record.
- Missing `X-Frame-Options` / CSP `frame-ancestors`, the **5th app-wide confirmation** of the same clickjacking gap also found in Login, Recruitment, PIM, and Admin.
- The same unhandled-exception-on-dropped-connection bug as Admin, PIM, and Recruitment (**4th and final confirmation**), reproduced identically on create-post.

"Share Video" turned out to be a paste-a-URL field, not a file upload. An initial TC assumed otherwise and was rewritten after live discovery corrected it. IDOR on post/comment access is confirmed N/A (same single-role architecture as other modules). A new post does not appear in the feed via client-side state update, so a page reload is required to see your own post. That's documented as an app UX characteristic, not a bug. Two TCs (valid photo upload, SQL injection in comment text) pass reliably in isolation but are flaky when run as part of the full sequential suite, a timing characteristic of the shared public demo under load rather than a product defect.

Three more TCs close out previously-untested features: editing an own post, deleting a comment, and infinite-scroll pagination on the feed. All three work correctly, no new application bugs found. Writing the edit-post test did catch a script bug, though: the "Edit Post" modal renders on top of the still-present main composer, so the page briefly has two `<textarea>` elements (an empty one behind the modal, and the real pre-filled one inside it). An early version of the test filled the wrong one, silently leaving the post unchanged despite a 200 response.

**Other confirmed bugs:**
- Resume upload accepts an executable disguised as a `.pdf`, same extension-only validation pattern as PIM
- A genuine race condition on the candidate status-transition endpoint: two mutually-exclusive concurrent status changes (Reject vs. Schedule Interview) on the same candidate can both report success, with no server-side locking/versioning
- Missing `X-Frame-Options` (clickjacking, same app-wide gap as Login/PIM)
- No rate limiting on candidate creation

Cross-origin mutation (CSRF) on vacancy creation is confirmed **blocked by CORS** (no bug). There's also a documented intermittent client-side rendering bug where Application Stage/Candidate History cards occasionally get stuck loading forever with no underlying API error.

### Performance (41 TCs)

Configure > KPIs (11: add/edit/delete, required fields, rating boundary, duplicate names, default-scale behavior, filter by Job Title, sort + pagination, injection, invalid id), Manage Reviews (13: create, the supervisor-link prerequisite, activation rules, KPI scoping, completion validation, date order, list filters, delete, edit lock after activation, double-click activate, IDOR and broken function-level access control using real ESS accounts), evaluation (7: the reviewer's full save → In Progress → Complete → read-only, per-KPI rating min/max on both UI and API, stored XSS in comments, evaluating an Inactive review via API, non-numeric ratings; plus the employee's own self-evaluation from My Reviews, and proof that an employee cannot write the supervisor or final evaluation of their own review), and Trackers (7: add, required fields, duplicate names, rename/delete with logs, employee ↔ reviewer log visibility, stored XSS in logs, and cross-employee IDOR).

Notable confirmed behaviors: a review can only name a "Supervisor Reviewer" who is already linked to the employee in PIM > Report-to; activation is refused (HTTP 400) unless the employee's Job Title has KPIs; marking a second KPI as "default scale" silently un-defaults the first one for that Job Title.

**Confirmed bugs:**
- Re-opening the edit page of an already-activated review: the app's own data fetch returns 404, which throws an unhandled JS exception and leaves the form blank (another instance of the app-wide unhandled-exception defect). No data risk, since the server rejects edits to an activated review with 422 (`TC-PERF-REVIEW-10`, BG-356)
- The evaluation API accepts a non-numeric rating (`"abc"`) with HTTP 200 and silently stores it as `0.00`. Numeric validation exists only in the browser, even though the same endpoint correctly rejects out-of-range and negative ratings (`TC-PERF-EVAL-15`, BG-373)

**Taxonomy gap closure (2026-11-17), 3 new tests, Performance matrix 59.6% to 67.2%:** the KPI, Tracker, Manage/Employee Reviews, My Reviews/Trackers, Employee Trackers, Review Evaluation and Tracker Log APIs were swept end to end: `TC-PERF-API-01` (contract, paging, wrong method, no session, unknown ids, and what an ESS user may/may not reach across all 10 Performance units), `TC-PERF-EVAL-17` (server-side rating/date validation, mass-assignment, injection on the supervisor and final evaluation), and `TC-PERF-TRACKER-08` (Tracker Log contract, required fields, achievement enum, a confirmed 150-character length limit, and injection). Confirmed bugs:
- `PUT .../evaluation/supervisor` for a review id that doesn't exist (`999999`) returns HTTP 500 instead of 4xx — the same "ghost id crashes the server" pattern already confirmed in Recruitment, Leave and Time (BG-460, High)
- An ESS (Employee Self Service) user can `GET performance/employees/trackers`, the administrative "all employees" Employee Trackers endpoint, and read every other employee's tracker data with HTTP 200 instead of being refused with 403 — a broken function-level access control (BFLAC) issue, verified consistently across two isolated re-runs (BG-460, High)
- A second, independent bug logged under the same script: the evaluation API accepts a non-numeric KPI rating (`"abc"`) with HTTP 200 and stores it as the literal string `"abc"`, even though the same endpoint correctly rejects out-of-range numeric ratings with 422 (`TC-PERF-EVAL-17`, BG-459, Medium)

### Claim (29 TCs)

Admin-side Assign Claim (14: create, required fields, expenses incl. amount boundary, attachments incl. renamed-executable upload, XSS/SQL injection, cancel, mass assignment, double-submit, concurrent cancel, back/forward, IDOR, segregation of duties) plus ESS-side Submit Claim and the My Claims status filter, the approval state machine (including Approve and Reject fired at the same instant: exactly one wins, and the final status always matches the winner), and Events / Expense Types configuration (15): new entries reach the ESS forms, inactive ones are hidden, duplicate names are refused by the server (422), and a stored-XSS event name renders as text for both Admin and ESS. Approve moves a claim straight to PAID (there is no separate "Pay" step); PAID, REJECTED and CANCELLED are terminal, and any further action is refused with 403. An ESS user only ever gets `CANCEL` on their own submitted claim.

**Confirmed bugs:**
- A claim with zero expenses can be submitted and then approved to PAID with a total of 0. This may be a product decision, so it's logged as Low and flagged for product-owner confirmation (`TC-CLAIM-SUBMIT-02`, BG-375)
- After Approve, the detail page keeps showing a stale Reject button. Clicking it is correctly refused by the server (403, claim stays PAID), but the UI throws an unhandled exception and shows the user nothing (`TC-CLAIM-APPROVAL-05`, BG-374, another confirmation of the app-wide defect)
- Earlier findings in this module remain open: unhandled exception on an amount-boundary 422 (BG-333) and attachment upload accepting a `.php` file renamed to `.jpg` (BG-338)

### Leave (33 TCs)

Apply (11), Assign (6), Leave List incl. cancel-restores-balance and IDOR (3 + 1), and the cross-role flow added in Fase 2 (5): an ESS user applies, the Admin approves (Pending Approval → Scheduled, balance deducted once) or rejects (balance restored, terminal), the ESS user cancels their own request from My Leave, and an entitlement added by the Admin becomes the ESS user's visible balance. Layer 2 added duration and calendar rules: a half day deducts 0.5, "Specify Time" deducts by hours and rejects reversed or zero-length ranges (422), a request falling only on a holiday (read live from the holiday calendar) or only on a weekend is rejected with "No Working Days Selected", overlapping requests are rejected, and retroactive (past-date) leave is accepted by design.

**Taxonomy gap closure (2026-11-17), 7 new tests, Leave matrix 55.1% to 82.4%:** Leave Period, Work Week, Holidays, Entitlements, and the settings/request APIs behind all of them were covered end to end: `TC-LEAVE-API-01` (contract, paging, wrong method, no session, unknown ids, ESS denied on 9 administrative operations), `MUT-01` (Leave Period/Work Week validation under `withConfigRestore`, Holidays CRUD and injection), `ENT-02` (the entitlement grant is confirmed to be an *additive* upsert — granting again adds to the existing value, exactly as the confirm dialog states, by design), `VALID-01`, `SECURITY-01` (cross-site requests, parallel writes, a burst of assignments), and two UI tests (`CONFIG-01`, `HOLIDAY-01`) for feedback, double-click, navigation, and a lost session. This also fixed an app-wide test-infrastructure bug: the shared demo can show a *third* date format (`dd-mm-yyyy`) that `dateInput.ts` didn't recognize, hanging every date-filling test across Leave, PIM, Admin, Recruitment, Performance and Time — the date-filling helper now works off the yyyy/mm/dd tokens themselves rather than a fixed list of format names. Confirmed bugs:
- `GET leave/leave-entitlements` returns 500 for *any* `offset` value, not just large ones, while every other paginated endpoint in the module handles the same parameter normally (BG-453, Medium)
- The Add Entitlement form rejects an entitlement of 10,000+ days or more than 2 decimal places, but the API accepts both (BG-454, Low)
- Double-clicking Save on Add Holiday stores two identical holidays (BG-456, Low, the same missing-debounce pattern as BG-205/BG-427/BG-446)
- Two holidays on the same date are blocked by a client-side "Already exists" check, but the same duplicate pair sent straight to the API is accepted (no server-side constraint at all)

Not tested end to end: Add Entitlement's "Multiple Employees" bulk-assign mode, since an empty filter on the shared demo matches 118 real employees belonging to other users, with no safe way to scope it to this suite's own test data.

### Time (21 TCs)

Attendance punch in/out incl. XSS in notes, Admin proxy punch-in, invalid-id handling, the employee report, timesheet hour entry and duration validation, and the cross-role timesheet flow added in Fase 2 (5): an ESS user fills and submits a weekly timesheet, the Admin approves it with a comment (APPROVED, no longer editable) or rejects it (the employee can correct and resubmit, so Reject is not terminal), self-approval through the API is refused, and approving a timesheet that was never submitted is refused (400). Layer 2 (5) adds day/week totals across several rows (and removing a row), stored XSS in a cell comment viewed by both the employee and the Admin, and Project Info: customer → project → activity names are unique at every level, an employee can log time to a new project but cannot create customers or projects (403), and nothing with time logged against it can be deleted.

Bug found: the 24-hour limit is checked per cell only. One cell of 25:00 is refused, but two rows on the same day (08:00 + 20:00) are accepted and the day shows 28:00 (BG-402, Medium; TC-TIME-TIMESHEET-11 stays FAILED on purpose). Finding, not logged as a bug: a timesheet can be rejected without any comment.

**Taxonomy gap closure (2026-11-17), 4 new tests, Time matrix 56.2% to 69.5%:** Attendance Configuration, Customers, Projects/Activities and the APIs behind the whole module were covered: `TC-TIME-API-01` (contract, paging, wrong method, no session, unknown ids, ESS denied on 5 administrative operations — and confirmed that self-service "My Timesheet" uses a genuinely different endpoint, `time/timesheets/default`, from the admin-facing `time/employees/<empNumber>/timesheets`, so an ESS 403 on the latter is correct, not a bug), `MUT-01` (CRUD, validation, injection, mass assignment; Customer's unique-name constraint is enforced by the server itself, unlike Leave's Holidays), `SECURITY-01` (cross-site requests, parallel writes, a burst of customer creations), and `CONFIG-01` (feedback, double-click, navigation, a lost session, two admins editing at once). Confirmed bugs:
- Adding an Activity to a project that doesn't exist returns 500 instead of 404 (BG-457, Low)
- The API accepts a Project Name over 50 characters, while the form rejects it and the otherwise-identical Customer Name field is enforced server-side too (BG-458, Low)

Not yet covered: dedicated feedback/double-submit/navigation/session/XSS-reflected UI tests for My Timesheet, Punch In/Out, Attendance Records, and Timesheet Edit & Approval, and search/filter coverage (including reflected XSS and SQLi in the search box) for the three Reports pages.

### Cross-module checks (7 TCs)

These aspects are handled by layers the four modules share (web server, the `/api/v2` router, the HTTP client and the common form components), so each test loops over all four modules and labels every check with the module name.

- **Pass:** a page on another site cannot create data in any module. A JSON request is blocked by CORS, and a plain form POST arrives without the session cookie because it is `SameSite=Lax`. List APIs reject bad `limit` / `offset` / `sortField` / `sortOrder` values (including an SQL-looking sort field) with a clean 422. Arabic, Chinese and accented names are saved and shown unchanged.
- **Finding:** the server itself accepts form-encoded bodies, does not check `Origin` and uses no CSRF token, so the browser's SameSite rule is the only line of defense.
- **Bugs:** none of the four modules sends a clickjacking header (BG-404, Medium, same gap as the older modules). Typing an emoji in a name makes the uniqueness check return a 500, and the user only sees "Unexpected Error Occurred" (BG-405, Medium). After a dropped connection during Save, the form stays stuck on its spinner until the page is reloaded, though no duplicate is ever created (BG-406, Low, part of app-wide BG-199).

**Expired session (2026-11-17), `TC-XMOD-07`:** saving after the session has expired correctly sends the user to the login page without changing data, but every time it throws an unhandled script error (`Cannot read properties of undefined (reading 'response')`) on Recruitment and PIM forms alike (BG-441, Low, app-wide).

### My Info (18 TCs)

Tested as a real Employee Self-Service user created on the fly: personal details, contact details, emergency contacts, dependents, immigration, qualifications, attachments, the tab APIs, and cross-site requests. Confirmed bugs: fields locked for employees (Employee Id, Driver's License, Date of Birth) can still be changed by the employee through the API (BG-420, High); attachments accept an executable renamed to `.pdf` (BG-422); double-click Save duplicates Immigration and Work Experience records (BG-431, BG-432); the Immigration API accepts an expiry date before the issue date (BG-433); unknown qualification ids return 500 (BG-434); and a page on another site can log the employee out by overwriting their session cookie (BG-437, Medium, app-wide). The cross-site attempt itself could not change any data.

**Taxonomy gap closure (2026-11-17), 1 new test, My Info matrix 64.5% to 71.9%:** Contact Details, Emergency Contacts, Dependents and Memberships were swept for server-side validation, length limits, injection and mass assignment in `TC-MYINFO-MUT-01` (request bodies captured live from the real UI network traffic rather than guessed — Emergency Contacts uses `homePhone`/`officePhone`/`mobilePhone`, not the UI's own field labels, and Dependents' `relationshipType` is a string enum like `"child"`, not a numeric id). Confirmed bugs:
- Dependents accepts an empty `name` with HTTP 200 and stores it — the "Required" check exists only in the Add Dependent form, not the server
- `POST .../memberships` with a membership id that doesn't exist (`999999`) returns HTTP 500 instead of 4xx, the same "ghost id crashes the server" pattern already confirmed in Recruitment, Leave, Time and Performance
(both logged together as `BG-461`, High)

`TC-MYINFO-PRIVESC-01` then confirmed an employee cannot escalate their own privileges through any of the 7 writable My Info endpoints (Personal Details, Contact Details, Emergency Contacts, Dependents, Immigration, Work Experience, Memberships): a privilege-shaped field (`userRoleId`, `isAdmin`, `roleName`, `permissions`) added alongside a valid body is rejected with 422 on every single one, no bypass found.

`TC-MYINFO-ATTACHMENT-02` found the Attachments API is actually a JSON endpoint (`{attachment: {name, type, size, base64}, description}`, not multipart — discovered from real network traffic, not guessed), and that its size limit, a content-type allowlist and injection on the description field all hold up. Bug: a file named `bad.php.pdf` whose real content is PHP, with `type` merely *claimed* as `application/pdf`, is accepted and stored — the server checks the claimed type against an allowlist but never the file's actual content, the same root cause as the renamed-executable bug above. A filename containing a path-traversal sequence (`../../etc/passwd.pdf`) is also accepted and stored verbatim, with no sanitization (`BG-462`, Medium).

### Dashboard (3 TCs), Sidebar Search (3 TCs), Maintenance (4 TCs)

- **Dashboard:** every widget shows the data its API returns, per role (Admin and ESS); the seven widget APIs (contract, methods, auth, headers, no sensitive data); and empty data, a failing widget, speed, layout and accessibility (all pass).
- **Sidebar Search:** filters the menu by module name, sends no request, is injection-safe and role-scoped, and works on a phone screen, collapsed, with a screen reader and in other browsers (all pass, findings in the doc).
- **Maintenance:** purging past employees and a vacancy's candidates, and downloading an employee's personal data record. Purge is permanent, so the tests only purge data they created. Bug: the "Administrator Access" password prompt exists only in the UI, and purge or personal-data download succeeds through the API without it (BG-440, High).

### Sweep over all menus (11 TCs)

Data-driven checks over every menu unit: page load and console errors, security headers, the list APIs, role access, accessibility, create/update/delete contracts, add-form feedback, double-submit, navigation, and connection loss. App-wide findings include missing clickjacking protection (BG-404), unlabeled inputs and icon buttons (BG-416, Medium), and double-click duplicates on some Admin forms (BG-427).

**Taxonomy coverage snapshot (2026-11-18):** 79.7% of applicable cells COVERED overall. Recruitment, Dashboard and Sidebar Search are at 100%, PIM at 96.3%, Maintenance at 88.7%, Leave at 82.4%, My Info at 76.6%, Admin at 72.8%, Time at 69.5% and Buzz/Claim at 69.0%; Performance (67.2%) is the lowest. See `docs/Taxonomy-Coverage-Matrix.md` for the per-module gap list.

## Security Scanning (source code, separate from the E2E suite above)

Besides the functional/DAST-style security TCs already inside `tests/recruitment/security/` (IDOR, response headers, rate limiting, race conditions, tested against the *running* demo app), `security/` holds a **source-code-level** scan of OrangeHRM's own open-source repository (`github.com/orangehrm/orangehrm`, GPL-3.0): SCA and SAST via Snyk, secret scanning via Gitleaks, and Dockerfile misconfiguration via Trivy.

**Latest results:** SCA 5 Critical/36 High/64 Medium/4 Low, SAST 1 High/11 Medium/175 Low, Gitleaks 358 secret-pattern hits (inspected and found to be effectively all test fixtures / a known vendored-library false positive, not live credentials), Trivy 1 High/1 Low. Full JSON + PDF evidence and setup instructions: [security/README.md](security/README.md).

## Roadmap

- **OWASP ZAP (on hold):** planned DAST addition, target already decided: a self-hosted OrangeHRM instance via Docker (built from the already-cloned source, which has its own Dockerfile), not the public demo, to allow a full active scan without any third-party risk. See [security/README.md](security/README.md#planned-next-addition-owasp-zap-on-hold) for the full reasoning.

## License

Private portfolio project.
