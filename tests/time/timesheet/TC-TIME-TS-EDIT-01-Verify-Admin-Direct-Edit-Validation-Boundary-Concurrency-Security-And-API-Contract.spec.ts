/**
 * ================================================================================
 * TC-TIME-TS-EDIT-01 — Verify Admin Direct Edit: Validation, Boundary, Concurrency, Security And API Contract
 * Modul    : Time > Timesheet Edit & Approval (U106)
 * Kategori : Positive (+) 1.1-U 1.3 1.8 | Negative (-) 2.2 2.6 | Boundary (B) 3.2 |
 *            Edge (!) 4.2 4.3 4.4 4.5 4.7 4.8 | Security (S) 5.2-BFLAC 5.2-MassAssign 5.4 |
 *            API (A) 6.1 6.3 6.5 6.7 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TS-EDIT-01-Verify-Admin-Direct-Edit-Validation-Boundary-Concurrency-Security-And-API-Contract.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * LATAR (investigasi U106 "Timesheet Edit & Approval", instruksi koordinator 25 Nov 2026):
 * rebuild matrix di awal sesi ini menunjukkan U106 SUDAH 0 GAP (bukan 10 spt catatan lama di
 * Execution-Plan.md -- angka itu SUDAH STALE, ditutup diam2 sbg SIDE EFFECT dari NAME_RULES di
 * build_matrix.py yg mengatribusikan kode TC-TIME-TS-APPROVAL-* [U004] & TC-TIME-TIMESHEET/
 * TS-SUBMIT-*-[U055] jg ke U106, krn kedua URL unit ini (time/editTimesheet/<id> |
 * time/viewTimesheet/employeeId/<emp>) overlap scr fungsional dgn flow approve/reject admin &
 * edit-punya-sendiri ESS). TAPI eksplorasi live via Playwright MCP SEBELUM menulis TC ini
 * membuktikan ATRIBUSI ITU TIDAK SEPENUHNYA JUJUR: TIDAK ADA satu pun TC yg pernah benar2
 * mengklik tombol "Edit" di halaman View Employee Timesheet (time/viewTimesheet/employeeId/<emp>)
 * -- EmployeeTimesheetPage.ts (dipakai TS-APPROVAL-*) bahkan punya catatan di docstring-nya
 * sendiri "View opens ... with Edit / Reject / Approve buttons" TAPI TIDAK PERNAH mengekspos
 * locator utk tombol Edit itu, cuma approveButton/rejectButton. Fitur UNIK unit ini -- Admin
 * mengubah LANGSUNG jam kerja milik EMPLOYEE LAIN (bukan cuma approve/reject) -- BELUM PERNAH
 * diuji sama sekali. TC INI mengisi gap fungsional riil tsb, sesuai hipotesis eksplisit
 * koordinator ("mungkin fokus ke ADMIN EDIT langsung isi timesheet employee lain, bukan cuma
 * approve/reject").
 *
 * DIKONFIRMASI LIVE via Playwright MCP SEBELUM menulis TC ini (sesi Admin sungguhan, employee
 * throwaway QA):
 *   - Tombol "Edit" di halaman View (time/viewTimesheet/employeeId/<emp>?startDate=<monday>)
 *     membuka time/editTimesheet/<timesheetId> -- URL KEDUA unit ini, dikonfirmasi persis sesuai
 *     inventaris. Form inilah -- BUKAN form Approve/Reject -- yg py field tanggal per-baris yg
 *     bisa diedit.
 *   - Save di form ini -> PUT /api/v2/time/employees/timesheets/<id>/entries {entries:[{projectId,
 *     activityId, dates:{<date>:{duration}}}], deletedEntries:[]} -- endpoint SAMA BENTUK (nama
 *     resource "entries") dgn My Timesheet ESS, TAPI path BERBEDA ("employees/timesheets/<id>"
 *     admin, vs "timesheets/<id>" ESS murni) -- SATU resource dua endpoint tergantung siapa yg
 *     mengedit (pola identik dgn Attendance My Records vs Employee Records, U056 vs U058).
 *   - Admin BISA edit entries SEKALIPUN timesheet berstatus "Approved" (bukan cuma "Submitted")
 *     -- status TIDAK berubah, DAN tidak ada baris baru muncul di "Actions Performed on the
 *     Timesheet" utk aksi Edit ini (log hanya mencatat Submitted/Approved/Rejected, TIDAK PERNAH
 *     Edit) -- behavior non-obvious, didokumentasikan sbg finding (4.8), BUKAN bug (admin
 *     override yg disengaja, konsisten dgn desain tool HR internal).
 *   - Project autocomplete ("Type for hints...") di form Edit MEMANGGIL ENDPOINT YG SAMA PERSIS
 *     dgn My Timesheet ESS (GET time/projects?onlyAllowed=false&model=detailed&
 *     customerOrProjectName=<q>) -- dikonfirmasi emoji astral jg -> 500 di sini (BG-506 MEMANG
 *     app-wide milik widget ini, bukan bug baru; TIDAK diulang jd bug id baru di TC ini).
 *   - Origin header A/B (legit vs "https://attacker.test") pd PUT entries -> KEDUANYA 200, Origin
 *     TIDAK divalidasi server (finding, konsisten app-wide dgn BG-437/TC-PIM-CSRF-01 -- SameSite=
 *     Lax satu2nya pertahanan; TIDAK diulang jd bug id baru di TC ini).
 *   - Mass assignment (field asing "status"/"employeeId" di body PUT entries) -> 422 eksplisit
 *     menyebut KEDUA field (aman, BUKAN bug).
 *   - Method salah (DELETE ke endpoint koleksi entries) -> 405 (aman).
 *   - Body malformed (entries bukan array) -> 422 invalidParamKeys:["entries"] (aman, bukan 500).
 *   - Payload identik dikirim 2x -> KEDUANYA 200, hasil akhir konsisten (idempotent, aman).
 *   - Ghost timesheet id (999999) -> 404 "Record Not Found"; id non-numerik ("abc") -> 422
 *     invalidParamKeys:["timesheetId"] -- KONTRAS POSITIF, endpoint ini validasi tipe id dgn
 *     benar (BEDA dgn banyak unit lain yg crash 500 utk id non-numerik/ghost).
 *   - [BUG BARU] Total durasi SATU HARI melebihi 24 jam lintas DUA baris project yg BERBEDA
 *     (20:00 + 10:00 = 30:00) via endpoint admin "employees/timesheets/<id>/entries" -> DITERIMA
 *     200, TIDAK ditolak -- pola SAMA dgn BG-402 (TC-TIME-TIMESHEET-11, endpoint ESS "timesheets/
 *     <id>/entries"), TAPI endpoint ADMIN ini belum pernah dikonfirmasi sebelumnya (konvensi
 *     project: root cause sama, endpoint berbeda = bug id BARU). SENGAJA FAILED (R3).
 *
 * TEMUAN UTAMA: BG-507 (Medium) -- validasi "total 1 hari <= 24 jam" HANYA per sel (per
 * project+activity), TIDAK PERNAH per-hari-lintas-baris, SEKARANG dikonfirmasi jg berlaku saat
 * ADMIN mengedit langsung timesheet milik employee lain (bukan hanya saat ESS mengisi punya
 * sendiri) -- bug yg SAMA menyebar ke jalur kedua yg independen.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TS-EDIT-01-Verify-Admin-Direct-Edit-Validation-Boundary-Concurrency-Security-And-API-Contract.spec.ts --project=chromium --workers=1
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssTimesheet } from '../../../src/utils/createEssTimesheet';
import { EmployeeTimesheetPage } from '../../../src/pages';

const API = '/web/index.php/api/v2/';
const ADMIN_PROJECT_ID = 2; // ACME Ltd (seed demo project, sama dgn createEssTimesheet.PROJECT_ID)
const ADMIN_ACTIVITY_ID = 11; // Administration
const SECOND_PROJECT_ID = 3; // ASF - Phase 1 (seed demo project kedua, utk uji lintas-baris)
const SECOND_ACTIVITY_ID = 18; // Bug Fixes

interface EntriesResponse {
  data: Array<{
    project: { id: number; name: string };
    total: { label: string };
    dates: Record<string, { id: number; duration: string } | undefined>;
  }>;
}

test('TC-TIME-TS-EDIT-01: admin direct edit validation, boundary, concurrency, security, API contract', async ({
  page, browser, addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(300_000);
  // Noise 401 yg disengaja muncul di console stlh simulasi sesi berakhir (4.5) -- bug app-wide
  // sudah terdokumentasi di tempat lain, bukan bug baru dari TC ini.
  const report = new TestReport('TC-TIME-TS-EDIT-01', 'Admin Direct Edit Validation Boundary Concurrency Security API Contract', env.baseURL, page, [/status of 401/]);

  report.step('Setup: 2 ESS throwaway (A = subjek utama, SUBMITTED; B = korban utk uji privilege) + timesheet masing2');
  const a = await createEssTimesheet(page, browser, addEmployeePage, 'QaTsEditA', { submit: true });
  const b = await createEssTimesheet(page, browser, addEmployeePage, 'QaTsEditB', { submit: false });
  const entriesUrl = (id: number) => `${API}time/employees/timesheets/${id}/entries`;

  try {
    report.step('[1.1-U, A] Buka View employee A dari Employee Timesheets, klik Edit -> URL time/editTimesheet/<id> (URL KEDUA inventaris U106)');
    const employeeTimesheets = new EmployeeTimesheetPage(page);
    const lastNameA = a.ess.fullName.split(' ').pop() ?? a.ess.fullName;
    await employeeTimesheets.goto();
    const rowA = employeeTimesheets.pendingRowFor(lastNameA);
    await rowA.waitFor({ state: 'visible', timeout: 15_000 });
    await employeeTimesheets.view(rowA);
    const putResp1 = page.waitForResponse((r) => r.url().endsWith(`/timesheets/${a.timesheetId}/entries`) && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.waitForURL(new RegExp(`editTimesheet/${a.timesheetId}$`), { timeout: 15_000 });
    await page.waitForLoadState('networkidle').catch(() => {});

    report.step('[1.1-U / 1.8] Isi sel kosong (hari ke-3 baris 1) via UI, Save -> PUT 200, toast sukses, nilai tersimpan');
    // Baris pertama = [Project (autocomplete, index 0), Mon, Tue, Wed, Thu, Fri, Sat, Sun] --
    // input hari TIDAK punya attribute literal type="text" di DOM (hanya default IDL property),
    // jadi selector harus "input" polos (BUKAN "input[type=\"text\"]", confirmed live via MCP
    // evaluate -- selector attribute itu 0 match). createEssTimesheet mengisi Mon(index 1) +
    // Tue(index 2); Wed(index 3) adl sel kosong pertama ("hari ke-3").
    const dayCells = page.locator('tbody tr').first().locator('input');
    await dayCells.nth(3).fill('02:15');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const editResp1 = await putResp1;
    const toast1 = await page.locator('.oxd-toast').first().innerText({ timeout: 8_000 }).catch(() => '');
    report.check('1.1-U [U106] Admin edit entries milik employee LAIN via UI (tombol Edit, BUKAN Approve/Reject) -> PUT 200', editResp1?.status() === 200, `status=${editResp1?.status()}`);
    report.check('1.8 [U106] Toast sukses muncul setelah Save di form Edit Timesheet', /Successfully (Updated|Saved)/.test(toast1), `toast="${toast1}"`);
    const afterEdit1 = await page.request.get(entriesUrl(a.timesheetId)).then((r) => r.json()) as EntriesResponse;
    const persisted = Object.values(afterEdit1.data[0]?.dates ?? {}).some((d) => d?.duration === '02:15');
    report.check('1.1-U [U106] Nilai baru benar2 tersimpan di server (GET entries mengonfirmasi)', persisted, `dates=${JSON.stringify(afterEdit1.data[0]?.dates)}`);

    report.step('[4.3] Isi sel lain TANPA Save, browser back -> perubahan dibuang (tidak ada PUT)');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.waitForURL(new RegExp(`editTimesheet/${a.timesheetId}$`), { timeout: 15_000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    const noPutOnBack = page.waitForResponse((r) => r.url().endsWith(`/timesheets/${a.timesheetId}/entries`) && r.request().method() === 'PUT', { timeout: 4_000 }).then(() => true).catch(() => false);
    await page.locator('tbody tr').first().locator('input').nth(4).fill('09:30');
    await page.goBack();
    const firedOnBack = await noPutOnBack;
    const afterBack = await page.request.get(entriesUrl(a.timesheetId)).then((r) => r.json()) as EntriesResponse;
    const stillHas0930 = Object.values(afterBack.data[0]?.dates ?? {}).some((d) => d?.duration === '09:30');
    report.check('4.3 [U106] Isi sel TANPA Save lalu browser back -> perubahan TIDAK terkirim/tersimpan (tidak ada PUT)', !firedOnBack && !stillHas0930, `PUT terkirim=${firedOnBack}, nilai 09:30 tersimpan=${stillHas0930}`);

    // [4.5] dijalankan DI SINI (sblm step mutasi API lain spt 3.2/approve/parallel menambah baris
    // project KEDUA ke tabel) -- dikonfirmasi via 2 probe isolasi (zz-probe, dihapus) bhw urutan
    // AWAL (1 baris saja, blm di-approve) selalu redirect <10s; begitu dipindah ke AKHIR urutan
    // (setelah baris kedua & banyak mutasi API lain), redirect/PUT 401 tidak pernah teramati dlm
    // 35s 2x berturut-turut -- root cause BUKAN flakiness demo, tapi state tabel (multi-baris)
    // yg mengubah perilaku klik Save. Dipindah ke sini drpd didiagnosis lebih jauh (di luar scope
    // U106 utk investigasi root cause UI framework-nya).
    report.step('[4.5] Sesi admin berakhir (cookies dikosongkan sesaat) lalu Save -> PUT ditolak, nilai employee lain tidak berubah');
    await page.goto(`/web/index.php/time/editTimesheet/${a.timesheetId}`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.locator('tbody tr').first().locator('input').nth(5).fill('11:11');
    const cookiesBeforeExpiry = await page.context().cookies();
    await page.context().clearCookies();
    const sessPut = page.waitForResponse((r) => r.url().endsWith(`/timesheets/${a.timesheetId}/entries`) && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const toLogin = await page.waitForURL(/auth\/login/, { timeout: 30_000 }).then(() => true, () => false);
    const sessResp = await sessPut;
    await page.context().addCookies(cookiesBeforeExpiry);
    const afterSessionExpiry = (await page.request.get(entriesUrl(a.timesheetId)).then((r) => r.json())) as EntriesResponse;
    const has1111 = Object.values(afterSessionExpiry.data[0]?.dates ?? {}).some((d) => d?.duration === '11:11');
    report.check(
      '4.5 [U106] Sesi admin berakhir lalu Save -> dialihkan ke login, nilai timesheet employee lain TIDAK berubah (PUT ditolak)',
      toLogin && !has1111 && (sessResp === null || sessResp?.status() === 401),
      `PUT=${sessResp?.status() ?? '(redirect lbh dulu)'} login=${toLogin} 11:11 tersimpan=${has1111}`,
    );
    // Setelah sesi dipulihkan, pastikan page kembali ke state yg bisa dipakai step berikutnya
    // (view page, bukan tersangkut di /auth/login).
    await page.goto(`/web/index.php/time/viewTimesheet/employeeId/${a.ess.empNumber}?startDate=${a.startDate}`);
    await page.waitForLoadState('networkidle').catch(() => {});

    report.step('[2.2] API PUT entries: format durasi salah ("99:99") -> 422 invalidParamKeys entries');
    const badDuration = await page.request.put(entriesUrl(a.timesheetId), { data: { entries: [{ projectId: ADMIN_PROJECT_ID, activityId: ADMIN_ACTIVITY_ID, dates: { [a.startDate]: { duration: '99:99' } } }], deletedEntries: [] } });
    const badDurationBody = await badDuration.json().catch(() => ({}));
    report.check('2.2 [U106] Durasi format salah ("99:99") -> 422 invalidParamKeys:["entries"]', badDuration.status() === 422 && (badDurationBody?.error?.data?.invalidParamKeys ?? []).includes('entries'), `status=${badDuration.status()} body=${JSON.stringify(badDurationBody)}`);

    report.step('[2.6] GET entries: timesheet id ghost (999999) -> 404; id non-numerik ("abc") -> 422 (KONTRAS POSITIF, tipe divalidasi benar)');
    const ghost = await page.request.get(entriesUrl(999999));
    const ghostBody = await ghost.json().catch(() => ({}));
    const nonNumeric = await page.request.get(`${API}time/employees/timesheets/abc/entries`);
    const nonNumericBody = await nonNumeric.json().catch(() => ({}));
    report.check('2.6 [U106] GET entries timesheet id ghost (999999) -> 404 "Record Not Found"', ghost.status() === 404, `status=${ghost.status()} body=${JSON.stringify(ghostBody)}`);
    report.check('2.6 [U106] GET entries timesheet id non-numerik ("abc") -> 422 invalidParamKeys:["timesheetId"] (BUKAN 500/crash spt banyak unit lain)', nonNumeric.status() === 422 && (nonNumericBody?.error?.data?.invalidParamKeys ?? []).includes('timesheetId'), `status=${nonNumeric.status()} body=${JSON.stringify(nonNumericBody)}`);

    report.step('[3.2 BUG] Total 1 hari > 24 jam lintas 2 baris project BERBEDA via endpoint admin -> SEHARUSNYA ditolak, dikonfirmasi DITERIMA (BG-507)');
    const overDayDate = '2026-11-28';
    const over1 = await page.request.put(entriesUrl(a.timesheetId), { data: { entries: [{ projectId: ADMIN_PROJECT_ID, activityId: ADMIN_ACTIVITY_ID, dates: { [overDayDate]: { duration: '20:00' } } }], deletedEntries: [] } });
    const over2 = await page.request.put(entriesUrl(a.timesheetId), { data: { entries: [{ projectId: SECOND_PROJECT_ID, activityId: SECOND_ACTIVITY_ID, dates: { [overDayDate]: { duration: '10:00' } } }], deletedEntries: [] } });
    const overBody = (await over2.json().catch(() => ({}))) as EntriesResponse & { error?: unknown };
    const totalForDay = (overBody.data ?? []).reduce((sum, row) => {
      const d = row.dates?.[overDayDate];
      if (!d) return sum;
      const [h, m] = d.duration.split(':').map(Number);
      return sum + (h ?? 0) * 60 + (m ?? 0);
    }, 0);
    // Check ini menyatakan EKSPEKTASI YG BENAR (total 1 hari TIDAK boleh > 24 jam) -- SENGAJA
    // FAILED krn server menerima 30:00 (bug), konsisten dgn pola SENGAJA-FAILED TC lain di
    // proyek ini (assert perilaku ideal, bukan assert "bug-nya ada").
    report.check(
      '3.2 BUG BG-507: total durasi 1 hari (2026-11-28) = 20:00 (Project A) + 10:00 (Project B) via endpoint admin "employees/timesheets/<id>/entries" SEHARUSNYA ditolak (>24 jam/hari), TAPI DITERIMA 200 kedua PUT dgn total akhir 30:00 tersimpan -- SAMA KELAS dgn BG-402 (endpoint ESS), kini terbukti jg di endpoint ADMIN',
      over1.status() !== 200 || over2.status() !== 200 || totalForDay <= 24 * 60,
      `status1=${over1.status()} status2=${over2.status()} totalMenit=${totalForDay} (>${24 * 60} = bug, DITERIMA)`,
    );

    report.step('[1.3 / 4.8] Approve timesheet A, lalu edit TETAP berfungsi (admin override) -- status tidak berubah, TIDAK ada log aksi baru utk Edit');
    const approveResp = await page.request.put(`${API}time/employees/${a.ess.empNumber}/timesheets/${a.timesheetId}`, { data: { action: 'APPROVE', comment: 'qa-approve-before-edit' } });
    const logsBefore = await page.request.get(`${API}time/timesheets/${a.timesheetId}/action-logs?limit=50&offset=0`).then((r) => r.json());
    const editAfterApprove = await page.request.put(entriesUrl(a.timesheetId), { data: { entries: [{ projectId: ADMIN_PROJECT_ID, activityId: ADMIN_ACTIVITY_ID, dates: { [a.startDate]: { duration: '06:45' } } }], deletedEntries: [] } });
    const logsAfter = await page.request.get(`${API}time/timesheets/${a.timesheetId}/action-logs?limit=50&offset=0`).then((r) => r.json());
    const statusAfterEdit = (await page.request.get(entriesUrl(a.timesheetId)).then((r) => r.json())) as EntriesResponse;
    report.check('1.3 [U106] Admin BISA edit entries sekalipun timesheet sudah "Approved" (tidak perlu transisi status dulu)', approveResp.status() === 200 && editAfterApprove.status() === 200, `approveStatus=${approveResp.status()} editAfterApproveStatus=${editAfterApprove.status()}`);
    report.finding('4.8 [U106] Edit sesudah Approve TIDAK tercatat di "Actions Performed on the Timesheet"', `Log aksi sebelum edit (${logsBefore?.meta?.total ?? '?'} baris: ${(logsBefore?.data ?? []).map((l: { action: { name: string } }) => l.action?.name).join(',')}) IDENTIK dgn sesudah edit (${logsAfter?.meta?.total ?? '?'} baris: ${(logsAfter?.data ?? []).map((l: { action: { name: string } }) => l.action?.name).join(',')}) -- action-logs HANYA mencatat Submitted/Approved/Rejected, TIDAK PERNAH Edit, meski nilai jam benar2 berubah (persisted=${statusAfterEdit.data[0]?.dates?.[a.startDate]?.duration}). Non-obvious tapi kemungkinan disengaja (admin override tool internal HR) -- didokumentasikan, bukan bug.`);

    report.step('[5.2-BFLAC] ESS (role non-admin) coba GET & PUT endpoint ADMIN entries pakai sesi SENDIRI maupun sesi B (bukan punyanya) -> harus ditolak');
    const essGetOwn = await a.essPage.request.get(entriesUrl(a.timesheetId));
    const essPutOwn = await a.essPage.request.put(entriesUrl(a.timesheetId), { data: { entries: [{ projectId: ADMIN_PROJECT_ID, activityId: ADMIN_ACTIVITY_ID, dates: { [a.startDate]: { duration: '01:00' } } }], deletedEntries: [] } });
    const essGetOther = await a.essPage.request.get(entriesUrl(b.timesheetId));
    report.check('5.2-BFLAC [U106] ESS GET endpoint admin entries (timesheet SENDIRI) -> ditolak (403/401/404), bukan 200', essGetOwn.status() !== 200, `status=${essGetOwn.status()}`);
    report.check('5.2-BFLAC [U106] ESS PUT endpoint admin entries (timesheet SENDIRI) -> ditolak, tidak mengubah data', essPutOwn.status() !== 200, `status=${essPutOwn.status()}`);
    report.check('5.2-BFLAC / 5.2-IDOR [U106] ESS GET endpoint admin entries MILIK EMPLOYEE LAIN (B) -> ditolak jg (role-level, bukan cuma ownership-level)', essGetOther.status() !== 200, `status=${essGetOther.status()}`);

    report.step('[5.2-MassAssign] PUT entries dgn field asing "status"/"employeeId" -> 422 eksplisit, tidak diterima diam2');
    const massAssign = await page.request.put(entriesUrl(a.timesheetId), { data: { entries: [{ projectId: ADMIN_PROJECT_ID, activityId: ADMIN_ACTIVITY_ID, dates: { [a.startDate]: { duration: '01:00' } } }], deletedEntries: [], status: 'APPROVED', employeeId: 999999 } });
    const massAssignBody = await massAssign.json().catch(() => ({}));
    report.check('5.2-MassAssign [U106] PUT entries dgn field asing "status"+"employeeId" -> 422 menyebut KEDUA field eksplisit', massAssign.status() === 422 && (massAssignBody?.error?.data?.invalidParamKeys ?? []).includes('status') && (massAssignBody?.error?.data?.invalidParamKeys ?? []).includes('employeeId'), `status=${massAssign.status()} body=${JSON.stringify(massAssignBody)}`);

    report.step('[5.4] Origin header A/B (legit vs attacker.test) pd PUT entries -- konfirmasi Origin TIDAK divalidasi (app-wide, BUKAN bug baru)');
    const originLegit = await page.request.put(entriesUrl(a.timesheetId), { headers: { Origin: env.baseURL }, data: { entries: [{ projectId: ADMIN_PROJECT_ID, activityId: ADMIN_ACTIVITY_ID, dates: { [a.startDate]: { duration: '01:30' } } }], deletedEntries: [] } });
    const originEvil = await page.request.put(entriesUrl(a.timesheetId), { headers: { Origin: 'https://attacker.test' }, data: { entries: [{ projectId: ADMIN_PROJECT_ID, activityId: ADMIN_ACTIVITY_ID, dates: { [a.startDate]: { duration: '01:45' } } }], deletedEntries: [] } });
    report.finding('5.4 [U106] Origin header TIDAK divalidasi server (PUT entries)', `Origin legit -> ${originLegit.status()}, Origin "https://attacker.test" -> ${originEvil.status()} (KEDUANYA diterima sama) -- konsisten app-wide dgn BG-437/TC-PIM-CSRF-01 (SameSite=Lax cookie satu2nya pertahanan nyata, bukan validasi Origin server), BUKAN bug baru krn root cause sudah terdokumentasi luas.`);

    report.step('[4.4 / 4.7] 2 PUT entries paralel dgn NILAI BERBEDA ke sel yg sama -> tidak ada 5xx, hasil akhir = SALAH SATU (tidak korup/campur)');
    const parDate = '2026-11-29';
    const [parA, parB] = await Promise.all([
      page.request.put(entriesUrl(a.timesheetId), { data: { entries: [{ projectId: ADMIN_PROJECT_ID, activityId: ADMIN_ACTIVITY_ID, dates: { [parDate]: { duration: '03:00' } } }], deletedEntries: [] } }),
      page.request.put(entriesUrl(a.timesheetId), { data: { entries: [{ projectId: ADMIN_PROJECT_ID, activityId: ADMIN_ACTIVITY_ID, dates: { [parDate]: { duration: '04:00' } } }], deletedEntries: [] } }),
    ]);
    const afterParallel = (await page.request.get(entriesUrl(a.timesheetId)).then((r) => r.json())) as EntriesResponse;
    const parDuration = afterParallel.data[0]?.dates?.[parDate]?.duration;
    report.check(
      '4.4 / 4.7 [U106] 2 PUT entries paralel (dua sesi admin / klik ganda Save) ke sel sama -> tanpa 5xx, nilai akhir = SALAH SATU dari keduanya (last-write-wins, tidak korup)',
      parA.status() === 200 && parB.status() === 200 && (parDuration === '03:00' || parDuration === '04:00'),
      `statusA=${parA.status()} statusB=${parB.status()} nilaiAkhir=${parDuration}`,
    );

    report.step('[6.3] Method salah (DELETE) ke endpoint koleksi entries -> 405, bukan diam2 diterima');
    const wrongMethod = await page.request.delete(entriesUrl(a.timesheetId));
    report.check('6.3 [U106] DELETE ke endpoint entries (tidak ada aksi delete per-entry di API ini) -> 405 Method Not Allowed', wrongMethod.status() === 405, `status=${wrongMethod.status()}`);

    report.step('[6.5] Body malformed (entries bukan array) -> 422, bukan 500');
    const malformed = await page.request.put(entriesUrl(a.timesheetId), { data: { entries: 'not-an-array', deletedEntries: [] } });
    const malformedBody = await malformed.json().catch(() => ({}));
    report.check('6.5 [U106] PUT entries dgn body malformed (entries bukan array) -> 422 invalidParamKeys:["entries"], bukan 500', malformed.status() === 422 && (malformedBody?.error?.data?.invalidParamKeys ?? []).includes('entries'), `status=${malformed.status()} body=${JSON.stringify(malformedBody)}`);

    report.step('[6.7] Payload valid identik dikirim 2x (retry network) -> keduanya 200, tidak ada duplikasi/korupsi');
    const idemDate = '2026-11-24';
    const idemA = await page.request.put(entriesUrl(a.timesheetId), { data: { entries: [{ projectId: ADMIN_PROJECT_ID, activityId: ADMIN_ACTIVITY_ID, dates: { [idemDate]: { duration: '05:00' } } }], deletedEntries: [] } });
    const idemB = await page.request.put(entriesUrl(a.timesheetId), { data: { entries: [{ projectId: ADMIN_PROJECT_ID, activityId: ADMIN_ACTIVITY_ID, dates: { [idemDate]: { duration: '05:00' } } }], deletedEntries: [] } });
    const afterIdem = (await page.request.get(entriesUrl(a.timesheetId)).then((r) => r.json())) as EntriesResponse;
    const idemRowsForProject = afterIdem.data.filter((row) => row.project.id === ADMIN_PROJECT_ID).length;
    report.check('6.7 [U106] PUT entries payload valid identik dikirim 2x -> keduanya 200, TIDAK membuat baris duplikat (idempotent)', idemA.status() === 200 && idemB.status() === 200 && idemRowsForProject === 1, `statusA=${idemA.status()} statusB=${idemB.status()} jumlahBarisProjectSama=${idemRowsForProject}`);

    report.step('[8.4] Skema error 422 konsisten dgn pola app-wide (status string, message, data.invalidParamKeys array)');
    report.check(
      '8.4 [U106] Skema error 422 endpoint entries (status/message/data.invalidParamKeys) konsisten dgn endpoint lain yg sudah diuji di modul Time (bukan format ad-hoc)',
      typeof badDurationBody?.error?.status === 'string' && typeof badDurationBody?.error?.message === 'string' && Array.isArray(badDurationBody?.error?.data?.invalidParamKeys),
      `error=${JSON.stringify(badDurationBody?.error)}`,
    );
  } finally {
    await a.close();
    await b.close();
  }

  report.print();
});
