/**
 * ================================================================================
 * TC-PIM-DEPENDENT-03 — Verify Name Very Long Text
 * Modul    : PIM - Dependents
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DEPENDENT-03-Verify-Name-Very-Long-Text.spec.ts
 * Path     : tests/pim/dependents/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Name dependent dengan 300 karakter tidak membuat server
 *   crash.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/dependents/TC-PIM-DEPENDENT-03-Verify-Name-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-DEPENDENT-03: name with 300 characters does not crash the server', async ({
  page,
  addEmployeePage,
  dependentsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-DEPENDENT-03', 'Name Very Long Text', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Dependents');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaDepLong');
  await dependentsPage.goto(empNumber);

  report.step('Isi Name = 300x "a", Relationship, Date of Birth, klik Save');
  await dependentsPage.addButton.click();
  await dependentsPage.nameInput.waitFor({ state: 'visible' });
  await dependentsPage.nameInput.fill('a'.repeat(300));
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
