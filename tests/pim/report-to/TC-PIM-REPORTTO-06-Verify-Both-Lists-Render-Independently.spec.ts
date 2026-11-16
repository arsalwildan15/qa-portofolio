/**
 * ================================================================================
 * TC-PIM-REPORTTO-06 — Verify Both Lists Render Independently
 * Modul    : PIM - Report-to
 * Kategori : Positive (+) 1.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTTO-06-Verify-Both-Lists-Render-Independently.spec.ts
 * Path     : tests/pim/report-to/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Supervisor TIDAK ikut muncul di daftar
 *   Subordinates (dan sebaliknya) — kedua list independen, bukan
 *   gabungan.
 *
 * [STATUS: KNOWN ISSUE, 2026-11-11] Sama seperti TC-PIM-REPORTTO-01 -- lihat
 *   catatan lengkap di file itu untuk sisi Supervisors. Sisi Subordinates
 *   (cek jumlah baris = 0) TETAP pakai count() karena nilai 0 konsisten
 *   benar di semua percobaan locator yang dicoba.
 *
 * [PERBAIKAN 17 Nov 2026 -- root cause dibuktikan live] Fitur Report-to BENAR. Dua penyebab kegagalan
 *   ada di skrip: (1) nama dicari dari teks opsi autocomplete yang memuat nama TENGAH ("A8DCo 4Ys 010Z"),
 *   padahal tabel hanya menampilkan nama depan + belakang ("A8DCo 010Z"); (2) jeda tetap 3,5 dtk berpacu
 *   dgn GET daftar yang baru dikirim ~3 dtk setelah POST. Kini nama diambil dari respons POST (record yg
 *   benar2 tersimpan) dlm format tabel, dan TC menunggu GET daftar. BG-124/127/136 diarsip (bukan bug app).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/report-to/TC-PIM-REPORTTO-06-Verify-Both-Lists-Render-Independently.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-REPORTTO-06: adding a supervisor does not populate the subordinates list', async ({
  page,
  addEmployeePage,
  reportToPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PIM-REPORTTO-06', 'Both Lists Render Independently', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Report-to');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaRepIndep');
  await reportToPage.goto(empNumber);

  report.step('Tambah 1 Supervisor (opsi pertama dari pencarian "a")');
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

  report.step('Verify Supervisors berisi 1 baris, Subordinates tetap 0');
  report.check(
    `"${shownName}" (dipilih: "${selectedName}") muncul di Supervisors`,
    await isVisibleWithWait(page.getByText(shownName, { exact: false }).first()),
  );
  // Section order on the Report-to page (verified live): 0 = Assigned Supervisors, 1 = Assigned Subordinates.
  // reportToPage.subordinateRows matches an outer wrapper div that also contains the supervisor card.
  const subordinateCards = await page.locator('.orangehrm-container').nth(1).locator('.oxd-table-card').count();
  const subordinatesApi = ((await (await page.request.get(`/web/index.php/api/v2/pim/employees/${empNumber}/subordinates`)).json()) as { meta: { total: number } }).meta.total;
  report.check('Subordinates tetap 0 baris (tabel Assigned Subordinates & API)', subordinateCards === 0 && subordinatesApi === 0, `tabel=${subordinateCards}, api=${subordinatesApi}`);

  report.print();
});
