/**
 * ================================================================================
 * TC-PIM-ADD-19 — Verify SQL Injection In Name
 * Modul    : PIM - Add Employee
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-19-Verify-SQL-Injection-In-Name.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di First/Last Name tidak membuat
 *   server crash (5xx) dan tidak membocorkan pesan database.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-19-Verify-SQL-Injection-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

test('TC-PIM-ADD-19: SQL injection payload in name does not crash the server', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-19', 'SQL Injection In Name', env.baseURL, page);

  report.step(`Navigate ke Add Employee, fill First Name = "' OR '1'='1", Last Name = "Robert'); DROP TABLE--"`);
  await addEmployeePage.goto();
  await addEmployeePage.fillName("' OR '1'='1", "Robert'); DROP TABLE--");

  report.step('Klik Save, verify server tidak crash dan tidak bocor error SQL');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  report.check('Response status < 500', resp.status() < 500, `status=${resp.status()}`);
  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  report.check('Body tidak mengandung kata "sql"', !bodyText.includes('sql'));
  report.check('Body tidak mengandung "syntax error"', !bodyText.includes('syntax error'));

  report.print();
});
