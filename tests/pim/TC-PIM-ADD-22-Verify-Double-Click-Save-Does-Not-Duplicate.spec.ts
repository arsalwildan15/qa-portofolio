/**
 * ================================================================================
 * TC-PIM-ADD-22 — Verify Double Click Save Does Not Duplicate
 * Modul    : PIM - Add Employee
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-22-Verify-Double-Click-Save-Does-Not-Duplicate.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi double-click tombol Save tidak membuat 2 employee
 *   terpisah (tidak ada duplicate POST /api/v2/pim/employees).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-22-Verify-Double-Click-Save-Does-Not-Duplicate.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

test('TC-PIM-ADD-22: double-clicking Save sends at most one POST', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-22', 'Double Click Save Does Not Duplicate', env.baseURL, page);
  const employee = uniqueEmployeeName('QaDblClick');

  report.step('Navigate ke Add Employee, fill nama');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);

  let postCount = 0;
  page.on('request', (req) => {
    if (req.url().includes('/api/v2/pim/employees') && req.method() === 'POST') postCount += 1;
  });

  report.step('Double-click tombol Save');
  await addEmployeePage.saveButton.dblclick();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1000);

  report.step('Verify hanya ADA maksimal 1 POST yang benar-benar membuat employee');
  report.check('postCount <= 1', postCount <= 1, `postCount=${postCount}`);

  report.print();
});
