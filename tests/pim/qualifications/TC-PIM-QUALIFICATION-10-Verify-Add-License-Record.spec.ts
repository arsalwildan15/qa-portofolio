/**
 * ================================================================================
 * TC-PIM-QUALIFICATION-10: Verify Add License Record
 * Modul    : PIM - Qualifications
 * Kategori : Positive (+) 1.1-C 1.1-R
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-QUALIFICATION-10-Verify-Add-License-Record.spec.ts
 * Path     : tests/pim/qualifications/
 * ================================================================================
 *
 * TUJUAN:
 *   TC representatif untuk sub-section License (menutup gap yang
 *   didokumentasikan sejak Fase 2, dan sub-section terakhir dari 5
 *   sub-section Qualifications yang sekarang semuanya tercakup).
 *   Memverifikasi menambah License (License Type, License Number, Issued
 *   Date, Expiry Date) berhasil tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/qualifications/TC-PIM-QUALIFICATION-10-Verify-Add-License-Record.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';
import { fillDate } from '../../../src/utils/dateInput';

test('TC-PIM-QUALIFICATION-10: add license record succeeds', async ({
  page,
  addEmployeePage,
  qualificationsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-QUALIFICATION-10', 'Add License Record', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Qualifications');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaQualLicense');
  await qualificationsPage.goto(empNumber);

  report.step('Klik "+ Add" (License), pilih License Type, isi License Number/Issued Date/Expiry Date, klik Save');
  await qualificationsPage.openAddLicense();
  await qualificationsPage.licenseTypeSelect.waitFor({ state: 'visible' });
  await qualificationsPage.licenseTypeSelect.click();
  const firstLicenseOption = page.getByRole('option').nth(1);
  const licenseTypeName = (await firstLicenseOption.textContent())?.trim();
  await firstLicenseOption.click();
  await qualificationsPage.licenseNumberInput.fill('LIC-12345');
  await fillDate(qualificationsPage.issuedDateInput, '2020-15-06', 'yyyy-dd-mm');
  await fillDate(qualificationsPage.expiryDateInput, '2030-15-06', 'yyyy-dd-mm');
  await qualificationsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify License Type yang dipilih muncul di tabel License');
  report.check(
    `License Type "${licenseTypeName}" muncul di tabel`,
    licenseTypeName !== undefined && (await isVisibleWithWait(page.getByText(licenseTypeName ?? '', { exact: false }))),
    `licenseTypeName=${licenseTypeName}`,
  );

  report.print();
});
