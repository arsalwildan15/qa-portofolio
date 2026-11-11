/**
 * ================================================================================
 * TC-PIM-REPORTTO-03 — Verify Add Subordinate
 * Modul    : PIM - Report-to
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTTO-03-Verify-Add-Subordinate.spec.ts
 * Path     : tests/pim/report-to/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Subordinate (bukan Supervisor — tombol "+ Add"
 *   kedua di halaman) berhasil tersimpan di Assigned Subordinates.
 *
 * [STATUS: KNOWN ISSUE, 2026-11-11] Sama seperti TC-PIM-REPORTTO-01 -- lihat
 *   catatan lengkap di file itu. Save terbukti berfungsi (confirmed via
 *   TC-PIM-REPORTTO-07), verifikasi UI kadang tidak match karena format
 *   teks opsi vs tabel berbeda.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/report-to/TC-PIM-REPORTTO-03-Verify-Add-Subordinate.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-REPORTTO-03: add subordinate succeeds', async ({
  page,
  addEmployeePage,
  reportToPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PIM-REPORTTO-03', 'Add Subordinate', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Report-to');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaRepSub');
  await reportToPage.goto(empNumber);

  report.step('Klik "+ Add" Subordinates (tombol ke-2), cari "a", pilih opsi pertama, Reporting Method, klik Save');
  await reportToPage.openAddSubordinate();
  const selectedName = await reportToPage.selectFirstNameOption('a');
  await reportToPage.selectDropdownOption(reportToPage.reportingMethodSelect, 'Direct');
  await reportToPage.save();
  await page.waitForTimeout(3500);

  report.step('Verify Subordinate yang dipilih muncul di Assigned Subordinates');
  report.check(
    `"${selectedName}" muncul di tabel Subordinates`,
    await isVisibleWithWait(page.getByText(selectedName, { exact: false }).first()),
  );

  report.print();
});
