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
├── tests/
│   ├── login/          # One module = one folder. Specs are named by test case ID.
│   ├── admin/          # One subfolder per Admin sub-screen (~16 total, incl. Configuration's 8)
│   ├── pim/             # One subfolder per PIM screen (incl. configuration/ and security/)
│   └── recruitment/     # One subfolder per Recruitment screen (incl. security/)
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
| Login | 46 | [docs/TC-Login.txt](docs/TC-Login.txt) |
| Admin | 144 | [docs/TC-Admin.txt](docs/TC-Admin.txt) |
| PIM | 164 | [docs/TC-PIM.txt](docs/TC-PIM.txt) |
| Recruitment | 59 | [docs/TC-Recruitment.txt](docs/TC-Recruitment.txt) |
| Buzz | 32 | [docs/TC-Buzz.txt](docs/TC-Buzz.txt) |
| **Total** | **445** | |

**Cross-cutting edge cases (2026-11-12):** two scenarios flagged as commonly-forgotten in test design — refreshing mid-submit and a dropped connection mid-submit — were added to the main create/save flow of every module (Login, Admin, PIM, Recruitment, Buzz). This surfaced an app-wide bug: when a create/save request fails due to a dropped network connection, the SPA throws an unhandled JS exception that reaches the console/global error handler instead of being caught at its source, identically reproduced (same exception name) in Admin, PIM, Recruitment, and Buzz. The app does still show the user a generic "Unexpected Error!" toast in all four cases — this is a code-level error-handling defect, not a silent failure the user would never notice. Login is unaffected — its login form submits via a real top-level HTML form POST rather than fetch/XHR, so a dropped connection there replaces the whole page with the browser's native error screen instead. See the Admin, PIM, Recruitment, and Buzz sections below for each module's confirmed-bug entry.

A third scenario — rapid double-click on Save — was then extended to the two modules that didn't have it yet (Admin Users/Job Titles, Recruitment Candidates/Vacancies; Login, PIM, and Buzz already covered it). This surfaced two more distinct confirmed bugs: a genuine data-integrity issue on Recruitment Candidates (double-click creates two real duplicate records, since this form neither debounces the button nor enforces a unique-email constraint server-side) and a client-side crash on Recruitment Vacancies (`Cannot read properties of undefined (reading 'id')` in the app's own save handler). On Admin, double-click reproduced the same app-wide unhandled-exception bug again — this time triggered by a real 422 validation conflict rather than a simulated network drop, which is good independent evidence the underlying defect reacts to any non-2xx response, not just network failures.

### Login (46 TCs)

Organized into `tests/login/positive/`, `negative/`, `boundary/`, `security/`, and `edge/` — one subfolder per scenario group, the same per-category structure used by the other modules.

**Confirmed bugs:**
- No rate limiting/lockout after repeated failed logins
- Missing `X-Frame-Options` / CSP `frame-ancestors` (clickjacking)
- Submitting Reset Password with a valid username **intermittently hangs with no response** (`TC-LOGIN-46`, added 2026-11-12) — not deterministic, but reproducible well above noise level: 4/4 when run back-to-back in quick succession, ~29% (2/7) when run as isolated, separately-launched runs. An invalid username always completes quickly (~3-6s) by contrast, so this is specific to whatever the valid-username path triggers — most likely an attempt to send a real reset email through SMTP that isn't reachable from this public demo. The exact server-side cause can't be confirmed from the client side, but the practical effect is real: a genuine user on this demo can't reliably reset their password.

CSRF and session-fixation checks confirmed **effective** (no bug). Re-verifying the full suite after reorganizing these files into subfolders also surfaced and fixed 2 script bugs unrelated to the reorganization itself: a race condition reading the post-login URL before the redirect completed (`TC-LOGIN-29`), and a cross-origin CSRF check whose UI assertion expected the browser to stay on the attacker's origin, when a real form POST always follows its redirect as normal top-level navigation (`TC-LOGIN-41`) — neither affected the tests' underlying security conclusions.

### Admin (144 TCs)

Full coverage across all ~16 Admin sub-screens:

- User Management > Users (11, incl. combined filter and bulk delete added 2026-11-12)
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
- When a create-user request fails due to a dropped network connection, the SPA throws an unhandled JS exception that reaches the console instead of being caught at its source (a generic "Unexpected Error!" toast is still shown to the user, so this is a code-level defect rather than a silent failure) — the **1st of 4 identical confirmations** of this app-wide gap — see also PIM, Recruitment, and Buzz
- The same unhandled-exception bug reproduces again on double-click (Users and Job Titles), this time triggered by a real HTTP 422 validation conflict rather than a simulated dropped connection — good independent evidence the defect reacts to any non-2xx response. No duplicate data is created in either case; the server's own unique-name validation rejects the second request.

Corporate Branding's logo/banner inputs, by contrast, reject the same renamed-executable payload by decoding it as a real image client-side. IDOR TCs (Skills, Nationalities, Locations) found no multi-tenant boundary to breach — consistent with this demo's single-admin-role architecture, documented as N/A rather than a false-positive vulnerability. Cross-origin mutation (CSRF) on pay-grade creation confirmed **blocked by CORS** (no bug).

**Users list filter + bulk delete** (`TC-ADMIN-USER-10`/`11`, added 2026-11-12) were previously untested. Combined Role+Status filtering confirmed to AND together server-side as expected. The Username filter field turned out to be **exact-match (case-insensitive), not a substring search** — it looks like a plain free-text search box with no visual hint that it needs the full username, which is a UX gap worth flagging even though the server behavior itself isn't wrong. Bulk delete (checkbox-select 2+ rows → "Delete Selected") confirmed to send a single `DELETE` with `{"ids":[...]}` for every selected row at once, the same pattern already seen on Languages/Nationalities/Qualifications.

### PIM (164 TCs)

Full module coverage, no open functional gaps: Employee List (14), Add Employee (30), Personal Details + 9 sub-tabs (Contact Details, Job incl. Terminate Employment, Emergency Contacts, Dependents, Immigration, Salary, Report-to, Qualifications with all 5 sub-sections, Memberships), Configuration (Optional Fields, Custom Fields, Data Import, Reporting Methods, Termination Reasons), Reports, plus 8 cross-cutting file-upload security TCs and 2 IDOR/clickjacking security TCs.

**Terminate Employment** (`TC-PIM-JOB-09`, added 2026-11-12) was previously untested. Confirmed working end-to-end (`PUT .../terminations` returns 200, response carries the submitted date/reason/note). Caught two findings along the way: a script-side locator collision (the modal renders on top of the still-present Job Details form, which has its own "Joined Date" input sharing the exact same placeholder — same root-cause pattern as the Buzz Edit Post bug below, fixed by scoping every modal interaction to `page.getByRole('dialog')`), and an app-side one — the button doesn't flip from "Terminate Employment" to "Activate Employment" without a page reload, the same no-client-side-refresh pattern already documented for Buzz's own feed. Also noted: the section header itself reads "Employee Termination / Activiation" — a typo in the app, not in this documentation.

**Confirmed bugs:**
- Extension-only validation lets an executable disguised as a photo through on both profile-photo upload points
- Missing `X-Frame-Options` / CSP `frame-ancestors` on Employee List — the **3rd app-wide confirmation** of the same clickjacking gap also found in Login and Recruitment
- The same unhandled-exception-on-dropped-connection bug as Admin (**2nd of 4 confirmations**), reproduced identically on create-employee
- Rapid double-click on Save in Add Employee intermittently sends 2 requests (~83% reproduction over 6 isolated runs); the second is correctly rejected by the server (no duplicate data), but handling that rejection triggers the same unhandled-exception pattern already confirmed on Admin's own double-click case — a new instance of an already-known app-wide defect, found during full-suite regression (2026-11-12)

IDOR on personal-details/salary access confirmed N/A (single-role architecture, same as other modules). Report-to's "Add Supervisor/Subordinate" TCs (3) have a known intermittent UI-verification issue — the underlying save is confirmed working via its own API-level TC, only the text-match assertion is unreliable.

### Recruitment (59 TCs)

Vacancies incl. edit/deactivate/pagination/sorting (17), Candidates incl. resume upload/download and list filters (18), candidate status workflow state machine through to terminal "Hired" (14), cross-cutting security: IDOR, response headers, rate limiting, concurrent-write race condition, cross-origin mutation/CSRF (5).

**Critical confirmed bug:** the candidate Shortlist endpoint (`PUT .../candidates/<id>/shortlist`) returns a 500 Internal Server Error — confirmed reproducible with the server independently verified healthy each time. **Root cause pinpointed (2026-11-12):** the 500 occurs specifically when the candidate's vacancy has no hiring manager assigned (`hiringManager: null`), not for every candidate as first assumed — verified with a clean 8/8 correlation across 8 independent trials (vacancies with a hiring manager always returned 200; vacancies without one always returned 500). Every existing test happened to hit this because the shared `createTestCandidate()` helper always picked the first vacancy in the dropdown, which has no hiring manager, cascading into failures across almost every other status-workflow test. The helper has since been fixed to pick a vacancy with a hiring manager instead (querying the vacancies API dynamically rather than hardcoding a name), which unblocked all 12 previously-blocked status-workflow tests — but that's a test-data workaround, not an application fix. The underlying bug is still very much present, so a dedicated regression test (`TC-RECRUITMENT-STATUS-15`) deliberately keeps exercising the no-hiring-manager case so it stays tracked.

Also confirmed: the same unhandled-exception-on-dropped-connection bug as Admin and PIM (**3rd of 4 confirmations**), reproduced identically on create-candidate.

Two more distinct bugs confirmed on double-click: rapid double-clicking Save on Add Candidate creates two genuinely duplicate candidate records — this form neither debounces the button nor enforces a unique-email constraint server-side (candidates allow duplicate emails by design, per `TC-RECRUITMENT-CANDIDATE-14`), confirmed via the raw API response bodies returning two distinct candidate IDs, not just a UI-list count. The same scenario on Add Vacancy instead crashes the app's own save handler (`Cannot read properties of undefined (reading 'id')`) without creating a duplicate — a client-side defect, not a data-integrity one.

### Buzz (32 TCs)

OrangeHRM's internal social feed, broadcasting posts to every logged-in employee company-wide rather than a scoped role — the widest blast radius of any module tested, so validation gaps here were treated as higher-impact. Organized into `tests/buzz/posts/` (post lifecycle: create/cancel/delete/boundary), `tests/buzz/engagement/` (like/unlike/comment/share/interacting with another employee's post), `tests/buzz/feed-filters/` (the Most Liked / Most Commented tabs), and `tests/buzz/security/` — the same per-category subfolder structure used by Recruitment. Covers: text posts incl. empty/very-long boundary and photo-only boundary (4), valid photo upload, like/unlike, delete own post, comment incl. empty-comment rejection, share-post counter, viewing another employee's post (7), feed filter tabs (2), composer cancel/discard and rapid double-click-submit edge cases (2), plus 11 security TCs — XSS and SQL injection on both post text and comment text, extension-only file-upload bypass via "Share Photo" with a rejected-`.exe` baseline control, a malicious-URL check on the text-only "Share Video" field, cross-origin mutation (CSRF), clickjacking headers, rate limiting on post creation, and a read-only IDOR baseline.

**Confirmed bugs:**
- Extension-only validation on the "Share Photo" upload accepts an executable renamed to `.jpg` — same pattern as PIM/Recruitment/Admin, now reproduced in the module with the widest broadcast radius. Reproduction is flaky (roughly 3 of 5 isolated reruns accepted the file) but still classified as a confirmed bug given it reproduces the majority of the time and matches a pattern already deterministic elsewhere.
- Rapid double-click on the composer's "Post" button is not debounced, sending 2 identical POST requests and creating 2 duplicate posts broadcast to the whole company — the same race-condition pattern as Recruitment's candidate-creation bug.
- No rate limiting on post creation — 8 rapid POST requests all succeeded with no throttling, the same gap already confirmed on Login and Recruitment, but higher-impact here since the result is broadcast company-wide rather than written to one record.
- Missing `X-Frame-Options` / CSP `frame-ancestors` — the **5th app-wide confirmation** of the same clickjacking gap also found in Login, Recruitment, PIM, and Admin.
- The same unhandled-exception-on-dropped-connection bug as Admin, PIM, and Recruitment (**4th and final confirmation**), reproduced identically on create-post.

"Share Video" turned out to be a paste-a-URL field, not a file upload — an initial TC assumed otherwise and was rewritten after live discovery corrected it. IDOR on post/comment access confirmed N/A (same single-role architecture as other modules). A new post does not appear in the feed via client-side state update — a page reload is required to see your own post — documented as an app UX characteristic, not a bug. Two TCs (valid photo upload, SQL injection in comment text) pass reliably in isolation but are flaky when run as part of the full sequential suite, a timing characteristic of the shared public demo under load rather than a product defect.

Three more TCs close out previously-untested features: editing an own post, deleting a comment, and infinite-scroll pagination on the feed. All three work correctly — no new application bugs found. Writing the edit-post test did catch a script bug, though: the "Edit Post" modal renders on top of the still-present main composer, so the page briefly has two `<textarea>` elements (an empty one behind the modal, and the real pre-filled one inside it) — an early version of the test filled the wrong one, silently leaving the post unchanged despite a 200 response.

**Other confirmed bugs:**
- Resume upload accepts an executable disguised as a `.pdf` — same extension-only validation pattern as PIM
- A genuine race condition on the candidate status-transition endpoint: two mutually-exclusive concurrent status changes (Reject vs. Schedule Interview) on the same candidate can both report success, with no server-side locking/versioning
- Missing `X-Frame-Options` (clickjacking, same app-wide gap as Login/PIM)
- No rate limiting on candidate creation

Cross-origin mutation (CSRF) on vacancy creation confirmed **blocked by CORS** (no bug). Plus a documented intermittent client-side rendering bug (Application Stage/Candidate History cards occasionally stuck loading forever with no underlying API error).

## Security Scanning (source code, separate from the E2E suite above)

Besides the functional/DAST-style security TCs already inside `tests/recruitment/security/` (IDOR, response headers, rate limiting, race conditions -- tested against the *running* demo app), `security/` holds a **source-code-level** scan of OrangeHRM's own open-source repository (`github.com/orangehrm/orangehrm`, GPL-3.0): SCA and SAST via Snyk, secret scanning via Gitleaks, and Dockerfile misconfiguration via Trivy.

**Latest results:** SCA 5 Critical/36 High/64 Medium/4 Low, SAST 1 High/11 Medium/175 Low, Gitleaks 358 secret-pattern hits (inspected -- effectively all test fixtures / a known vendored-library false positive, not live credentials), Trivy 1 High/1 Low. Full JSON + PDF evidence and setup instructions: [security/README.md](security/README.md).

## Roadmap

- **OWASP ZAP (on hold):** planned DAST addition, target already decided -- a self-hosted OrangeHRM instance via Docker (built from the already-cloned source, which has its own Dockerfile), not the public demo, to allow a full active scan without any third-party risk. See [security/README.md](security/README.md#planned-next-addition-owasp-zap-on-hold) for the full reasoning.

## License

Private portfolio project.
