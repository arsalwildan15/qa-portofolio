# QA Portofolio: OrangeHRM E2E Automation Suite

[![Playwright E2E](https://github.com/arsalwildan15/qa-portofolio/actions/workflows/playwright.yml/badge.svg)](https://github.com/arsalwildan15/qa-portofolio/actions/workflows/playwright.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-1.49-2EAD33?logo=playwright&logoColor=white)
![Allure](https://img.shields.io/badge/Report-Allure-E12C2C)

End-to-end test automation suite for the [OrangeHRM demo application](https://opensource-demo.orangehrmlive.com/), built with **Playwright + TypeScript** following the Page Object Model, with **Allure** reporting and a **GitHub Actions** CI/CD pipeline.

**Live Allure report:** https://arsalwildan15.github.io/qa-portofolio/ (published automatically on every push to `main`)

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
│   ├── types/           # Shared domain types (e.g. NewEmployee)
│   ├── data/            # Test data factories: unique names, collision-free dates
│   ├── pages/            # Page Object Model: one class per screen, barrel-exported via index.ts
│   │   ├── BasePage.ts       # Shared behaviour all page objects inherit
│   │   ├── LoginPage.ts
│   │   ├── DashboardPage.ts
│   │   ├── PimPage.ts
│   │   ├── EmployeeListPage.ts
│   │   ├── AddEmployeePage.ts
│   │   ├── PersonalDetailsPage.ts
│   │   ├── ContactDetailsPage.ts
│   │   ├── JobPage.ts
│   │   ├── EmergencyContactsPage.ts
│   │   ├── DependentsPage.ts
│   │   ├── ImmigrationPage.ts
│   │   ├── SalaryPage.ts
│   │   ├── ReportToPage.ts
│   │   ├── QualificationsPage.ts
│   │   ├── MembershipsPage.ts
│   │   ├── OptionalFieldsPage.ts
│   │   ├── CustomFieldsPage.ts
│   │   ├── DataImportPage.ts
│   │   ├── ReportingMethodsPage.ts
│   │   ├── TerminationReasonsPage.ts
│   │   ├── PimReportsPage.ts
│   │   ├── LeavePage.ts
│   │   ├── VacanciesPage.ts
│   │   └── CandidatesPage.ts
│   ├── fixtures/         # Custom Playwright fixtures: inject page objects, provide authenticatedTest
│   ├── utils/
│   │   ├── testReport.ts # Step logging + end-of-test summary report + auto console-error check
│   │   ├── createTestEmployee.ts # Shared Add Employee helper, retries on Employee Id collision
│   │   ├── createTestCandidate.ts # Shared Add Candidate helper, extracts id from the POST response body
│   │   └── advanceCandidateStatus.ts # Shared status-transition helpers (shortlist, schedule interview)
│   └── reporters/
│       └── bugListReporter.ts # Custom Playwright reporter: appends failed TCs to docs/Bug-List.xlsx
├── tests/
│   ├── login/            # One module = one folder. Specs are named by test case ID.
│   ├── admin/            # One subfolder per Admin sub-screen (all ~16 sub-screens, incl. Configuration's 8)
│   │   ├── users/                # User Management > Users
│   │   ├── job-titles/           # Admin > Job > Job Titles (incl. file-upload security)
│   │   ├── pay-grades/           # Admin > Job > Pay Grades
│   │   ├── employment-status/    # Admin > Job > Employment Status
│   │   ├── job-categories/       # Admin > Job > Job Categories
│   │   ├── work-shifts/          # Admin > Job > Work Shifts
│   │   ├── corporate-branding/   # Logo/banner upload security (validate-only, no Publish)
│   │   ├── skills/                # Admin > Qualifications > Skills (Name + Description, IDOR)
│   │   ├── education/             # Admin > Qualifications > Education ("Level" field label)
│   │   ├── licenses/              # Admin > Qualifications > Licenses
│   │   ├── languages/             # Admin > Qualifications > Languages
│   │   ├── memberships/           # Admin > Qualifications > Memberships (admin-level master data)
│   │   ├── nationalities/         # Admin > Nationalities (~196 seed records, IDOR)
│   │   ├── general-information/   # Admin > Organization > General Information (single global record, Edit switch)
│   │   ├── locations/             # Admin > Organization > Locations (server-backed Name uniqueness, IDOR)
│   │   ├── structure/             # Admin > Organization > Structure (org chart tree, not a flat list)
│   │   ├── email-configuration/          # Admin > Configuration > Email Configuration (validate-only, global SMTP)
│   │   ├── email-subscriptions/          # Admin > Configuration > Email Subscriptions (fully exercised, restore)
│   │   ├── localization/                 # Admin > Configuration > Localization (validate-only, global UI language)
│   │   ├── language-packages/            # Admin > Configuration > Language Packages (fully exercised, API-verified)
│   │   ├── modules/                       # Admin > Configuration > Modules (validate-only, never clicks Save)
│   │   ├── social-media-authentication/  # Admin > Configuration > Social Media Authentication (validate-only)
│   │   ├── oauth-client/                 # Admin > Configuration > OAuth Client (fully exercised, API-token scope only)
│   │   └── ldap-configuration/           # Admin > Configuration > LDAP Configuration (validate-only, highest risk)
│   ├── pim/              # One subfolder per PIM screen (not flat: each screen has its own specs)
│   │   ├── employee-list/
│   │   ├── add-employee/
│   │   ├── personal-details/
│   │   ├── contact-details/
│   │   ├── job/
│   │   ├── emergency-contacts/
│   │   ├── dependents/
│   │   ├── immigration/
│   │   ├── salary/
│   │   ├── report-to/
│   │   ├── qualifications/
│   │   ├── memberships/
│   │   ├── configuration/        # Optional Fields, Custom Fields, Data Import, Reporting Methods, Termination Reasons
│   │   ├── reports/
│   │   └── security/             # IDOR, clickjacking header
│   ├── recruitment/      # One subfolder per Recruitment screen
│   │   ├── vacancies/
│   │   ├── candidates/
│   │   ├── status-workflow/      # Candidate status state-machine transitions
│   │   └── security/             # IDOR, response headers, rate limiting
│   └── e2e/              # Cross-cutting / not-yet-split specs (PIM smoke test, Leave)
├── docs/                 # Human-readable test case documentation, one file per module
│   ├── TC-Login.txt
│   ├── TC-Admin.txt      # 136 Admin TCs (all ~16 sub-screens): Users, Job Titles, Pay Grades, Employment Status, Job Categories, Work Shifts, Corporate Branding, Skills, Education, Licenses, Languages, Memberships, Nationalities, General Information, Locations, Structure, plus Configuration's 8 (Email Configuration, Email Subscriptions, Localization, Language Packages, Modules, Social Media Authentication, OAuth Client, LDAP Configuration)
│   ├── TC-PIM.txt        # All 161 PIM TCs, full module coverage plus file-upload/IDOR/clickjacking security
│   ├── TC-Recruitment.txt # All 54 Recruitment TCs: Vacancies, Candidates, status workflow, security
│   ├── PIM-Findings-Summary.txt  # Digest of exploration findings across the whole PIM suite
│   ├── TC-Regression-Allure-Guide.txt # How to run a full regression and view the Allure HTML report
│   └── Bug-List.xlsx     # Auto-generated draft bug tracker (created on first test failure)
├── security/              # Source-code-level security scanning of OrangeHRM's own open-source repo
│   ├── scripts/
│   │   ├── scan_orangehrm.py       # SCA/SAST (Snyk), Gitleaks, Trivy -> JSON evidence
│   │   ├── generate_report.py      # JSON -> PDF evidence
│   │   └── requirements.txt
│   ├── evidence/                   # JSON + PDF evidence, one numbered folder per run
│   └── README.md                   # Setup, scope, latest results, ethics note
├── .github/workflows/     # CI pipeline definition
├── playwright.config.ts
├── tsconfig.json
└── eslint.config.js
```

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

**`test` job** (ubuntu-latest): checkout → setup Node 20 → `npm ci` → install Playwright browsers → type-check → lint → run the full Playwright suite (all 3 browsers) → generate the Allure report → upload the Playwright HTML report and the Allure report as artifacts. Runs `if: always()` from the Allure/upload steps onward, so a report is still produced even when some test cases fail (e.g. a confirmed app bug left intentionally failing).

**`publish-report` job**: runs after `test` completes (success or not), only on `main`, and deploys the generated Allure report to GitHub Pages.

**Live report:** **https://arsalwildan15.github.io/qa-portofolio/** — updates automatically after every successful `publish-report` run on `main`. See [docs/TC-Regression-Allure-Guide.txt](docs/TC-Regression-Allure-Guide.txt) for how to generate and view the same report locally.

> **One-time setup note:** `publish-report` needs GitHub Pages enabled with **Source: GitHub Actions** (repo Settings → Pages → Build and deployment). Without that, the job fails with no further configuration possible from the workflow itself.

Set these repository secrets if targeting a non-default environment:
- `BASE_URL`
- `ORANGEHRM_USERNAME`
- `ORANGEHRM_PASSWORD`

## Test Coverage

| Module | Scenarios | Docs |
|--------|-----------|------|
| Login | 43 TCs: positive, negative, boundary, security, edge. 2 confirmed bugs: (1) no rate limiting/lockout after repeated failed logins; (2) missing `X-Frame-Options`/CSP `frame-ancestors` (clickjacking). CSRF and session-fixation checks confirmed effective (no bug) | [docs/TC-Login.txt](docs/TC-Login.txt) |
| Admin | 136 TCs, full module coverage across all ~16 Admin sub-screens, see docs/TC-Admin.txt. Users (6), Job Titles incl. file-upload security (8), Pay Grades (5), Employment Status (5), Job Categories (5), Work Shifts (5), Corporate Branding logo/banner upload security -- validate-only, never clicks "Publish" since it would change the shared demo's global theme (5), Qualifications > Skills incl. a second Description field and a dedicated IDOR TC (8), Education -- confirmed to use a "Level" field label rather than "Name" (5), Licenses (5), Languages (5), Memberships -- admin-level master data, distinct from PIM's employee-level Qualifications/Memberships tabs (5), Nationalities -- confirmed to hold ~196 real seed records with no UI search/filter, so its Add/Delete TCs verify via the API directly rather than scanning table rows (6), Organization > General Information -- a single global record with an Edit switch, every mutating TC restores the original value afterward (6), Locations -- 9 fields with a real server-backed Name-uniqueness check and an edit-form URL with the id directly in the path (IDOR) (9), Structure -- a genuine hierarchical org-chart tree, gated behind an Edit switch (9). Configuration (39 TCs, all 8 sub-screens): a risk-driven methodology classifies each sub-screen by actual blast radius on this shared public demo rather than a blanket rule -- Email Configuration (5), Localization (5), Modules (5), Social Media Authentication (5) and LDAP Configuration (5, the highest-risk screen in the suite, per the app's own data-corruption warning) are all VALIDATE-ONLY: client-side/on-blur validation and (for LDAP) its separate non-mutating "Test Connection" probe are exercised, but Save is never clicked, since a bad write here would change infrastructure shared by every concurrent demo user. Email Subscriptions (5), Language Packages (4) and OAuth Client (5) are FULLY EXERCISED with save-then-restore or add-then-delete, after confirming live they're additive/reversible (OAuth Client in particular registers API/mobile-app token clients, not the browser login page, correcting an initial higher-risk assumption). 2 confirmed bugs in the earlier passes: (1) Job Title's "Job Specification" file upload accepts an executable renamed to `.jpg` (same extension-only validation pattern as PIM/Recruitment, TC-ADMIN-JOBTITLE-07); (2) a freshly-added Organization Structure unit cannot be renamed afterward -- editing it resends its untouched optional `unitId`/`description` fields as `null`, and the server rejects the update with HTTP 422 (TC-ADMIN-STRUCTURE-07). Corporate Branding's logo/banner inputs, by contrast, reject the same renamed-executable payload by attempting to decode it as a real image client-side. IDOR TCs (Skills, Nationalities, Locations) found no multi-tenant boundary to breach -- consistent with this demo's single-admin-role architecture, documented as N/A rather than a false-positive vulnerability, same pattern as TC-RECRUITMENT-SECURITY-01 | [docs/TC-Admin.txt](docs/TC-Admin.txt) |
| PIM | 161 TCs, full module coverage with no open functional gaps: Employee List (14), Add Employee (30), Personal Details + 9 sub-tabs (Contact Details, Job, Emergency Contacts, Dependents, Immigration, Salary, Report-to, Qualifications with all 5 sub-sections, Memberships), Configuration (Optional Fields, Custom Fields, Data Import, Reporting Methods, Termination Reasons), Reports, plus 8 cross-cutting file-upload security TCs, plus 2 IDOR/clickjacking security TCs. Confirmed bugs: (1) extension-only validation lets an executable disguised as a photo through on both profile-photo upload points; (2) missing `X-Frame-Options`/CSP `frame-ancestors` on Employee List -- the **3rd app-wide confirmation** of the same clickjacking gap also found in Login and Recruitment. IDOR on personal-details/salary access confirmed N/A (single-role architecture, same as other modules). Report-to's "Add Supervisor/Subordinate" TCs (3) are a known intermittent UI-verification issue -- the underlying save is confirmed working via its own API-level TC, only the text-match assertion is unreliable | [docs/TC-PIM.txt](docs/TC-PIM.txt) |
| Recruitment | 54 TCs: Vacancies incl. edit/deactivate/pagination/sorting (17), Candidates incl. resume upload/download, list filters (18), candidate status workflow state machine through to terminal "Hired" (14), cross-cutting security: IDOR, response headers, rate limiting, concurrent-write race condition, cross-origin mutation/CSRF (5). **Critical confirmed bug:** the candidate Shortlist endpoint (`PUT .../candidates/<id>/shortlist`) returns a 500 Internal Server Error for every candidate, confirmed reproducible in isolation across 3 separate candidates with the server independently verified healthy each time -- since Shortlist is the earliest status transition and a prerequisite for almost every other status-workflow TC, this one bug cascades into failures across most of that suite. Other confirmed bugs: (1) resume upload accepts an executable disguised as a .pdf, same extension-only validation pattern as PIM; (2) a genuine race condition on the candidate status-transition endpoint -- two mutually-exclusive concurrent status changes (Reject vs. Schedule Interview) on the same candidate can both report success with no server-side locking/versioning; (3) missing `X-Frame-Options` (clickjacking, same app-wide gap as Login/PIM); (4) no rate limiting on candidate creation. Cross-origin mutation (CSRF) on vacancy creation confirmed blocked by CORS (no bug). Plus a documented intermittent client-side rendering bug (Application Stage/Candidate History cards occasionally stuck loading forever with no underlying API error) | [docs/TC-Recruitment.txt](docs/TC-Recruitment.txt) |
| Leave | Submitting without entitlement is correctly blocked (see note below) | N/A |

> **Note on the Leave suite:** the public demo account has no assigned leave entitlement, so a successful application can't be exercised. Instead the test verifies the deterministic behavior that's actually there: an insufficient-balance message once a date range is selected.

## Security Scanning (source code, separate from the E2E suite above)

Besides the functional/DAST-style security TCs already inside `tests/recruitment/security/` (IDOR, response headers, rate limiting, race conditions -- tested against the *running* demo app), `security/` holds a **source-code-level** scan of OrangeHRM's own open-source repository (`github.com/orangehrm/orangehrm`, GPL-3.0): SCA and SAST via Snyk, secret scanning via Gitleaks, and Dockerfile misconfiguration via Trivy.

**Latest results:** SCA 5 Critical/36 High/64 Medium/4 Low, SAST 1 High/11 Medium/175 Low, Gitleaks 358 secret-pattern hits (inspected -- effectively all test fixtures / a known vendored-library false positive, not live credentials), Trivy 1 High/1 Low. Full JSON + PDF evidence and setup instructions: [security/README.md](security/README.md).

## Roadmap

- **OWASP ZAP (on hold):** planned DAST addition, target already decided -- a self-hosted OrangeHRM instance via Docker (built from the already-cloned source, which has its own Dockerfile), not the public demo, to allow a full active scan without any third-party risk. See [security/README.md](security/README.md#planned-next-addition-owasp-zap-on-hold) for the full reasoning.

## License

Private portfolio project.
