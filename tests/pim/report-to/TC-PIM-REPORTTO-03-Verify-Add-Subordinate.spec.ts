/**
 * ================================================================================
 * TC-PIM-REPORTTO-03 — Verify Add Subordinate
 * Modul    : PIM - Report-to
 * Kategori : Positive (+) 1.1-C 1.4
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
 * [PERBAIKAN 17 Nov 2026 -- root cause dibuktikan live] Fitur Report-to BENAR. Dua penyebab kegagalan
 *   ada di skrip: (1) nama dicari dari teks opsi autocomplete yang memuat nama TENGAH ("A8DCo 4Ys 010Z"),
 *   padahal tabel hanya menampilkan nama depan + belakang ("A8DCo 010Z"); (2) jeda tetap 3,5 dtk berpacu
 *   dgn GET daftar yang baru dikirim ~3 dtk setelah POST. Kini nama diambil dari respons POST (record yg
 *   benar2 tersimpan) dlm format tabel, dan TC menunggu GET daftar. BG-124/127/136 diarsip (bukan bug app).
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
  const listReload = page.waitForResponse((r) => r.url().includes(`/employees/${empNumber}/subordinates?`) && r.request().method() === 'GET', { timeout: 30_000 }).catch(() => null);
  const [saved] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/employees/${empNumber}/subordinates`) && r.request().method() === 'POST', { timeout: 30_000 }),
    reportToPage.save(),
  ]);
  const who = ((await saved.json()) as { data: { subordinate: { firstName: string; lastName: string } } }).data.subordinate;
  // The table shows "first last" without the middle name that the autocomplete option includes.
  const shownName = `${who.firstName} ${who.lastName}`;
  await listReload;
  await page.waitForLoadState('networkidle');

  report.step('Verify Subordinate yang dipilih muncul di Assigned Subordinates');
  report.check(
    `"${shownName}" (dipilih: "${selectedName}") muncul di tabel Subordinates`,
    await isVisibleWithWait(page.getByText(shownName, { exact: false }).first()),
  );

  report.print();
});
