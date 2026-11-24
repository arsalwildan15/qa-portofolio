/**
 * ================================================================================
 * TC-TIME-TIMESHEET-12 — Verify My Timesheet (ESS): Feedback, Double-Click Save/Submit, Refresh/Back Without Save, Lost Session, And Reflected XSS
 * Modul    : Time > Timesheets > My Timesheet (ESS self-service) (U055)
 * Kategori : Positive (+) 1.1-U 1.3 1.8 | Edge (!) 4.2 4.3 4.5 | Security (S) 5.1-XSS-Reflected
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TIMESHEET-12-Verify-My-Timesheet-Feedback-Double-Submit-Navigation-Session-And-Reflected-XSS.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * LATAR (probe LIVE 24 Nov 2026, via tests/zz-probe-timesheet-myts.spec.ts, SUDAH DIHAPUS):
 * My Timesheet (ESS self-service) pakai endpoint TERPISAH dari Admin: GET time/timesheets/default
 * (tanpa id -- selalu timesheet periode berjalan milik sesi aktif), PUT time/timesheets/<id>/entries
 * {entries,deletedEntries} (UPSERT per project+activity -- dikonfirmasi ULANG di sini, konsisten
 * dgn fakta yg sudah diketahui dari TC-TIME-TIMESHEET-04/11: klik ganda Save TIDAK membuat baris
 * duplikat, beda dgn pola double-submit bug di modul lain spt BG-427/475/483/486/487), PUT
 * time/timesheets/<id> {action:'SUBMIT'}. Setelah Save, app melakukan self-redirect ke
 * time/viewMyTimesheet?startDate=<yyyy-mm-dd> -- query param INI yg diuji utk reflected XSS (bukan
 * param "date" di GET API, yg sudah divalidasi server 422 utk payload non-tanggal).
 *
 * TUJUAN:
 *   1.1-U / 1.8  Edit -> isi Project+Activity+jam pada baris pertama -> Save -> PUT entries 200,
 *          toast "Successfully Saved".
 *   4.2    klik ganda Save -> PUT terkirim >1x tapi TETAP SATU baris (upsert), nilai akhir = nilai
 *          terakhir yg diketik (tidak ada korupsi/duplikat).
 *   4.3    ubah jam HARI LAIN lalu refresh / browser back TANPA Save -> hari itu tidak pernah
 *          tersimpan (tidak muncul di entries API).
 *   4.5    sesi berakhir lalu Save -> PUT 401, dialihkan ke login, hari yg diedit tidak tersimpan.
 *   5.1-XSS-Reflected  payload <img onerror> di query param startDate (URL hasil self-redirect
 *          Save) -> dibuka langsung, TIDAK ter-eksekusi (tidak ada elemen tersuntik/dialog); app
 *          menangani tanggal tak valid scr graceful ("No Timesheets Found" + "Create Timesheet"),
 *          tidak crash. Payload yg sama di parameter "date" GET API -> 422 ditolak, tidak reflected
 *          mentah di body.
 *   1.3    Submit -> status transisi "Not Submitted" -> "Submitted" (PUT 200).
 *   4.2    klik ganda Submit (akun ESS terpisah) -> HANYA 1 PUT submit terkirim (tombol Submit
 *          hilang/disabled sesudah klik pertama -- kontras positif dgn Save yg mengandalkan
 *          upsert-safety, bukan structural guard).
 *   4.5    sesi berakhir lalu Submit (akun ESS terpisah lagi) -> PUT 401, dialihkan ke login,
 *          status tetap "Not Submitted".
 *
 * HASIL 24 Nov 2026: lolos penuh via probe (3 akun ESS terisolasi utk tiap skenario destruktif/
 * terminal), tidak ada bug baru -- menutup U055 My Timesheet lapis UI feedback/double-submit/
 * navigasi/sesi/XSS-reflected.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TIMESHEET-12-Verify-My-Timesheet-Feedback-Double-Submit-Navigation-Session-And-Reflected-XSS.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { MyTimesheetPage } from '../../../src/pages';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';
import { getEssTimesheetEntries } from '../../../src/utils/createEssTimesheet';
import { API } from '../../../src/utils/timeData';

async function essDefault(essPage: import('@playwright/test').Page): Promise<{ id: number; startDate: string; status: string }> {
  const body = await (await essPage.request.get(`${API}time/timesheets/default`)).json();
  return { id: body.data.id, startDate: body.data.startDate, status: body.data.status?.id };
}

/**
 * [BUG SCRIPT, diperbaiki] fillFirstRow() kadang jatuh ke candidate project KEDUA (mis. "Apache")
 * krn autocomplete ACME belum selesai di-500ms check pertama -- tapi lalu memilih Activity dari
 * dropdown yg stale (sisa render project SEBELUMNYA), menghasilkan pasangan project+activity yg
 * tidak valid server-side -> Save 422. Dibuktikan live 24 Nov 2026 (2 dari 4 percobaan). Retry
 * dgn edit mode BARU (bukan dblclick) mereset dropdown dari awal & terbukti menghilangkan race ini.
 */
async function fillRowAndSave(
  myPage: MyTimesheetPage,
  essPage: import('@playwright/test').Page,
  candidates: string[],
  duration: string,
): Promise<{ resp: import('@playwright/test').Response | null; row: { project: string; activity: string } }> {
  let lastRow: { project: string; activity: string } = { project: '', activity: '' };
  for (let attempt = 1; attempt <= 3; attempt++) {
    await myPage.startEdit();
    lastRow = await myPage.fillFirstRow(candidates);
    await myPage.fillDuration(0, duration);
    const resp = await myPage.save();
    if (resp?.status() === 200) return { resp, row: lastRow };
    await myPage.goto();
    await essPage.waitForLoadState('networkidle').catch(() => {});
  }
  return { resp: null, row: lastRow };
}

test('TC-TIME-TIMESHEET-12: My Timesheet (ESS) - feedback, double-submit, navigation, session, reflected XSS', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  // 300s, not 240s: 3 akun ESS dibuat berurutan (createEssAccount via Add Employee POST
  // kadang >60s saat demo publik terdegradasi) + banyak langkah navigasi/API -- total durasi
  // historis 2-4 menit, tapi pernah mepet 240s saat demo lambat (teardown context di tengah
  // panggilan cookies() menyebabkan error palsu "Failed to find browser context").
  testInfo.setTimeout(300_000);
  // Expired-session redirect noise is its own app-wide bug (TC-XMOD-07); excluded here.
  const report = new TestReport('TC-TIME-TIMESHEET-12', 'My Timesheet Feedback DoubleSubmit Navigation Session ReflectedXSS', env.baseURL, page, [/status of 401/, /reading 'response'/]);

  report.step('[Setup] ESS A - Save/double-save/refresh/back/sesi-habis-saat-save');
  const essA = await createEssAccount(page, addEmployeePage, 'QaTsMyts');
  const { page: a, close: closeA } = await loginAs(browser, essA.username, essA.password);
  const myA = new MyTimesheetPage(a);
  await myA.goto();
  await a.waitForLoadState('networkidle').catch(() => {});
  const defA = await essDefault(a);
  report.check('[Setup] Status awal "Not Submitted"', defA.status === 'NOT SUBMITTED', `status=${defA.status}`);

  report.step('1.1-U / 1.8 Isi Project+Activity+jam Senin, Save, feedback');
  const { resp: saveResp, row } = await fillRowAndSave(myA, a, ['ACME', 'Apache', 'Coca-Cola', 'Fresh Books', 'FreeWave'], '2:00');
  await a.waitForTimeout(1_000);
  const toastSave = await a.locator('.oxd-toast').first().innerText({ timeout: 8_000 }).catch(() => '');
  report.check('1.1-U / 1.8 Save -> PUT entries 200 & toast "Successfully Saved"', saveResp?.status() === 200 && /Successfully Saved/.test(toastSave), `status=${saveResp?.status()} toast=${toastSave.replace(/\s+/g, ' ')} project/activity=${JSON.stringify(row)}`);

  report.step('4.2 Klik ganda Save -> tetap satu baris, nilai akhir konsisten');
  await a.waitForURL(/viewMyTimesheet/, { timeout: 15_000 }).catch(() => {});
  await myA.startEdit();
  let putCount = 0;
  const onResp = (r: { url(): string; request(): { method(): string } }) => { if (r.url().includes('/entries') && r.request().method() === 'PUT') putCount += 1; };
  a.on('response', onResp);
  await myA.fillDuration(0, '3:00');
  await myA.saveButton.dblclick();
  await a.waitForTimeout(2_500);
  a.off('response', onResp);
  await a.waitForURL(/viewMyTimesheet/, { timeout: 15_000 }).catch(() => {});
  await a.waitForLoadState('networkidle').catch(() => {});
  const entriesAfterDbl = await getEssTimesheetEntries(a, defA.id);
  report.check('4.2 Klik ganda Save -> PUT terkirim, TEPAT satu baris, nilai akhir = nilai terakhir diketik (tidak duplikat/korupsi)', putCount >= 1 && entriesAfterDbl?.data.length === 1 && entriesAfterDbl.data[0]?.total.label === '03:00', `PUT=${putCount} baris=${entriesAfterDbl?.data.length} total=${entriesAfterDbl?.data[0]?.total.label}`);
  report.finding('4.2 Double-submit Save pada timesheet entries AMAN secara desain', 'PUT entries bersifat UPSERT per (project, activity) di server -- berbeda dari pola double-submit bug app-wide (BG-427/475/483/486/487) yg terjadi pada endpoint CREATE murni; dikonfirmasi ulang di sini pada My Timesheet ESS, konsisten dgn TC-TIME-TIMESHEET-04/11.');

  report.step('4.3 Ubah jam Selasa lalu refresh TANPA Save');
  await myA.startEdit();
  await myA.fillDuration(1, '5:00');
  try {
    await a.reload();
  } catch (error) {
    if (error instanceof Error && error.message.includes('ERR_ABORTED')) {
      await a.waitForTimeout(1_500);
      await a.reload();
    } else {
      throw error;
    }
  }
  await a.waitForLoadState('networkidle').catch(() => {});
  const entriesAfterRefresh = await getEssTimesheetEntries(a, defA.id);
  const tueDateA = addDaysIso(defA.startDate, 1);
  report.check('4.3 Refresh tanpa Save -> Selasa (belum disimpan) TIDAK muncul di entries API', entriesAfterRefresh?.data[0]?.dates[tueDateA] === undefined, `dates=${JSON.stringify(entriesAfterRefresh?.data[0]?.dates)}`);

  report.step('4.3 Ubah jam Rabu lalu browser back TANPA Save');
  await myA.goto();
  await myA.startEdit();
  await myA.fillDuration(2, '6:00');
  await a.goBack();
  await a.waitForLoadState('networkidle').catch(() => {});
  const entriesAfterBack = await getEssTimesheetEntries(a, defA.id);
  const wedDateA = addDaysIso(defA.startDate, 2);
  report.check('4.3 Browser back tanpa Save -> Rabu (belum disimpan) TIDAK muncul di entries API, state tidak rusak', entriesAfterBack?.data[0]?.dates[wedDateA] === undefined && entriesAfterBack?.data.length === 1, `dates=${JSON.stringify(entriesAfterBack?.data[0]?.dates)}`);

  report.step('4.5 Sesi berakhir sebelum Save');
  await myA.goto();
  await myA.startEdit();
  await myA.fillDuration(3, '4:00');
  const cookiesA = await a.context().cookies();
  await a.context().clearCookies();
  const sessSavePromise = a.waitForResponse((r) => r.url().includes('/entries') && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
  await myA.saveButton.click();
  const toLoginA = await a.waitForURL(/auth\/login/, { timeout: 20_000 }).then(() => true, () => false);
  const sessResp = await sessSavePromise;
  await a.context().addCookies(cookiesA);
  const entriesAfterSess = await getEssTimesheetEntries(a, defA.id);
  const thuDateA = addDaysIso(defA.startDate, 3);
  report.check('4.5 Sesi berakhir lalu Save -> PUT 401, dialihkan ke login, Kamis tidak tersimpan', sessResp?.status() === 401 && toLoginA && entriesAfterSess?.data[0]?.dates[thuDateA] === undefined, `PUT=${sessResp?.status()} login=${toLoginA}`);

  report.step('5.1-XSS-Reflected Query param startDate (hasil self-redirect Save)');
  const dialogsA: string[] = [];
  a.on('dialog', async (d) => { dialogsA.push(d.message()); await d.dismiss(); });
  await a.goto('/web/index.php/time/viewMyTimesheet?startDate=%3Cimg%20src=x%20onerror=alert(1)%3E');
  await a.waitForTimeout(1_500);
  const injectedImg = await a.locator('img[src="x"]').count();
  const noTimesheetState = await a.getByText('No Timesheets Found').isVisible().catch(() => false);
  report.check('5.1-XSS-Reflected Payload <img onerror> di param startDate -> TIDAK ter-eksekusi (tanpa elemen tersuntik/dialog), ditangani graceful ("No Timesheets Found")', injectedImg === 0 && dialogsA.length === 0 && noTimesheetState, `img=${injectedImg} dialog=${dialogsA.length} graceful=${noTimesheetState}`);

  report.step('5.1-XSS-Reflected Param "date" langsung ke API');
  const apiXss = await a.request.get(`${API}time/timesheets/default?date=%3Cscript%3Ealert(1)%3C/script%3E`);
  const apiXssBody = await apiXss.text();
  report.check('5.1-XSS-Reflected Payload <script> di param "date" API -> 4xx ditolak, tidak reflected mentah di body', apiXss.status() >= 400 && apiXss.status() < 500 && !apiXssBody.includes('<script>'), `status=${apiXss.status()}`);

  report.step('1.3 Submit -> status Not Submitted -> Submitted');
  await myA.goto();
  await a.waitForLoadState('networkidle').catch(() => {});
  const submitBtnA = a.getByRole('button', { name: 'Submit' });
  await submitBtnA.waitFor({ state: 'visible', timeout: 15_000 });
  const submitRespPromise = a.waitForResponse((r) => /\/api\/v2\/time\/timesheets\/\d+$/.test(r.url()) && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
  await submitBtnA.click();
  const submitResp = await submitRespPromise;
  const submitBody = await submitResp?.json().catch(() => null);
  report.check('1.3 Submit -> PUT 200, status id "SUBMITTED"', submitResp?.status() === 200 && submitBody?.data?.status?.id === 'SUBMITTED', `status=${submitResp?.status()} body=${JSON.stringify(submitBody?.data?.status)}`);
  await closeA();

  report.step('[Setup] ESS B - klik ganda Submit');
  const essB = await createEssAccount(page, addEmployeePage, 'QaTsMytsB');
  const { page: b, close: closeB } = await loginAs(browser, essB.username, essB.password);
  const myB = new MyTimesheetPage(b);
  await myB.goto();
  await b.waitForLoadState('networkidle').catch(() => {});
  const { resp: saveRespB } = await fillRowAndSave(myB, b, ['ACME', 'Apache', 'Coca-Cola', 'Fresh Books', 'FreeWave'], '1:00');
  report.check('[Setup] ESS B - Save awal berhasil (200) sblm uji double-submit Submit', saveRespB?.status() === 200, `status=${saveRespB?.status()}`);
  await b.waitForURL(/viewMyTimesheet/, { timeout: 15_000 }).catch(() => {});
  await b.waitForLoadState('networkidle').catch(() => {});

  report.step('4.2 Klik ganda Submit');
  let submitPutCount = 0;
  const onSubmitResp = (r: { url(): string; request(): { method(): string } }) => { if (/\/api\/v2\/time\/timesheets\/\d+$/.test(r.url()) && r.request().method() === 'PUT') submitPutCount += 1; };
  b.on('response', onSubmitResp);
  const submitBtnB = b.getByRole('button', { name: 'Submit' });
  await submitBtnB.waitFor({ state: 'visible', timeout: 15_000 });
  await submitBtnB.dblclick();
  await b.waitForTimeout(3_000);
  b.off('response', onSubmitResp);
  const statusAfterDblB = await essDefault(b);
  report.check('4.2 Klik ganda Submit -> HANYA 1 PUT terkirim, status akhir "SUBMITTED" tanpa error (tombol hilang/disabled sesudah klik pertama)', submitPutCount === 1 && statusAfterDblB.status === 'SUBMITTED', `PUT=${submitPutCount} status=${statusAfterDblB.status}`);
  report.finding('4.2 Submit TERLINDUNGI secara struktural dari double-submit', 'Berbeda dgn Save (upsert-safe tapi tetap mengirim 2 PUT saat di-dblclick), tombol Submit hilang/disabled sesudah klik pertama -- HANYA 1 PUT submit terkirim meski di-dblclick, kontras desain positif.');
  await closeB();

  report.step('[Setup] ESS C - sesi habis saat Submit');
  const essC = await createEssAccount(page, addEmployeePage, 'QaTsMytsC');
  const { page: c, close: closeC } = await loginAs(browser, essC.username, essC.password);
  const myC = new MyTimesheetPage(c);
  await myC.goto();
  await c.waitForLoadState('networkidle').catch(() => {});
  const { resp: saveRespC } = await fillRowAndSave(myC, c, ['ACME', 'Apache', 'Coca-Cola', 'Fresh Books', 'FreeWave'], '1:00');
  report.check('[Setup] ESS C - Save awal berhasil (200) sblm uji sesi-habis-saat-submit', saveRespC?.status() === 200, `status=${saveRespC?.status()}`);
  await c.waitForURL(/viewMyTimesheet/, { timeout: 15_000 }).catch(() => {});
  await c.waitForLoadState('networkidle').catch(() => {});

  report.step('4.5 Sesi berakhir sebelum Submit');
  const cookiesC = await c.context().cookies();
  await c.context().clearCookies();
  const submitBtnC = c.getByRole('button', { name: 'Submit' });
  await submitBtnC.waitFor({ state: 'visible', timeout: 15_000 });
  const sessSubmitPromise = c.waitForResponse((r) => /\/api\/v2\/time\/timesheets\/\d+$/.test(r.url()) && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
  await submitBtnC.click();
  const toLoginC = await c.waitForURL(/auth\/login/, { timeout: 20_000 }).then(() => true, () => false);
  const sessSubmitResp = await sessSubmitPromise;
  await c.context().addCookies(cookiesC);
  const statusAfterSessSubmit = await essDefault(c);
  report.check('4.5 Sesi berakhir lalu Submit -> PUT 401, dialihkan ke login, status tetap "Not Submitted"', sessSubmitResp?.status() === 401 && toLoginC && statusAfterSessSubmit.status === 'NOT SUBMITTED', `PUT=${sessSubmitResp?.status()} login=${toLoginC} status=${statusAfterSessSubmit.status}`);
  await closeC();

  report.print();
});

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
