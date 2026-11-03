/**
 * ================================================================================
 * TC-PIM-IMMIGRATION-01 — Verify Add Valid Record
 * Modul    : PIM - Immigration
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-IMMIGRATION-01-Verify-Add-Valid-Record.spec.ts
 * Path     : tests/pim/immigration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah record Immigration (pilih Passport, Number,
 *   Issued/Expiry Date, Eligible Status) berhasil tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/immigration/TC-PIM-IMMIGRATION-01-Verify-Add-Valid-Record.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-IMMIGRATION-01: add valid immigration record succeeds', async ({
  page,
  addEmployeePage,
  immigrationPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-IMMIGRATION-01', 'Add Valid Record', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Immigration');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaImmValid');
  await immigrationPage.goto(empNumber);

  report.step('Klik "+ Add", pilih Passport, isi Number/Issued Date/Expiry Date, klik Save');
  await immigrationPage.addButton.click();
  await immigrationPage.passportRadio.waitFor({ state: 'attached' });
  await immigrationPage.clickPassportRadio();
  await immigrationPage.numberInput.fill('A1234567');
  await immigrationPage.issuedDateInput.fill('2020-01-15');
  await immigrationPage.expiryDateInput.fill('2030-01-15');
  await immigrationPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify "A1234567" muncul di tabel');
  report.check('"A1234567" muncul di tabel', await isVisibleWithWait(page.getByText('A1234567')));

  report.print();
});
