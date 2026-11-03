/**
 * ================================================================================
 * TC-PIM-IMMIGRATION-02 — Verify Empty Submit Validation
 * Modul    : PIM - Immigration
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-IMMIGRATION-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/pim/immigration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit modal Add Immigration kosong menampilkan TEPAT
 *   1 pesan "Required" (untuk pilihan Document Passport/Visa, satu-
 *   satunya field wajib — dikonfirmasi langsung), request simpan tidak
 *   terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/immigration/TC-PIM-IMMIGRATION-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-IMMIGRATION-02: empty submit shows exactly one required error', async ({
  page,
  addEmployeePage,
  immigrationPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-IMMIGRATION-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Immigration');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaImmEmpty');
  await immigrationPage.goto(empNumber);

  let saveRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('immigration')) saveRequestFired = true;
  });

  report.step('Klik "+ Add", langsung klik Save tanpa isi apapun');
  await immigrationPage.addButton.click();
  await immigrationPage.passportRadio.waitFor({ state: 'attached' });
  await immigrationPage.save();
  await page.waitForTimeout(800);

  report.step('Verify 1 pesan "Required" muncul dan save tidak terkirim');
  const errors = await immigrationPage.fieldErrors.allTextContents();
  report.check('count(error) === 1', errors.length === 1, `errors=${JSON.stringify(errors)}`);
  report.check('POST immigration TIDAK terkirim', saveRequestFired === false);

  report.print();
});
