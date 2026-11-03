/**
 * ================================================================================
 * TC-LOGIN-22 — Verify SQL Injection In Password Is Rejected
 * Modul    : Login
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-22-Verify-SQL-Injection-In-Password-Is-Rejected.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection pada field password tidak bypass
 *   autentikasi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-22-Verify-SQL-Injection-In-Password-Is-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-22: SQL injection payload in password is rejected', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-22', 'SQL Injection In Password Is Rejected', env.baseURL, page);

  report.step(`Navigate ke login, fill Username valid, Password = "' OR '1'='1' --", klik Login`);
  await loginPage.goto();
  await loginPage.login(env.username, "' OR '1'='1' --");

  report.step('Verify login gagal dan tetap di halaman login');
  report.check('URL tetap "/auth/login"', /auth\/login/.test(page.url()));
  report.check('Error "Invalid credentials" visible', await isVisibleWithWait(loginPage.errorMessage));

  report.print();
});
