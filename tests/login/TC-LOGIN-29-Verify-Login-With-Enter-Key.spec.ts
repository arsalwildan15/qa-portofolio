/**
 * ================================================================================
 * TC-LOGIN-29 — Verify Login With Enter Key
 * Modul    : Login
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-29-Verify-Login-With-Enter-Key.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi form login bisa di-submit dengan menekan Enter pada
 *   field password, tanpa klik tombol Login.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-29-Verify-Login-With-Enter-Key.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

test('TC-LOGIN-29: login can be submitted via Enter key', async ({ page, loginPage }) => {
  const report = new TestReport('TC-LOGIN-29', 'Login With Enter Key', env.baseURL, page);

  report.step('Navigate ke login, fill credentials valid, tekan Enter di field password');
  await loginPage.goto();
  await loginPage.submitViaEnterKey(env.username, env.password);

  report.step('Verify login berhasil dan redirect ke dashboard');
  report.check('URL mengandung "/dashboard/index"', /dashboard\/index/.test(page.url()));

  report.print();
});
