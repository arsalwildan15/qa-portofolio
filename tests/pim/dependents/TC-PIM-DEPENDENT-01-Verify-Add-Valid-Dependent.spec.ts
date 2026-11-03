/**
 * ================================================================================
 * TC-PIM-DEPENDENT-01 — Verify Add Valid Dependent
 * Modul    : PIM - Dependents
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DEPENDENT-01-Verify-Add-Valid-Dependent.spec.ts
 * Path     : tests/pim/dependents/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah dependent dengan Name, Relationship, dan Date
 *   of Birth lengkap berhasil tersimpan dan muncul di tabel.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/dependents/TC-PIM-DEPENDENT-01-Verify-Add-Valid-Dependent.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-DEPENDENT-01: add valid dependent succeeds', async ({
  page,
  addEmployeePage,
  dependentsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-DEPENDENT-01', 'Add Valid Dependent', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Dependents');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaDepValid');
  await dependentsPage.goto(empNumber);

  report.step('Klik "+ Add", isi Name, pilih Relationship, isi Date of Birth, klik Save');
  await dependentsPage.addButton.click();
  await dependentsPage.nameInput.waitFor({ state: 'visible' });
  await dependentsPage.nameInput.fill('Little Doe');
  await dependentsPage.selectDropdownOption(dependentsPage.relationshipSelect, 'Child');
  await dependentsPage.dateOfBirthInput.fill('2015-10-05');
  await dependentsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify "Little Doe" muncul di tabel');
  report.check('"Little Doe" muncul di tabel', await isVisibleWithWait(page.getByText('Little Doe')));

  report.print();
});
