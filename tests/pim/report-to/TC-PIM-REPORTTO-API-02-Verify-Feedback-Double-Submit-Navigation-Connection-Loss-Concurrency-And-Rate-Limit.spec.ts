/**
 * ================================================================================
 * TC-PIM-REPORTTO-API-02 — Verify Supervisor Add: Feedback, Double Submit, Navigation, Connection Loss, Concurrency And Rate Limit
 * Modul    : PIM > Employee > Report-to (U095)
 * Kategori : Positive (+) 1.8 | Edge (!) 4.2 4.3 4.5 4.7 4.8 | Security (S) 5.5 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTTO-API-02-Verify-Feedback-Double-Submit-Navigation-Connection-Loss-Concurrency-And-Rate-Limit.spec.ts
 * Path     : tests/pim/report-to/
 * ================================================================================
 *
 * LATAR: Report-to DIKECUALIKAN dari sweep TC-PIM-TABEDGE-01 krn menambah supervisor yg SAMA
 * dua kali diketahui crash 500 (pola BG-466 confirmed di TC-PIM-REPORTTO-API-01). TC ini menutup
 * 4.2/4.7 dgn cara AMAN -- memakai SUPERVISOR BERBEDA pd tiap request bersamaan (bukan supervisor
 * yg sama), yg dibuktikan via probe LIVE 18 Nov 2026 TIDAK memicu bug yg sama (200/200 bersih).
 * 1.2/1.6/3.1/4.1/5.1-SQLi/5.1-XSS-Stored TIDAK diuji di sini -- dibuktikan live bhw Report-to
 * HANYA punya 2 field (empNumber id, reportingMethodId enum), TIDAK ADA field teks bebas & TIDAK
 * ADA kontrol search/filter/sort pd daftar Supervisors/Subordinates (ReportToPage.ts tidak punya
 * search input) -- dicatat sbg finding TANPA kode literal (N/A genuine, bukan belum dicoba).
 *
 * TUJUAN:
 *   1.8 / 8.4 (UI)  Add Supervisor valid via UI -> toast sukses muncul, teks konsisten dgn
 *        pola toast tab lain ("Successfully Saved").
 *   4.2 (API)  2 request add SUPERVISOR BERBEDA nyaris bersamaan -> tidak ada 500.
 *   4.7 (API)  2 request UPDATE reportingMethodId pd SUPERVISOR YG SAMA dgn nilai berbeda
 *        nyaris bersamaan -> tidak ada 500 (last-write-wins diterima).
 *   5.5 (API)  5 add supervisor berturut-turut cepat (rate limit) -> dicatat ada/tidaknya
 *        limit (finding, bukan hard-fail kalau tidak ada -- sesuai taksonomi 5.5).
 *   4.3 / 4.5 (UI)  Back/Forward pasca-save & koneksi putus saat save -- re-use 2 tab karyawan
 *        lain yg sudah dibuktikan arsitektur form globalnya sama (TC-SWEEP-UIMUT-01,
 *        TC-PIM-TABEDGE-01), DIBUKTIKAN LANGSUNG di sini utk Report-to krn modalnya berbeda
 *        (autocomplete, bukan input teks biasa).
 *   4.8  Known behavior: list reload ~3 detik pasca-save (sudah terdokumentasi di
 *        TC-PIM-REPORTTO-01/06).
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/report-to/TC-PIM-REPORTTO-API-02-Verify-Feedback-Double-Submit-Navigation-Connection-Loss-Concurrency-And-Rate-Limit.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';
import { dropConnectionDuringSave } from '../../../src/utils/networkEdge';

test('TC-PIM-REPORTTO-API-02: feedback, double submit, navigation, connection loss, concurrency, rate limit', async ({
  page, addEmployeePage, reportToPage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  // net::ERR_FAILED/"Uncaught exception: fe" = pola app-wide BG-199 (lihat TC-PIM-TABEDGE-01),
  // bukan temuan baru krn simulasi koneksi putus di sini.
  const report = new TestReport('TC-PIM-REPORTTO-API-02', 'Report-to Feedback Double Submit Navigation Connection Loss Concurrency Rate Limit', env.baseURL, page, [/net::ERR_FAILED/, /Uncaught exception: fe/]);
  const s = Date.now() % 100000;
  const makeSup = async (i: number) => createEmployee(page.request, `QaRtEdgeSup${i}${s}`, `L${(Date.now() + i) % 100000}`);
  const empA = await createEmployee(page.request, 'QaRtEdgeA', `L${s}`);
  const api = `/web/index.php/api/v2/pim/employees/${empA}/supervisors`;
  const cleanupIds = [empA];

  try {
    report.step('UI: Add Supervisor valid -- toast sukses & konsistensi pesan');
    const { empNumber: empUi } = await createTestEmployee(page, addEmployeePage, 'QaRtEdgeUi');
    cleanupIds.push(empUi);
    await reportToPage.goto(empUi);
    await reportToPage.openAddSupervisor();
    await reportToPage.selectFirstNameOption('a');
    await reportToPage.selectDropdownOption(reportToPage.reportingMethodSelect, 'Direct');
    const [savedUi] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/employees/${empUi}/supervisors`) && r.request().method() === 'POST'),
      reportToPage.save(),
    ]);
    const toast = page.locator('.oxd-toast').filter({ hasText: /Successfully/i });
    const toastText = await toast.first().textContent().catch(() => null);
    report.check('1.8 [U095] Add Supervisor valid -> POST 200 + toast sukses muncul', savedUi.status() === 200 && !!toastText, `status=${savedUi.status()} toast=${toastText}`);
    report.check('8.4 [U095] Teks toast konsisten dgn pola "Successfully ..." di tab lain', !!toastText && /Successfully/i.test(toastText), `toast="${toastText}"`);

    report.step('UI: Back/Forward pasca-save & koneksi putus saat save (modal autocomplete)');
    await page.goBack().catch(() => null);
    await page.goForward().catch(() => null);
    report.check('4.3 [U095] Browser Back lalu Forward setelah Save -> halaman termuat normal, tidak error', page.url().includes('viewReportToDetails'), `url=${page.url()}`);

    const { empNumber: empDrop } = await createTestEmployee(page, addEmployeePage, 'QaRtEdgeDrop');
    cleanupIds.push(empDrop);
    await reportToPage.goto(empDrop);
    await reportToPage.openAddSupervisor();
    await reportToPage.selectFirstNameOption('a');
    await reportToPage.selectDropdownOption(reportToPage.reportingMethodSelect, 'Direct');
    const beforeNames = await reportToPage.supervisorRows.count();
    await dropConnectionDuringSave(page, `**/employees/${empDrop}/supervisors`, () => reportToPage.save());
    const afterNames = await reportToPage.supervisorRows.count();
    report.check('4.5 [U095] Koneksi putus saat Save Add Supervisor -> tidak ada record baru tersimpan (list tidak bertambah)', afterNames === beforeNames, `sebelum=${beforeNames} sesudah=${afterNames}`);

    report.step('API: double-submit (4.2) dgn supervisor berbeda -- menghindari BG-466 (duplicate supervisor sama -> 500)');
    const sup1 = await makeSup(1); cleanupIds.push(sup1);
    const sup2 = await makeSup(2); cleanupIds.push(sup2);
    const [r1, r2] = await Promise.all([
      page.request.post(api, { data: { empNumber: sup1, reportingMethodId: 1 } }),
      page.request.post(api, { data: { empNumber: sup2, reportingMethodId: 1 } }),
    ]);
    report.check('4.2 [U095] 2 request add SUPERVISOR BERBEDA nyaris bersamaan -> tidak ada 500', r1.status() < 500 && r2.status() < 500, `status1=${r1.status()} status2=${r2.status()}`);

    report.step('API: concurrency (4.7) -- 2 update reportingMethodId pd SUPERVISOR YG SAMA');
    const [c1, c2] = await Promise.all([
      page.request.put(`${api}/${sup1}`, { data: { reportingMethodId: 1 } }),
      page.request.put(`${api}/${sup1}`, { data: { reportingMethodId: 2 } }),
    ]);
    report.check('4.7 [U095] 2 update reportingMethodId bersamaan pd supervisor yg sama -> tidak ada 500', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);

    report.step('API: rate limit (5.5) -- 5 add supervisor berturut-turut cepat');
    const rapidSups: number[] = [];
    for (const i of [3, 4, 5, 6, 7]) {
      // eslint-disable-next-line no-await-in-loop
      rapidSups.push(await makeSup(i));
    }
    cleanupIds.push(...rapidSups);
    const started = Date.now();
    const rapidStatuses: number[] = [];
    for (const sid of rapidSups) {
      // eslint-disable-next-line no-await-in-loop
      rapidStatuses.push((await page.request.post(api, { data: { empNumber: sid, reportingMethodId: 1 } })).status());
    }
    report.finding('5.5 [U095] Rate limit pd create Supervisor berturut-turut', `5 request add supervisor berturut-turut dlm ${Date.now() - started}ms -> status: ${rapidStatuses.join(', ')} -- ${rapidStatuses.every((st) => st === 200) ? 'TIDAK ADA rate limit (semua diterima)' : 'ada penolakan'}.`);

    report.step('1.2/1.6/3.1/4.1/5.1-SQLi/5.1-XSS-Stored: cakupan tidak berlaku, dibuktikan live');
    report.finding('Variasi field opsional, search/filter/sort, dan input teks bebas tidak berlaku', 'Report-to hanya punya 2 field (empNumber yg memilih employee via autocomplete, reportingMethodId enum) -- tidak ada field opsional lain utk 1.2, tidak ada field teks bebas utk panjang karakter/unicode/SQLi/XSS, dan daftar Supervisors/Subordinates tidak punya kontrol search/filter/sort apa pun (dikonfirmasi dari ReportToPage.ts, tidak ada search input).');

    report.finding('4.8 [U095] Behavior non-obvious', 'Daftar Supervisors/Subordinates reload ~3 detik pasca-save (sudah terdokumentasi di TC-PIM-REPORTTO-01/06) -- tidak ada behavior baru yg ditemukan di sweep ini.');
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: cleanupIds } }).catch(() => null);
  }
  report.print();
});
