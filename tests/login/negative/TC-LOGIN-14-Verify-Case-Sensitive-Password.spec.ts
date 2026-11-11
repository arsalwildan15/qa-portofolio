/**
 * ================================================================================
 * TC-LOGIN-14 — Verify Case-Sensitive Password
 * Modul    : Login
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-14-Verify-Case-Sensitive-Password.spec.ts
 * Path     : tests/login/negative/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi password BENAR-BENAR case-sensitive (berbeda dengan
 *   username di TC-LOGIN-13) — membalik huruf pertama saja sudah cukup
 *   membuat login gagal.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/negative/TC-LOGIN-14-Verify-Case-Sensitive-Password.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-LOGIN-14: password is case-sensitive', async ({ page, loginPage }) => {
  const report = new TestReport('TC-LOGIN-14', 'Case-Sensitive Password', env.baseURL, page);

  const flippedCasePassword = env.password.charAt(0).toUpperCase() + env.password.slice(1);

  report.step(`Navigate ke login, fill Password dengan huruf pertama di-flip case: "${flippedCasePassword}"`);
  await loginPage.goto();
  await loginPage.login(env.username, flippedCasePassword);

  report.step('Verify hasil login ditolak');
  report.check('Error "Invalid credentials" visible', await isVisibleWithWait(loginPage.errorMessage));
  report.check(
    'Error berisi "Invalid credentials"',
    (await loginPage.errorMessage.textContent())?.includes('Invalid credentials') ?? false,
  );

  report.print();
});
