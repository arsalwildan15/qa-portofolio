/**
 * ================================================================================
 * TC-PIM-IMMIGRATION-07 — Verify Cancel Discards Modal
 * Modul    : PIM - Immigration
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-IMMIGRATION-07-Verify-Cancel-Discards-Modal.spec.ts
 * Path     : tests/pim/immigration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel di modal Add Immigration membatalkan
 *   input — data TIDAK tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/immigration/TC-PIM-IMMIGRATION-07-Verify-Cancel-Discards-Modal.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-IMMIGRATION-07: cancel button discards the modal without saving', async ({
  page,
  addEmployeePage,
  immigrationPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-IMMIGRATION-07', 'Cancel Discards Modal', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Immigration');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaImmCancel');
  await immigrationPage.goto(empNumber);

  report.step('Klik "+ Add", pilih Passport, Number "CANCEL123", klik Cancel');
  await immigrationPage.addButton.click();
  await immigrationPage.passportRadio.waitFor({ state: 'attached' });
  await immigrationPage.clickPassportRadio();
  await immigrationPage.numberInput.fill('CANCEL123');
  await immigrationPage.cancelButton.click();
  await page.waitForTimeout(1000);

  report.step('Verify "CANCEL123" TIDAK muncul di tabel');
  const count = await page.getByText('CANCEL123').count();
  report.check('count("CANCEL123") === 0', count === 0, `count=${count}`);

  report.print();
});
