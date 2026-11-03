# QA Portofolio — OrangeHRM E2E Automation Suite

End-to-end test automation suite for the [OrangeHRM demo application](https://opensource-demo.orangehrmlive.com/), built with **Playwright + TypeScript** following the Page Object Model, with **Allure** reporting and a **GitHub Actions** CI/CD pipeline.

## Tech Stack

- [Playwright](https://playwright.dev/) — browser automation (Chromium, Firefox, WebKit)
- TypeScript (strict mode)
- [Allure Report](https://allurereport.org/) — rich, historical test reporting
- ESLint + Prettier — code quality and formatting
- GitHub Actions — CI pipeline with Allure report published to GitHub Pages

## Project Structure

```
src/
  config/     # Environment configuration
  data/       # Test data factories
  fixtures/   # Custom Playwright fixtures (page objects, authenticated session)
  pages/      # Page Object Model classes
tests/
  e2e/        # Test specs, grouped by feature
.github/
  workflows/  # CI pipeline
```

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

| Module | Scenarios |
|--------|-----------|
| Login | Valid login, invalid credentials, empty submission |
| PIM | Add employee, search with no matching records |
| Leave | Apply leave with a valid date range |

## Roadmap

- Security testing (Snyk dependency/code scan, OWASP ZAP baseline scan) — planned once credentials/infra are ready.

## License

Private portfolio project.
