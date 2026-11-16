/**
 * ================================================================================
 * TC-PIM-REPORTTO-01 — Verify Add Supervisor
 * Modul    : PIM - Report-to
 * Kategori : Positive (+) 1.1-C 1.4
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
 * [STATUS: KNOWN ISSUE, 2026-11-11] TC ini UNRELIABLE secara intermiten karena
 *   mismatch format teks: textContent opsi autocomplete menyertakan segmen
 *   tengah (mis. "A8DCo 4Ys 010Z") yang TIDAK selalu identik dengan cell
 *   tabel (mis. "A8DCo 010Z", tanpa "4Ys"), jadi getByText(selectedName)
 *   kadang tidak match walau data TERBUKTI tersimpan benar (dikonfirmasi
 *   via POST .../supervisors -> 200 nyata di TC-PIM-REPORTTO-07, dan via
 *   page snapshot DOM yang menunjukkan row ADA). 4 percobaan perbaikan
 *   locator (table-index, tbody tr, role-based) SEMUA gagal/meregresi TC
 *   lain yang tadinya PASS — dikembalikan ke pendekatan original ini.
 *   Fitur Report-to SENDIRI bekerja benar; ini murni keterbatasan cara
 *   verifikasi UI, perlu investigasi lebih lanjut di sesi lain (lihat
 *   docs/QA-Review-Progress.md untuk riwayat lengkap 4 percobaan).
 *
 * [PERBAIKAN 17 Nov 2026 -- root cause dibuktikan live] Fitur Report-to BENAR. Dua penyebab kegagalan
 *   ada di skrip: (1) nama dicari dari teks opsi autocomplete yang memuat nama TENGAH ("A8DCo 4Ys 010Z"),
 *   padahal tabel hanya menampilkan nama depan + belakang ("A8DCo 010Z"); (2) jeda tetap 3,5 dtk berpacu
 *   dgn GET daftar yang baru dikirim ~3 dtk setelah POST. Kini nama diambil dari respons POST (record yg
 *   benar2 tersimpan) dlm format tabel, dan TC menunggu GET daftar. BG-124/127/136 diarsip (bukan bug app).
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
  const selectedName = await reportToPage.selectFirstNameOption('a');
  await reportToPage.selectDropdownOption(reportToPage.reportingMethodSelect, 'Direct');
  const listReload = page.waitForResponse((r) => r.url().includes(`/employees/${empNumber}/supervisors?`) && r.request().method() === 'GET', { timeout: 30_000 }).catch(() => null);
  const [saved] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/employees/${empNumber}/supervisors`) && r.request().method() === 'POST', { timeout: 30_000 }),
    reportToPage.save(),
  ]);
  const who = ((await saved.json()) as { data: { supervisor: { firstName: string; lastName: string } } }).data.supervisor;
  // The table shows "first last" without the middle name that the autocomplete option includes.
  const shownName = `${who.firstName} ${who.lastName}`;
  await listReload;
  await page.waitForLoadState('networkidle');

  report.step('Verify Supervisor yang dipilih muncul di Assigned Supervisors');
  report.check(
    `"${shownName}" (dipilih: "${selectedName}") muncul di tabel Supervisors`,
    await isVisibleWithWait(page.getByText(shownName, { exact: false }).first()),
  );

  report.print();
});
