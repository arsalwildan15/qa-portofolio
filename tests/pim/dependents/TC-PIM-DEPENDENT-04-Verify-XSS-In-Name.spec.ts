/**
 * ================================================================================
 * TC-PIM-DEPENDENT-04 — Verify XSS In Name
 * Modul    : PIM - Dependents
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DEPENDENT-04-Verify-XSS-In-Name.spec.ts
 * Path     : tests/pim/dependents/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Name dependent tidak pernah tereksekusi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/dependents/TC-PIM-DEPENDENT-04-Verify-XSS-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-DEPENDENT-04: XSS payload in Name is not executed', async ({
  page,
  addEmployeePage,
  dependentsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-DEPENDENT-04', 'XSS In Name', env.baseURL, page);

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step('Buat employee baru, navigate ke Dependents');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaDepXss');
  await dependentsPage.goto(empNumber);

  report.step(`Isi Name = "<script>alert('xss')</script>", Relationship, DOB, klik Save`);
  await dependentsPage.addButton.click();
  await dependentsPage.nameInput.waitFor({ state: 'visible' });
  await dependentsPage.nameInput.fill("<script>alert('xss')</script>");
  await dependentsPage.selectDropdownOption(dependentsPage.relationshipSelect, 'Child');
  await dependentsPage.dateOfBirthInput.fill('2015-10-05');
  await dependentsPage.save();
  await page.reload();
  await page.waitForTimeout(1500);

  report.step('Verify tidak ada dialog alert() yang terpicu');
  report.check('Tidak ada dialog alert() yang terpicu', dialogFired === false);

  report.print();
});
