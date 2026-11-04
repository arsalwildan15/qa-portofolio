# QA Portofolio: OrangeHRM E2E Automation Suite

[![Playwright E2E](https://github.com/arsalwildan15/qa-portofolio/actions/workflows/playwright.yml/badge.svg)](https://github.com/arsalwildan15/qa-portofolio/actions/workflows/playwright.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-1.49-2EAD33?logo=playwright&logoColor=white)
![Allure](https://img.shields.io/badge/Report-Allure-E12C2C)

End-to-end test automation suite for the [OrangeHRM demo application](https://opensource-demo.orangehrmlive.com/), built with **Playwright + TypeScript** following the Page Object Model, with **Allure** reporting and a **GitHub Actions** CI/CD pipeline.

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
│   │   └── LeavePage.ts
│   ├── fixtures/         # Custom Playwright fixtures: inject page objects, provide authenticatedTest
│   ├── utils/
│   │   ├── testReport.ts # Step logging + end-of-test summary report + auto console-error check
│   │   └── createTestEmployee.ts # Shared Add Employee helper, retries on Employee Id collision
│   └── reporters/
│       └── bugListReporter.ts # Custom Playwright reporter: appends failed TCs to docs/Bug-List.xlsx
├── tests/
│   ├── login/            # One module = one folder. Specs are named by test case ID.
│   ├── pim/              # One subfolder per PIM screen (not flat: each screen has its own specs)
│   │   ├── employee-list/        # Phase 1
│   │   ├── add-employee/         # Phase 1
│   │   ├── personal-details/     # Phase 1
│   │   ├── contact-details/      # Phase 2
│   │   ├── job/                  # Phase 2
│   │   ├── emergency-contacts/   # Phase 2
│   │   ├── dependents/           # Phase 2
│   │   ├── immigration/          # Phase 2
│   │   ├── salary/                # Phase 2
│   │   ├── report-to/             # Phase 2
│   │   ├── qualifications/        # Phase 2
│   │   └── memberships/           # Phase 2
│   └── e2e/              # Cross-cutting / not-yet-split specs (PIM smoke test, Leave)
├── docs/                 # Human-readable test case documentation, one file per module
│   ├── TC-Login.txt
│   ├── TC-PIM.txt
│   ├── TC-PIM-Phase2.txt
│   ├── PIM-Findings-Summary.txt  # Cross-phase digest of exploration findings (both PIM phases)
│   └── Bug-List.xlsx     # Auto-generated draft bug tracker (created on first test failure)
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

Every push/PR to `main` runs type-check, lint, and the full Playwright suite on GitHub Actions. The Allure report is published to GitHub Pages on every push to `main`.

Set these repository secrets if targeting a non-default environment:
- `BASE_URL`
- `ORANGEHRM_USERNAME`
- `ORANGEHRM_PASSWORD`

## Test Coverage

| Module | Scenarios | Docs |
|--------|-----------|------|
| Login | 40 TCs: positive, negative, boundary, security, edge | [docs/TC-Login.txt](docs/TC-Login.txt) |
| PIM (Phase 1) | 52 TCs: Employee List (14), Add Employee (26), Personal Details (12) | [docs/TC-PIM.txt](docs/TC-PIM.txt) |
| PIM (Phase 2) | 67 TCs across the remaining 9 Personal Details tabs (Contact Details, Job, Emergency Contacts, Dependents, Immigration, Salary, Report-to, Qualifications, Memberships). Phase 3 (Configuration, Reports) not yet covered. | [docs/TC-PIM-Phase2.txt](docs/TC-PIM-Phase2.txt) |
| Leave | Submitting without entitlement is correctly blocked (see note below) | N/A |

> **Note on the Leave suite:** the public demo account has no assigned leave entitlement, so a successful application can't be exercised. Instead the test verifies the deterministic behavior that's actually there: an insufficient-balance message once a date range is selected.

## Roadmap

- Security testing (Snyk dependency/code scan, OWASP ZAP baseline scan): planned once credentials/infra are ready.

## License

Private portfolio project.
