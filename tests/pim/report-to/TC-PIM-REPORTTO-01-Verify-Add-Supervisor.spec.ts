/**
 * ================================================================================
 * TC-PIM-REPORTTO-01 — Verify Add Supervisor
 * Modul    : PIM - Report-to
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTTO-01-Verify-Add-Supervisor.spec.ts
 * Path     : tests/pim/report-to/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Supervisor (cari via autocomplete, pilih opsi
 *   pertama, pilih Reporting Method) berhasil tersimpan di Assigned
 *   Supervisors. [TEMUAN] Field Name adalah autocomplete yang me-resolve
 *   ke employee SUNGGUHAN (bukan free text) — butuh wait lebih lama dari
 *   modal "Add" lain karena hasil pencarian async (confirmed live: muncul
 *   "Searching...." dulu sebelum opsi asli muncul). [TEMUAN] Mencari
 *   "Admin" TIDAK PERNAH menemukan hasil — akun login "Admin" rupanya
 *   tidak match nama employee manapun di data demo publik yang sudah
 *   sangat acak (nama user yang login sendiri berganti-ganti:
 *   "Rohit user", "Muhammad Rehman", dst, lihat screenshot sepanjang
 *   sesi ini). Search term diganti ke huruf generik "a" yang pasti
 *   mengembalikan hasil, dan opsi PERTAMA yang muncul dipakai (nama
 *   sebenarnya tidak diprediksi, hanya dipastikan tersimpan).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/report-to/TC-PIM-REPORTTO-01-Verify-Add-Supervisor.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-REPORTTO-01: add supervisor succeeds', async ({
  page,
  addEmployeePage,
  reportToPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PIM-REPORTTO-01', 'Add Supervisor', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Report-to');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaRepSup');
  await reportToPage.goto(empNumber);

  report.step('Klik "+ Add" Supervisors, cari "a", pilih opsi pertama, pilih Reporting Method, klik Save');
  await reportToPage.openAddSupervisor();
  await reportToPage.nameAutocomplete.waitFor({ state: 'visible' });
  await reportToPage.nameAutocomplete.fill('a');
  const firstOption = page.getByRole('option').first();
  await firstOption.waitFor({ state: 'visible', timeout: 25_000 });
  const selectedName = (await firstOption.textContent())?.trim() ?? '';
  await firstOption.click();
  await reportToPage.selectDropdownOption(reportToPage.reportingMethodSelect, 'Direct');
  await reportToPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify Supervisor yang dipilih muncul di Assigned Supervisors');
  report.check(
    `"${selectedName}" muncul di tabel Supervisors`,
    await isVisibleWithWait(page.getByText(selectedName, { exact: false }).first()),
  );

  report.print();
});
