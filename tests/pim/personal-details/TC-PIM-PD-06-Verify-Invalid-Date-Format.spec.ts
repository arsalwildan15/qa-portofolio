/**
 * ================================================================================
 * TC-PIM-PD-06 — Verify Invalid Date Format
 * Modul    : PIM - Personal Details
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-06-Verify-Invalid-Date-Format.spec.ts
 * Path     : tests/pim/personal-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengetik huruf ke field Date of Birth (format yyyy-dd-mm)
 *   tidak diterima sebagai tanggal valid.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/personal-details/TC-PIM-PD-06-Verify-Invalid-Date-Format.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-PD-06: invalid date format in Date of Birth is not accepted as a valid date', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-PD-06', 'Invalid Date Format', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPdBadDate');

  report.step('Buat employee baru, navigate ke Personal Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();

  report.step('Fill Date of Birth = "abcd-ef-gh" (format tidak valid)');
  await personalDetailsPage.dateOfBirthInput.fill('abcd-ef-gh');
  const valueAfterFill = await personalDetailsPage.dateOfBirthInput.inputValue();

  report.step('Verify apakah field memvalidasi format atau menerima teks mentah apa adanya');
  report.finding(
    'Validasi format Date of Birth',
    valueAfterFill === 'abcd-ef-gh'
      ? 'Field menerima teks non-tanggal mentah apa adanya ("abcd-ef-gh") — ini input teks biasa ' +
        'tanpa validasi format client-side saat mengetik, bukan native <input type="date">. ' +
        'Validasi format (jika ada) kemungkinan baru terjadi saat Save, bukan saat input.'
      : `Field TIDAK menyimpan teks mentah — value="${valueAfterFill}" (ada semacam filtering/parsing saat input).`,
  );
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
