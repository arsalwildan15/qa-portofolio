/**
 * ================================================================================
 * TC-PIM-IMMIGRATION-06 — Verify Document Radio Mutually Exclusive
 * Modul    : PIM - Immigration
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-IMMIGRATION-06-Verify-Document-Radio-Mutually-Exclusive.spec.ts
 * Path     : tests/pim/immigration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi radio Document (Passport/Visa) eksklusif — pilih Visa
 *   setelah Passport membuat Passport ter-uncheck. Sama pola dengan
 *   Gender radio di Personal Details (Fase 1): native input tersembunyi
 *   di belakang <span>, WAJIB klik span-nya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/immigration/TC-PIM-IMMIGRATION-06-Verify-Document-Radio-Mutually-Exclusive.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-IMMIGRATION-06: Document radio Passport and Visa are mutually exclusive', async ({
  page,
  addEmployeePage,
  immigrationPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-IMMIGRATION-06', 'Document Radio Mutually Exclusive', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Immigration');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaImmRadio');
  await immigrationPage.goto(empNumber);

  report.step('Klik "+ Add", pilih Passport lalu pilih Visa');
  await immigrationPage.addButton.click();
  await immigrationPage.passportRadio.waitFor({ state: 'attached' });
  await immigrationPage.clickPassportRadio();
  report.check('Passport checked setelah diklik', await immigrationPage.passportRadio.isChecked());

  await immigrationPage.clickVisaRadio();

  report.step('Verify Visa checked dan Passport ter-uncheck');
  report.check('Visa checked', await immigrationPage.visaRadio.isChecked());
  report.check('Passport ter-uncheck', (await immigrationPage.passportRadio.isChecked()) === false);

  report.print();
});
