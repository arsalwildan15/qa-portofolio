/**
 * ================================================================================
 * TC-PIM-DEPENDENT-02 — Verify Empty Submit Validation
 * Modul    : PIM - Dependents
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DEPENDENT-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/pim/dependents/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit modal Add Dependent kosong menampilkan validasi
 *   required dan tidak mengirim request simpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/dependents/TC-PIM-DEPENDENT-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-DEPENDENT-02: empty submit shows required validation', async ({
  page,
  addEmployeePage,
  dependentsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-DEPENDENT-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Dependents');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaDepEmpty');
  await dependentsPage.goto(empNumber);

  let saveRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('dependent')) saveRequestFired = true;
  });

  report.step('Klik "+ Add", langsung klik Save tanpa isi apapun');
  await dependentsPage.addButton.click();
  await dependentsPage.nameInput.waitFor({ state: 'visible' });
  await dependentsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify validasi muncul dan request simpan tidak terkirim');
  const errorCount = await dependentsPage.fieldErrors.count();
  report.check('count(error) > 0', errorCount > 0, `count=${errorCount}`);
  report.check('POST dependent TIDAK terkirim', saveRequestFired === false);

  report.print();
});
