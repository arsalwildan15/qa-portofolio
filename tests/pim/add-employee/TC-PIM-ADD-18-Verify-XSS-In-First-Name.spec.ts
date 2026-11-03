/**
 * ================================================================================
 * TC-PIM-ADD-18 — Verify XSS In First Name
 * Modul    : PIM - Add Employee
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-18-Verify-XSS-In-First-Name.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di First Name tidak tereksekusi (tidak ada
 *   alert()) dan tidak dirender sebagai <script> hidup di halaman Personal
 *   Details setelah employee berhasil disimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-18-Verify-XSS-In-First-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-ADD-18: XSS payload in First Name is not executed or rendered live', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-18', 'XSS In First Name', env.baseURL, page);
  const { lastName } = uniqueEmployeeName('QaXssName');

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step(`Navigate ke Add Employee, fill First Name = "<script>alert('xss')</script>", Last Name = "${lastName}"`);
  await addEmployeePage.goto();
  await addEmployeePage.fillName("<script>alert('xss')</script>", lastName);

  report.step('Klik Save, verify tidak ada dialog dan script tidak dirender hidup setelah redirect');
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  await page.waitForURL(/viewPersonalDetails/, { timeout: 15_000 }).catch(() => undefined);

  report.check('Tidak ada dialog alert() yang terpicu', dialogFired === false);
  report.check(
    'count(script:has-text("alert")) === 0 di DOM',
    (await page.locator('script:has-text("alert(\'xss\')")').count()) === 0,
  );

  report.print();
});
