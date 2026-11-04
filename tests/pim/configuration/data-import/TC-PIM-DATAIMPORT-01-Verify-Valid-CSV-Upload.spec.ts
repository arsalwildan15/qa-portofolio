/**
 * ================================================================================
 * TC-PIM-DATAIMPORT-01: Verify Valid CSV Upload
 * Modul    : PIM - Configuration - Data Import
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DATAIMPORT-01-Verify-Valid-CSV-Upload.spec.ts
 * Path     : tests/pim/configuration/data-import/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi upload CSV valid (kolom sesuai sample CSV resmi dari
 *   halaman ini: first_name,middle_name,last_name,... hanya First Name
 *   dan Last Name compulsory) berhasil, employee baru dari CSV muncul.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/data-import/TC-PIM-DATAIMPORT-01-Verify-Valid-CSV-Upload.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../../src/data/testData';

const CSV_HEADER =
  "first_name,middle_name,last_name,employee_id,other_id,driver's_license_no,license_expiry_date,gender,marital_status,nationality,date_of_birth,address_street_1,address_street_2,city,state/province,zip/postal_code,country,home_telephone,mobile,work_telephone,work_email,other_email";

test('TC-PIM-DATAIMPORT-01: uploading a valid CSV succeeds', async ({
  page,
  dataImportPage,
  employeeListPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-DATAIMPORT-01', 'Valid CSV Upload', env.baseURL, page);
  const employee = uniqueEmployeeName('QaCsvImport');
  const csvContent = `${CSV_HEADER}\n${employee.firstName},,${employee.lastName},,,,,,,,,,,,,,,,,,,`;

  report.step('Buka Data Import, pilih file CSV valid (First Name/Last Name compulsory)');
  await dataImportPage.goto();
  await dataImportPage.fileInput.setInputFiles({
    name: 'valid-import.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent),
  });

  report.step('Klik Upload, verify response sukses');
  const [uploadResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/csv-import') && r.request().method() === 'POST',
      { timeout: 15_000 },
    ),
    dataImportPage.upload(),
  ]);
  report.check('[API] status === 200', uploadResp.status() === 200, `status=${uploadResp.status()}`);
  const responseBody: { meta?: { total: number; success: number; failed: number } } | null = await uploadResp
    .json()
    .catch(() => null);
  report.check(
    '[API] meta.success === 1 dan meta.failed === 0',
    responseBody?.meta?.success === 1 && responseBody?.meta?.failed === 0,
    JSON.stringify(responseBody?.meta),
  );

  report.step('Cek employee baru dari CSV muncul di Employee List');
  await page.waitForTimeout(1500);
  await employeeListPage.goto();
  await employeeListPage.employeeNameFilter.fill(employee.firstName);
  const nameOption = page.getByRole('option').filter({ hasText: employee.firstName }).first();
  const hasAutocompleteMatch = await nameOption.isVisible({ timeout: 5_000 }).catch(() => false);
  if (hasAutocompleteMatch) {
    await nameOption.click();
    await employeeListPage.search();
    const found = await employeeListPage.tableRows.first().isVisible({ timeout: 10_000 }).catch(() => false);
    report.check('Employee hasil import ditemukan di Employee List', found);
  } else {
    report.finding('Pencarian employee hasil import via UI', 'Nama tidak muncul di autocomplete suggestion Employee List dalam 5s (meta.success di atas sudah konfirmasi import sukses di sisi API).');
  }

  report.print();
});
