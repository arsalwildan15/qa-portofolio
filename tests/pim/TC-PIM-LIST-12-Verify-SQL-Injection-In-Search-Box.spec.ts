/**
 * ================================================================================
 * TC-PIM-LIST-12 — Verify SQL Injection In Search Box
 * Modul    : PIM - Employee List
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-12-Verify-SQL-Injection-In-Search-Box.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di Employee Id search box tidak
 *   membuat server error (5xx) dan tidak membocorkan pesan database.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-LIST-12-Verify-SQL-Injection-In-Search-Box.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

test('TC-PIM-LIST-12: SQL injection payload in search box does not crash the server', async ({
  page,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-LIST-12', 'SQL Injection In Search Box', env.baseURL, page);

  report.step(`Navigate ke Employee List, isi Employee Id = "' OR '1'='1"`);
  await employeeListPage.goto();
  await employeeListPage.employeeIdFilter.fill("' OR '1'='1");

  report.step('Klik Search, verify server tidak crash dan tidak bocor error SQL');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'GET'),
    employeeListPage.search(),
  ]);
  report.check('Response status < 500', resp.status() < 500, `status=${resp.status()}`);
  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  report.check('Body tidak mengandung kata "sql"', !bodyText.includes('sql'));
  report.check('Body tidak mengandung "syntax error"', !bodyText.includes('syntax error'));

  report.print();
});
