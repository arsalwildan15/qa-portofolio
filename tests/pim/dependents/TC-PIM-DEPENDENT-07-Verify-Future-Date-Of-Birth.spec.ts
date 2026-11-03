/**
 * ================================================================================
 * TC-PIM-DEPENDENT-07 — Verify Future Date Of Birth
 * Modul    : PIM - Dependents
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DEPENDENT-07-Verify-Future-Date-Of-Birth.spec.ts
 * Path     : tests/pim/dependents/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Date of Birth dependent di masa depan (2099) — apakah
 *   ada validasi logis atau diterima begitu saja. Hasil didokumentasikan
 *   sebagai observasi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/dependents/TC-PIM-DEPENDENT-07-Verify-Future-Date-Of-Birth.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-DEPENDENT-07: future date of birth behavior is documented', async ({
  page,
  addEmployeePage,
  dependentsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-DEPENDENT-07', 'Future Date Of Birth', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Dependents');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaDepFuture');
  await dependentsPage.goto(empNumber);

  report.step('Isi Name, Relationship, Date of Birth = "2099-01-01" (masa depan), klik Save');
  await dependentsPage.addButton.click();
  await dependentsPage.nameInput.waitFor({ state: 'visible' });
  await dependentsPage.nameInput.fill('Future Dependent');
  await dependentsPage.selectDropdownOption(dependentsPage.relationshipSelect, 'Child');
  await dependentsPage.dateOfBirthInput.fill('2099-01-01');
  let serverErrorStatus: number | null = null;
  page.on('response', (r) => {
    if (r.status() >= 500) serverErrorStatus = r.status();
  });
  await dependentsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify server tidak crash, catat apakah ada validasi logis tanggal masa depan');
  report.check('Tidak ada response 5xx', serverErrorStatus === null, `status=${serverErrorStatus}`);
  const errorCount = await dependentsPage.fieldErrors.count();
  report.finding(
    'Validasi Date of Birth masa depan',
    errorCount > 0
      ? 'Ada validasi yang menolak tanggal lahir masa depan.'
      : 'Tahun 2099 DITERIMA sebagai Date of Birth tanpa validasi logis — tidak ada pengecekan "tidak boleh di masa depan".',
  );

  report.print();
});
