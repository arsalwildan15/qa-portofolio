# QA Portofolio — OrangeHRM E2E Automation Suite

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
│   ├── config/         # Environment resolution (env.ts) — single source of truth for BASE_URL/credentials
│   ├── types/           # Shared domain types (e.g. NewEmployee)
│   ├── data/            # Test data factories — unique names, collision-free dates
│   ├── pages/            # Page Object Model — one class per screen, barrel-exported via index.ts
│   │   ├── BasePage.ts       # Shared behaviour all page objects inherit
│   │   ├── LoginPage.ts
│   │   ├── DashboardPage.ts
│   │   ├── PimPage.ts
│   │   └── LeavePage.ts
│   ├── fixtures/         # Custom Playwright fixtures — inject page objects, provide authenticatedTest
│   ├── utils/
│   │   └── testReport.ts # Step logging + end-of-test summary report + auto console-error check
│   └── reporters/
│       └── bugListReporter.ts # Custom Playwright reporter — appends failed TCs to docs/Bug-List.xlsx
├── tests/
│   ├── login/            # One module = one folder. Specs are named by test case ID.
│   └── e2e/              # Cross-cutting / not-yet-split specs (PIM, Leave)
├── docs/                 # Human-readable test case documentation, one file per module
│   ├── TC-Login.txt
│   └── Bug-List.xlsx     # Auto-generated draft bug tracker (created on first test failure)
├── .github/workflows/     # CI pipeline definition
├── playwright.config.ts
├── tsconfig.json
└── eslint.config.js
```

**Why this shape:**
- **`pages/`** isolates every selector behind a typed class — a DOM change means editing one file, not every spec that touches that screen.
- **`fixtures/`** wires page objects into Playwright's dependency-injection model (`pages.fixture.ts`) and exposes `authenticatedTest`, so specs that need a logged-in session never duplicate login steps.
- **`config/`** and **`data/`** keep environment concerns and generated test data out of both page objects and specs, so each layer has exactly one reason to change.
- **`tests/<module>/`** mirrors the application's menu structure. Each spec file is named `TC-<MODULE>-<NN>-Verify-<Name>.spec.ts`, one test case per file, tagged by scenario type in its JSDoc header: `(+)` positive, `(-)` negative, `(B)` boundary, `(S)` security, `(!)` edge case.
- **`docs/TC-<Module>.txt`** is the readable counterpart to each `tests/<module>/` folder — same test case IDs, same scenario legend, meant for anyone who wants to review coverage without reading TypeScript.

## Test Execution & Reporting

Every spec file starts with a structured JSDoc header (TC ID, title, module, category, target env, file path, purpose, and a copy-pasteable `RUN COMMAND`), so any single test case can be run and understood in isolation.

At runtime, each test case uses the shared `TestReport` utility (`src/utils/testReport.ts`) instead of raw `expect()` calls:

- **Step-by-step logging** — every action prints `[STEP n] description...` to the console as it happens.
- **End-of-test summary block** — a formatted report (TC ID, env, duration, step count, a numbered ✓/✗ checklist with detail lines, optional findings, a failed-checks recap, and a final `RINGKASAN`/`STATUS PASSED|FAILED` line).
- **Soft assertions** — checks use `expect.soft()`, so one failing check doesn't abort the test; every remaining step and check still runs and gets reported before Playwright marks the test failed.
- **Automatic console-error check** — passing `page` into `TestReport` attaches `page.on('console')`/`page.on('pageerror')` listeners and appends a pass/fail check ("no browser console errors") to every TC's summary, with no per-file wiring needed.
- **API-level verification** — applied to the TCs that are representative of each unique server behavior (status codes, redirect headers, `Set-Cookie`/`HttpOnly`/`Secure`/`SameSite` flags), rather than duplicated across every TC where it wouldn't add new coverage.

Run a single TC with the `RUN COMMAND` from its own file header, e.g.:

```bash
npx playwright test tests/login/TC-LOGIN-01-Verify-Valid-Credentials-Redirect-To-Dashboard.spec.ts --project=chromium --headed
```

> **Note:** the custom reporters (bug list included) are registered in `playwright.config.ts`'s `reporter` array. Overriding it on the CLI with `--reporter=<name>` replaces that whole array, so a bare `npx playwright test` (no `--reporter` flag) is what keeps the bug list reporter active.

## Automatic Bug List (`docs/Bug-List.xlsx`)

Every time a test case **fails**, a custom Playwright reporter (`src/reporters/bugListReporter.ts`) appends one draft row to `docs/Bug-List.xlsx` — same column layout used for manual bug tracking (`Bug ID`, `Summary`, `Category`, `Scope`, `Environment`, `Modul`, `Steps to Reproduce`, `Expected Result`, `Actual Result`, `Priority`, `Attachment`, `Detected On`, `Detected By`, `Status`, `Assigned To`, `Notes`, `Script Test Case`).

What's filled in automatically vs. left for QA review:

| Filled automatically | Left as `[ISI MANUAL]` for QA review |
|---|---|
| Bug ID (auto-incrementing `BG-XXX`), Summary, Category, Scope, Environment, Modul, Steps to Reproduce (from the `[STEP n]` log), Actual Result (from the failing assertion), Attachment (relative path to the auto-captured screenshot/video), Detected On, Detected By, Status (`Open`), Script Test Case | Expected Result, Priority |

The file is created on first failure and only touched when a test fails — a fully green run leaves it untouched. It is **not** a replacement for human triage: Expected Result and Priority require judgment the failure alone can't provide, so they're explicitly flagged rather than guessed.

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
| Login | 40 TCs — positive, negative, boundary, security, edge (see `tests/login/`) | [docs/TC-Login.txt](docs/TC-Login.txt) |
| PIM | Add employee, search with no matching records | — |
| Leave | Submitting without entitlement is correctly blocked (see note below) | — |

> **Note on the Leave suite:** the public OrangeHRM demo account carries no assigned leave entitlement, so a successful leave application cannot be exercised against it. Rather than asserting an outcome the environment can never produce, the test verifies the deterministic, environment-correct behavior instead: the UI reports an insufficient balance once a date range is selected.

## Roadmap

- Security testing (Snyk dependency/code scan, OWASP ZAP baseline scan) — planned once credentials/infra are ready.

## License

Private portfolio project.
