/**
 * ================================================================================
 * TC-PIM-DEPENDENT-05 — Verify SQL Injection In Name
 * Modul    : PIM - Dependents
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DEPENDENT-05-Verify-SQL-Injection-In-Name.spec.ts
 * Path     : tests/pim/dependents/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di Name dependent tidak membuat
 *   server crash.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/dependents/TC-PIM-DEPENDENT-05-Verify-SQL-Injection-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-DEPENDENT-05: SQL injection in Name does not crash the server', async ({
  page,
  addEmployeePage,
  dependentsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-DEPENDENT-05', 'SQL Injection In Name', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Dependents');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaDepSqli');
  await dependentsPage.goto(empNumber);

  report.step(`Isi Name = "' OR '1'='1", Relationship, DOB, klik Save`);
  await dependentsPage.addButton.click();
  await dependentsPage.nameInput.waitFor({ state: 'visible' });
  await dependentsPage.nameInput.fill("' OR '1'='1");
  await dependentsPage.selectDropdownOption(dependentsPage.relationshipSelect, 'Child');
  await dependentsPage.dateOfBirthInput.fill('2015-10-05');
  let serverErrorStatus: number | null = null;
  page.on('response', (r) => {
    if (r.status() >= 500) serverErrorStatus = r.status();
  });
  await dependentsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify server tidak crash');
  report.check('Tidak ada response 5xx', serverErrorStatus === null, `status=${serverErrorStatus}`);

  report.print();
});
