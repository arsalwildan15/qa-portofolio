/**
 * ================================================================================
 * TC-LOGIN-21 — Verify SQL Injection In Username Is Rejected
 * Modul    : Login
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-21-Verify-SQL-Injection-In-Username-Is-Rejected.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection klasik pada field username tidak
 *   bypass autentikasi dan tidak membocorkan error database ke client.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-21-Verify-SQL-Injection-In-Username-Is-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-21: SQL injection payload in username is rejected', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-21', 'SQL Injection In Username Is Rejected', env.baseURL, page);

  report.step(`Navigate ke login, fill Username = "' OR '1'='1", Password = "anything", klik Login`);
  await loginPage.goto();
  await loginPage.login("' OR '1'='1", 'anything');

  report.step('Verify login gagal, tetap di halaman login, dan tidak ada error SQL yang bocor');
  report.check('URL tetap "/auth/login"', /auth\/login/.test(page.url()));
  report.check('Error "Invalid credentials" visible', await isVisibleWithWait(loginPage.errorMessage));
  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  report.check('Body tidak mengandung kata "sql"', !bodyText.includes('sql'));
  report.check('Body tidak mengandung "syntax error"', !bodyText.includes('syntax error'));

  report.print();
});
