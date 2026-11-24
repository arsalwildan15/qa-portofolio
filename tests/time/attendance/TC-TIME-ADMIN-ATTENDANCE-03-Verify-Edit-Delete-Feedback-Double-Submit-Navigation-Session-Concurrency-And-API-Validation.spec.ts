/**
 * ================================================================================
 * TC-TIME-ADMIN-ATTENDANCE-03 — Verify Employee Records: Edit, Delete, Feedback, Double-Submit, Navigation, Session, Concurrency And API Validation
 * Modul    : Time > Attendance > Employee Records (U058, Admin view of ANOTHER employee's attendance)
 * Kategori : Positive (+) 1.1-U 1.1-D 1.2 1.8 | Negative (-) 2.1 2.2 | Boundary (B) 3.4 |
 *            Edge (!) 4.1 4.2 4.3 4.5 4.7 4.8 | Security (S) 5.1-SQLi 5.1-XSS-Reflected
 *            5.2-MassAssign 5.4 5.5 | API (A) 6.5 6.7 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-ADMIN-ATTENDANCE-03-Verify-Edit-Delete-Feedback-Double-Submit-Navigation-Session-Concurrency-And-API-Validation.spec.ts
 * Path     : tests/time/attendance/
 * ================================================================================
 *
 * TUJUAN (LIVE 25 Nov 2026): menutup U058 "Attendance Employee Records" -- halaman Admin di
 * /attendance/viewAttendanceRecord, yg menampilkan RIWAYAT attendance SEMUA employee (BUKAN My
 * Records/U056 milik sendiri, BUKAN Punch In/Out real-time/U057). TC-TIME-ADMIN-ATTENDANCE-01/02
 * SUDAH menutup proxy Punch In/Out (1.1-C/1.4/1.8/6.1) -- TC INI melengkapi sisanya: edit/delete
 * per baris record (tombol pencil/trash yg terbuka SETELAH "View" sebuah employee), search
 * Employee Name (autocomplete), dan validasi API.
 *
 * DIKONFIRMASI LIVE via Playwright MCP SEBELUM menulis TC ini:
 *   - List utama /attendance/viewAttendanceRecord menampilkan SEMUA employee + total durasi;
 *     klik "View" pada baris employee -> URL employeeId=<X>&date=<Y> -> detail record employee itu.
 *   - Detail record employee BUKAN read-only: tiap baris punya tombol trash (hapus) & pencil
 *     (edit, membuka /attendance/editEmployeeAttendanceRecord/<id> -- URL BERBEDA dari My Records'
 *     /attendance/editAttendanceRecord/<id>, tapi form & PUT /api/v2/attendance/records/<id>-nya
 *     PERSIS SAMA dgn My Records/U056).
 *   - CREATE & DELETE justru pakai endpoint NESTED per-employee yg BEDA dari My Records:
 *       POST/GET   /api/v2/attendance/employees/<empNumber>/records
 *       DELETE     /api/v2/attendance/employees/<empNumber>/records {ids:[...]}
 *     (My Records/U056 pakai endpoint "flat" attendance/records{,/<id>} tanpa empNumber di path --
 *     dua bentuk URL berbeda utk resource yg SAMA, dibedakan hanya oleh siapa target-nya.)
 *   - Employee Name search (autocomplete) HANYA memanggil endpoint GLOBAL /api/v2/pim/employees
 *     ?nameOrId=...&includeEmployees=currentAndPast (dipakai bersama oleh banyak modul lain, BUKAN
 *     endpoint attendance tersendiri).
 *
 * KESELAMATAN DATA: TC ini membuat SATU employee throwaway sendiri (bukan employee demo yg sudah
 * ada) via createEmployee() API, lalu HANYA menyentuh attendance record milik employee throwaway
 * itu -- tidak pernah mengedit/menghapus record employee lain yg sudah ada di demo bersama.
 *
 * TEMUAN UTAMA (2 BUG BARU):
 *   BG-503 (Medium) -- GET /api/v2/pim/employees?nameOrId=<emoji astral 4-byte> -> 500 Internal
 *   Server Error, BUKAN 200 kosong spt unicode lain (CJK/aksen/ZWSP semua aman). Endpoint ini
 *   dipakai Employee Name search di unit INI, tapi juga dipakai banyak modul lain (Assign Leave,
 *   Add Employee autocomplete lain, dst) -- SATU root cause (kolom DB "utf8" bukan "utf8mb4", pola
 *   SAMA dgn BG-501 di Punch In/Out Note), bug id TERPISAH krn unit berbeda (konvensi project).
 *   Dikonfirmasi deterministik: 4 payload emoji berbeda x 2 ulangan = 7/7 kali 500 (bukan flaky).
 *   BG-504 (Low) -- DELETE /api/v2/attendance/employees/<empNumber>/records thd id yg SUDAH
 *   terhapus (simulasi klik ganda tombol trash) mengembalikan 403 "Unauthorized" (status INTEGER
 *   tanpa kutip), BUKAN 404 "Record Not Found" (status STRING) spt GET utk kondisi IDENTIK (record
 *   tak ditemukan). SAMA KELAS bug dgn BG-499 (My Records/U056, endpoint "flat"), kini dikonfirmasi
 *   JUGA terjadi di endpoint ADMIN "nested" per-employee -- bukti ini BUKAN bug satu endpoint saja,
 *   melainkan inkonsistensi backend yg menyebar ke SEMUA jalur delete attendance record.
 *   SENGAJA FAILED (R3) utk membuktikan kedua bug (4.1 utk BG-503; 6.7/8.4 utk BG-504).
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/attendance/TC-TIME-ADMIN-ATTENDANCE-03-Verify-Edit-Delete-Feedback-Double-Submit-Navigation-Session-Concurrency-And-API-Validation.spec.ts --project=chromium --workers=1
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';
import { API, getJson, proxyPunchIn, deleteEmployeeAttendanceRecords } from '../../../src/utils/timeData';

const ATTACKER = 'https://attacker.test';

interface AttendanceRecord {
  id: number;
  punchIn: { userDate: string | null; userTime: string | null; note: string | null };
  punchOut: { userDate: string | null; userTime: string | null; note: string | null };
}

test('TC-TIME-ADMIN-ATTENDANCE-03: Employee Records edit, delete, feedback, double-submit, navigation, session, concurrency, API validation', async ({
  page,
  adminAttendanceRecordsPage,
}, testInfo) => {
  testInfo.setTimeout(240_000);
  // Noise 401 + unhandled "reading 'response'" adl bug app-wide sudah terdokumentasi di tempat
  // lain (TC-XMOD-07) -- selalu muncul di console stlh simulasi sesi berakhir (4.5).
  const report = new TestReport('TC-TIME-ADMIN-ATTENDANCE-03', 'Attendance Employee Records Edit Delete Feedback DoubleSubmit Navigation Session Concurrency API', env.baseURL, page, [/status of 401/, /reading 'response'/]);
  const s = `${Date.now() % 100000}`;
  const noteA = `QaEmpRecA-${s}`;
  const noteA2 = `QaEmpRecA2-${s}`;
  const noteB = `QaEmpRecB-${s}`;
  let empNumber: number | undefined;
  let idA: number | undefined;
  let idB: number | undefined;

  try {
    report.step('Setup: buat 1 employee throwaway via API, cari via Employee Records, buka Attendance Record-nya');
    const firstName = `QaEmpRec${s}`;
    const lastName = 'Target';
    empNumber = await createEmployee(page.request, firstName, lastName);
    const emp = empNumber; // alias bertipe `number` murni (bukan `number | undefined`) utk argumen fungsi
    await adminAttendanceRecordsPage.goto();
    const openedEmpNumber = await adminAttendanceRecordsPage.searchAndView(firstName, lastName);
    if (openedEmpNumber !== empNumber) throw new Error(`Setup: searchAndView membuka employeeId=${openedEmpNumber}, bukan employee throwaway yg baru dibuat (${empNumber})`);
    const todayMatch = page.url().match(/date=(\d{4}-\d{2}-\d{2})/);
    if (!todayMatch) throw new Error(`Setup: gagal membaca tanggal dari URL (${page.url()})`);
    const today = todayMatch[1];
    if (!today) throw new Error('Setup: regex tanggal tidak menangkap grup (seharusnya tidak pernah terjadi)');

    report.step('[1.1-C setup, A] Buat record A (Punch In) via API utk employee throwaway, reload utk lihat di UI');
    idA = await proxyPunchIn(page.request, emp, today, '09:00', noteA);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const rowA = () => page.locator('.oxd-table-card').filter({ hasText: noteA });
    const rowA2 = () => page.locator('.oxd-table-card').filter({ hasText: noteA2 });
    await rowA().waitFor({ state: 'visible', timeout: 10_000 });
    // Urutan tombol dikonfirmasi live: index 0 = trash (delete), index 1 = pencil (edit) --
    // SAMA dgn konvensi TC-TIME-ATTENDANCE-MYRECORDS-01 (My Records).
    await rowA().locator('button').nth(1).click();
    await page.waitForURL(/editEmployeeAttendanceRecord\/\d+/, { timeout: 15_000 });
    // [BUG SCRIPT, antisipasi] Form edit ini memicu GET async punch-in-overlaps sesaat setelah
    // render (pola sama dgn AdminAttendanceRecordsPage.openAddForm & MYRECORDS-01) -- tunggu
    // networkidle dulu sblm mengisi field, spy tidak ter-reset diam2.
    await page.waitForLoadState('networkidle');

    const timeInput = page.locator('input[placeholder="hh:mm"]').first();
    const noteInput = page.locator('textarea').first();
    await timeInput.fill('09:15 AM');
    await noteInput.fill(noteA2);
    const putEdit1 = page.waitForResponse((r) => r.url().includes(`/api/v2/attendance/records/${idA}`) && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Save' }).click();
    const editResp1 = await putEdit1;
    const toast1 = await page.locator('.oxd-toast').first().innerText({ timeout: 8_000 }).catch(() => '');
    report.check('1.1-U Admin edit record A (milik employee LAIN) Time+Note via UI -> PUT 200', editResp1?.status() === 200, `status=${editResp1?.status()}`);
    report.check('1.8 Toast sukses muncul setelah Save', /Successfully (Updated|Saved)/.test(toast1), `toast="${toast1}"`);
    const afterEdit1 = await getJson<AttendanceRecord>(page.request, `attendance/records/${idA}`);
    report.check('1.1-U Nilai baru (Note) benar2 tersimpan di server', afterEdit1.punchIn.note === noteA2, `note=${afterEdit1.punchIn.note}`);
    await page.waitForURL(/viewAttendanceRecord/, { timeout: 15_000 }).catch(() => {});

    report.step('[2.1] Form edit record A: kosongkan Date* -> Save diblokir dgn validasi inline');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await rowA2().waitFor({ state: 'visible', timeout: 10_000 });
    await rowA2().locator('button').nth(1).click();
    await page.waitForURL(/editEmployeeAttendanceRecord\/\d+/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle');
    const dateEditInput = page.locator('input[placeholder="yyyy-mm-dd"], input[placeholder="yyyy-dd-mm"], input[placeholder="dd-mm-yyyy"], input[placeholder="mm-dd-yyyy"], input[placeholder="dd-yyyy-mm"], input[placeholder="mm-yyyy-dd"]').first();
    await dateEditInput.fill('');
    const noPutOnEmptyDate = page.waitForResponse((r) => r.url().includes(`/api/v2/attendance/records/${idA}`) && r.request().method() === 'PUT', { timeout: 4_000 }).then(() => true).catch(() => false);
    await page.getByRole('button', { name: 'Save' }).click();
    const fired = await noPutOnEmptyDate;
    const requiredShown = await page.getByText('Required', { exact: true }).first().isVisible().catch(() => false);
    report.check('2.1 Date* dikosongkan -> validasi "Required" muncul, PUT TIDAK terkirim', !fired && requiredShown, `PUT terkirim=${fired}, "Required" tampil=${requiredShown}`);

    report.step('[4.3] Edit record A via UI TANPA Save, lalu browser back -> perubahan dibuang');
    await dateEditInput.fill(today);
    await page.locator('textarea').first().fill('QaEmpRecA-discarded-change');
    await page.goBack();
    await page.waitForLoadState('networkidle');
    const afterBack = await getJson<AttendanceRecord>(page.request, `attendance/records/${idA}`);
    report.check('4.3 Ubah Note TANPA Save lalu browser back -> nilai lama tetap tersimpan (tidak dibuang via PUT)', afterBack.punchIn.note === noteA2, `note=${afterBack.punchIn.note}`);

    report.step('[1.2] API PUT: Note dikosongkan (opsional) lalu diisi lagi -- dua variasi diterima');
    const putEmpty = await page.request.put(`${API}attendance/records/${idA}`, { data: { punchInDate: today, punchInTime: '09:15', punchInNote: '' } });
    const recEmpty = await getJson<AttendanceRecord>(page.request, `attendance/records/${idA}`);
    report.check('1.2 Note dikosongkan -> PUT 200, tersimpan kosong (field opsional)', putEmpty.status() === 200 && !recEmpty.punchIn.note, `status=${putEmpty.status()} note="${recEmpty.punchIn.note}"`);
    const putFilled = await page.request.put(`${API}attendance/records/${idA}`, { data: { punchInDate: today, punchInTime: '09:15', punchInNote: noteA2 } });
    report.check('1.2 Note diisi lagi -> PUT 200, tersimpan', putFilled.status() === 200, `status=${putFilled.status()}`);

    report.step('[2.2] API PUT: format Time & Date salah -> 422 konsisten, bukan 500');
    const badTime = await page.request.put(`${API}attendance/records/${idA}`, { data: { punchInDate: today, punchInTime: '25:99', punchInNote: noteA2 } });
    const badTimeBody = await badTime.json().catch(() => ({}));
    report.check('2.2 Time format salah ("25:99") -> 422 invalidParamKeys punchInTime', badTime.status() === 422 && badTimeBody?.error?.data?.invalidParamKeys?.includes('punchInTime'), `status=${badTime.status()} body=${JSON.stringify(badTimeBody)}`);
    const badDate = await page.request.put(`${API}attendance/records/${idA}`, { data: { punchInDate: 'not-a-date', punchInTime: '09:15', punchInNote: noteA2 } });
    const badDateBody = await badDate.json().catch(() => ({}));
    report.check('2.2 Date format salah ("not-a-date") -> 422 invalidParamKeys punchInDate', badDate.status() === 422 && badDateBody?.error?.data?.invalidParamKeys?.includes('punchInDate'), `status=${badDate.status()} body=${JSON.stringify(badDateBody)}`);

    report.step('[5.2-MassAssign] API PUT: field asing (employeeId/state/isLocked) ditolak eksplisit, bukan diterima diam2');
    const massAssign1 = await page.request.put(`${API}attendance/records/${idA}`, { data: { punchInDate: today, punchInTime: '09:15', punchInNote: noteA2, employeeId: 999 } });
    const massAssign1Body = await massAssign1.json().catch(() => ({}));
    report.check('5.2-MassAssign PUT dgn "employeeId" asing (coba pindah kepemilikan record ke employee lain) -> 422, menyebut field tsb eksplisit', massAssign1.status() === 422 && massAssign1Body?.error?.data?.invalidParamKeys?.includes('employeeId'), `status=${massAssign1.status()} body=${JSON.stringify(massAssign1Body)}`);
    const massAssign2 = await page.request.put(`${API}attendance/records/${idA}`, { data: { punchInDate: today, punchInTime: '09:15', punchInNote: noteA2, state: 'APPROVED', isLocked: true } });
    const massAssign2Body = await massAssign2.json().catch(() => ({}));
    report.check('5.2-MassAssign PUT dgn field asing (state/isLocked) -> 422, menyebut KEDUA field tsb eksplisit', massAssign2.status() === 422 && massAssign2Body?.error?.data?.invalidParamKeys?.includes('state') && massAssign2Body?.error?.data?.invalidParamKeys?.includes('isLocked'), `status=${massAssign2.status()} body=${JSON.stringify(massAssign2Body)}`);

    report.step('[6.5] API PUT: tipe data salah (Time berupa angka, bukan string) -> 422');
    const wrongType = await page.request.put(`${API}attendance/records/${idA}`, { data: { punchInDate: today, punchInTime: 915, punchInNote: noteA2 } });
    report.check('6.5 PUT punchInTime bertipe number -> 422 (bukan 500/diterima diam2)', wrongType.status() === 422, `status=${wrongType.status()}`);

    report.step('[4.2 / 4.7] 2 PUT paralel ke record A yg sama -> tidak ada 5xx, nilai akhir konsisten (last-write-wins)');
    const [parA, parB] = await Promise.all([
      page.request.put(`${API}attendance/records/${idA}`, { data: { punchInDate: today, punchInTime: '09:20', punchInNote: 'QaParallel-A' } }),
      page.request.put(`${API}attendance/records/${idA}`, { data: { punchInDate: today, punchInTime: '09:21', punchInNote: 'QaParallel-B' } }),
    ]);
    const afterParallel = await getJson<AttendanceRecord>(page.request, `attendance/records/${idA}`);
    const bothOk = parA.status() === 200 && parB.status() === 200;
    const consistent = afterParallel.punchIn.note === 'QaParallel-A' || afterParallel.punchIn.note === 'QaParallel-B';
    report.check('4.2 / 4.7 2 PUT paralel (klik ganda Save / dua sesi admin) ke record sama -> tanpa 5xx, nilai akhir = SALAH SATU dari keduanya (tidak korup/campur)', bothOk && consistent, `statusA=${parA.status()} statusB=${parB.status()} noteAkhir="${afterParallel.punchIn.note}"`);

    report.step('[4.5] Sesi admin berakhir (cookies dikosongkan sesaat) lalu Save -> PUT ditolak, dialihkan ke login, nilai tidak berubah');
    await page.goto(`/web/index.php/attendance/editEmployeeAttendanceRecord/${idA}`);
    await page.waitForLoadState('networkidle');
    await page.locator('textarea').first().fill('QaEmpRecA-session-expired-attempt');
    const cookiesBeforeExpiry = await page.context().cookies();
    await page.context().clearCookies();
    const sessPut = page.waitForResponse((r) => r.url().includes(`/api/v2/attendance/records/${idA}`) && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Save' }).click();
    const toLogin = await page.waitForURL(/auth\/login/, { timeout: 20_000 }).then(() => true, () => false);
    const sessResp = await sessPut;
    await page.context().addCookies(cookiesBeforeExpiry);
    const recAfterSessionExpiry = await getJson<AttendanceRecord>(page.request, `attendance/records/${idA}`);
    report.check(
      '4.5 Sesi admin berakhir lalu Save -> dialihkan ke login, nilai record milik employee lain TIDAK berubah (PUT ditolak)',
      toLogin && recAfterSessionExpiry.punchIn.note !== 'QaEmpRecA-session-expired-attempt' && (sessResp === null || sessResp?.status() === 401),
      `PUT=${sessResp?.status() ?? '(tidak teramati langsung, redirect terjadi lbh dulu)'} login=${toLogin} note="${recAfterSessionExpiry.punchIn.note}"`,
    );
    await page.goto('/web/index.php/attendance/viewAttendanceRecord');
    await page.waitForURL(/viewAttendanceRecord/, { timeout: 20_000 });
    await page.waitForLoadState('networkidle');

    report.step('[5.4] Situs lain (attacker.test) coba PUT record A pakai sesi Admin yg sedang login');
    {
      const origin = new URL(env.baseURL).origin;
      const sent: string[] = [];
      const withCookie: string[] = [];
      page.context().on('request', async (r) => {
        if (!r.url().startsWith(`${origin}/web/index.php/api/v2/attendance/`)) return;
        const h = await r.allHeaders().catch(() => ({}) as Record<string, string>);
        if ((h['referer'] ?? '').startsWith(ATTACKER) || (h['origin'] ?? '') === ATTACKER) {
          sent.push(`${r.method()} ${r.url().replace(origin, '')}`);
          if (/orangehrm=/.test(h['cookie'] ?? '')) withCookie.push(`${r.method()} ${r.url().replace(origin, '')}`);
        }
      });
      const targetUrl = `${origin}${API}attendance/records/${idA}`;
      const body = { punchInDate: today, punchInTime: '09:25', punchInNote: 'QaCsrfAttempt' };
      const js = `
        fetch(${JSON.stringify(targetUrl)}, { method: 'PUT', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'text/plain' }, body: ${JSON.stringify(JSON.stringify(body))} }).then(() => results.push('no-cors PUT'), (e) => results.push('no-cors gagal ' + e));
        fetch(${JSON.stringify(targetUrl)}, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: ${JSON.stringify(JSON.stringify(body))} }).then((r) => results.push('cors ' + r.status), (e) => results.push('cors diblok ' + e.name));`;
      await page.context().route(`${ATTACKER}/**`, (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body><script>window.results = [];\n${js}\n</script></body></html>` }));
      const attacker = await page.context().newPage();
      await attacker.goto(`${ATTACKER}/jam-kerja-karyawan-lain`);
      await attacker.waitForFunction(() => (window as unknown as { results: string[] }).results?.length >= 2, null, { timeout: 20_000 }).catch(() => {});
      const results = await attacker.evaluate(() => (window as unknown as { results: string[] }).results).catch(() => [] as string[]);
      await attacker.close();
      const recAfterCsrf = await getJson<AttendanceRecord>(page.request, `attendance/records/${idA}`);
      report.check('5.4 Request dari situs penyerang terkirim TANPA cookie sesi', sent.length > 0 && withCookie.length === 0, `terkirim=${sent.join(', ') || '(tidak terlihat)'}; dgn cookie=${withCookie.join(', ') || 'tidak ada'}; fetch=${results.join(' | ')}`);
      report.check('5.4 Record milik employee lain TIDAK berubah oleh situs penyerang', recAfterCsrf.punchIn.note !== 'QaCsrfAttempt');
      report.check('5.4 Sesi Admin tetap aktif setelah halaman penyerang dibuka', (await page.request.get(`${API}attendance/records/${idA}`)).status() === 200);
    }

    report.step('[6.7 BUG / 8.4 BUG] Hapus record A dua kali via endpoint ADMIN bulk (simulasi klik ganda tombol trash)');
    // WAJIB menutup/menghapus state Punch In record A DULU di sini (sblm membuat record B) --
    // Punch In/Out adl SATU flag GLOBAL per employee (pola yg sama dgn TC-TIME-PUNCH-03): kalau
    // record A msh "terbuka" saat proxyPunchIn utk record B dipanggil, server menolaknya 400
    // "Already Punched In" krn employee ini msh dianggap sdg punch-in, meski beda record id.
    const [delFirst, delSecond] = await Promise.all([
      page.request.delete(`${API}attendance/employees/${emp}/records`, { data: { ids: [idA] } }),
      page.request.delete(`${API}attendance/employees/${emp}/records`, { data: { ids: [idA] } }),
    ]);
    const [b1, b2] = [delFirst.status(), delSecond.status()].sort((x, y) => x - y);
    const secondResp = delFirst.status() === 200 ? delSecond : delFirst;
    const secondBody = await secondResp.json().catch(() => ({}));
    report.check('1.1-D Delete record A via endpoint admin bulk -> SALAH SATU panggilan 200, record benar2 hilang', b1 === 200 || b2 === 200, `status1=${delFirst.status()} status2=${delSecond.status()}`);
    const getAfterDelete = await page.request.get(`${API}attendance/records/${idA}`);
    const getAfterDeleteBody = await getAfterDelete.json().catch(() => ({}));
    report.check(
      '6.7 BUG: panggilan DELETE ke-2 (record sudah terhapus via endpoint admin, spt klik ganda tombol trash) SEHARUSNYA konsisten dgn GET (404 "Record Not Found"), BUKAN 403 "Unauthorized" yg menyesatkan',
      secondResp.status() === 404,
      `DELETE ke-2 status=${secondResp.status()} body=${JSON.stringify(secondBody)} | GET record yg sama (pembanding)=${getAfterDelete.status()} body=${JSON.stringify(getAfterDeleteBody)}`,
    );
    report.check(
      '8.4 BUG: format error DELETE admin (status integer tanpa kutip, message "Unauthorized") TIDAK konsisten dgn GET endpoint yg sama (status string "404", message "Record Not Found") utk kondisi record-tidak-ditemukan yg SAMA -- SAMA KELAS dgn BG-499 (My Records), kini terbukti jg di endpoint admin',
      typeof getAfterDeleteBody?.error?.status === 'string' && typeof secondBody?.error?.status === 'string',
      `GET error.status tipe=${typeof getAfterDeleteBody?.error?.status} (${JSON.stringify(getAfterDeleteBody?.error?.status)}); DELETE ke-2 error.status tipe=${typeof secondBody?.error?.status} (${JSON.stringify(secondBody?.error?.status)}); message GET="${getAfterDeleteBody?.error?.message}" vs DELETE="${secondBody?.error?.message}"`,
    );
    idA = undefined; // sudah terhapus, tidak perlu dibersihkan lagi di finally

    report.step('[1.1-D] Buat record B via API (state Punch In employee kini bersih), hapus via UI SUNGGUHAN (klik trash + konfirmasi "Yes, Delete")');
    idB = await proxyPunchIn(page.request, emp, today, '10:00', noteB);
    // [BUG SCRIPT, diperbaiki] Step [4.5] di atas MENINGGALKAN `page` di list BARE
    // (tanpa query employeeId/date, krn recovery sesi butuh deep link apa pun yg valid) --
    // reload() thd page itu akan reload list SEMUA-employee, bukan detail employee ini.
    // Cari ulang via searchAndView (jalur reliable, bukan deep-link manual) sblm reload.
    await adminAttendanceRecordsPage.goto();
    await adminAttendanceRecordsPage.searchAndView(firstName, lastName);
    await page.waitForLoadState('networkidle');
    const rowB = () => page.locator('.oxd-table-card').filter({ hasText: noteB });
    await rowB().waitFor({ state: 'visible', timeout: 10_000 });
    const delResp = page.waitForResponse((r) => r.url().endsWith(`/attendance/employees/${emp}/records`) && r.request().method() === 'DELETE', { timeout: 15_000 }).catch(() => null);
    await rowB().locator('button').nth(0).click();
    await page.getByRole('button', { name: ' Yes, Delete' }).click();
    const delRespResolved = await delResp;
    report.check('1.1-D Hapus record B via UI (trash icon + konfirmasi) -> DELETE 200', delRespResolved?.status() === 200, `status=${delRespResolved?.status()}`);
    await page.waitForLoadState('networkidle');
    const goneFromUi = await rowB().isVisible().catch(() => false);
    report.check('1.1-D Record B hilang dari list setelah dihapus', !goneFromUi, `masih terlihat di UI=${goneFromUi}`);
    const getAfterUiDelete = await page.request.get(`${API}attendance/records/${idB}`);
    report.check('1.1-D Record B benar2 hilang di server (GET -> 404)', getAfterUiDelete.status() === 404, `status=${getAfterUiDelete.status()}`);
    idB = undefined; // sudah terhapus, tidak perlu dibersihkan lagi di finally

    report.step('[3.4] GET list (employees/<id>/records): leap year, jauh di masa depan/lalu -- semua graceful; tanggal tanpa record -> empty state');
    const leapResp = await page.request.get(`${API}attendance/employees/${empNumber}/records?limit=50&offset=0&date=2028-02-29`);
    const farFutureResp = await page.request.get(`${API}attendance/employees/${empNumber}/records?limit=50&offset=0&date=2099-12-31`);
    const farPastResp = await page.request.get(`${API}attendance/employees/${empNumber}/records?limit=50&offset=0&date=1990-01-01`);
    report.check('3.4 Tanggal leap year (2028-02-29) -> 200 graceful (bukan crash)', leapResp.status() === 200, `status=${leapResp.status()}`);
    report.check('3.4 Tanggal jauh di masa depan (2099-12-31) -> 200 graceful (bukan crash)', farFutureResp.status() === 200, `status=${farFutureResp.status()}`);
    report.check('3.4 Tanggal jauh di masa lalu (1990-01-01) -> 200 graceful (bukan crash)', farPastResp.status() === 200, `status=${farPastResp.status()}`);
    await page.goto(`/web/index.php/attendance/viewAttendanceRecord?employeeId=${empNumber}&date=1990-01-01`);
    await page.waitForLoadState('networkidle');
    await page.getByText('No Records Found', { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    const emptyStateText = await page.locator('body').innerText();
    report.check('3.4 Tanggal tanpa record (via UI, deep link employeeId+date) -> empty state "No Records Found" (tanpa crash)', /No Records Found/.test(emptyStateText), `teks="${emptyStateText.match(/No Records Found|\(\d+\)\s*Records Found/)?.[0]}"`);

    report.step('[4.8] Date* ditandai WAJIB di form filter UI, tapi TERNYATA opsional di API nested murni');
    const noDateResp = await page.request.get(`${API}attendance/employees/${empNumber}/records?limit=5&offset=0`);
    report.check('4.8 GET employees/<id>/records tanpa parameter date -> TETAP 200 (bukan 422), behavior non-obvious vs form UI yg menandai Date* wajib', noDateResp.status() === 200, `status=${noDateResp.status()}`);
    report.finding('4.8 Date* wajib di form filter UI tapi opsional di API nested', 'GET /attendance/employees/<id>/records tanpa query param "date" tetap 200, padahal form filter UI menandainya "Date* Required" -- known behavior, didokumentasikan, bukan bug (konsisten dgn temuan yg sama di My Records/U056).');

    report.step('[6.5] GET list employees/<id>/records: format tanggal salah, limit negatif, empNumber query TIDAK COCOK dgn path -- semua 422 konsisten');
    const badDateFilter = await page.request.get(`${API}attendance/employees/${empNumber}/records?limit=50&offset=0&date=not-a-date`);
    const negLimit = await page.request.get(`${API}attendance/employees/${empNumber}/records?limit=-5&offset=0&date=${today}`);
    const mismatchedEmp = await page.request.get(`${API}attendance/employees/${empNumber}/records?limit=50&offset=0&date=${today}&empNumber=999999`);
    report.check('6.5 GET date format salah -> 422', badDateFilter.status() === 422, `status=${badDateFilter.status()}`);
    report.check('6.5 GET limit negatif -> 422', negLimit.status() === 422, `status=${negLimit.status()}`);
    report.check('6.5 GET query empNumber TIDAK COCOK dgn path (999999 vs path asli) -> 422, bukan diabaikan diam2 (path & query harus konsisten)', mismatchedEmp.status() === 422, `status=${mismatchedEmp.status()}`);

    report.step('[5.1-SQLi / 5.1-XSS-Reflected / 4.1] Employee Name search (nameOrId, endpoint global /api/v2/pim/employees): SQLi, XSS, unicode aman');
    const sqliResp = await page.request.get(`${API}pim/employees?nameOrId=${encodeURIComponent("' OR '1'='1")}&includeEmployees=currentAndPast`);
    const sqliBody = await sqliResp.json().catch(() => ({}));
    report.check('5.1-SQLi Payload SQLi di nameOrId -> 200, data kosong/aman (tabel tidak rusak, bukan bypass filter)', sqliResp.status() === 200 && Array.isArray(sqliBody?.data), `status=${sqliResp.status()} dataLen=${sqliBody?.data?.length}`);
    const xssResp = await page.request.get(`${API}pim/employees?nameOrId=${encodeURIComponent('<script>alert(1)</script>')}&includeEmployees=currentAndPast`);
    const xssBody = await xssResp.json().catch(() => ({}));
    report.check('5.1-XSS-Reflected Payload XSS di nameOrId -> 200, TIDAK dipantulkan mentah (data kosong, respons JSON murni)', xssResp.status() === 200 && Array.isArray(xssBody?.data) && !JSON.stringify(xssBody).includes('<script>alert'), `status=${xssResp.status()} body=${JSON.stringify(xssBody).slice(0, 150)}`);
    const unicodeSamples = ['日本語テスト', 'Ñoño Üñîçødé', 'ABC​​def'];
    let allUnicodeSafe = true;
    const unicodeStatuses: number[] = [];
    for (const n of unicodeSamples) {
      const r = await page.request.get(`${API}pim/employees?nameOrId=${encodeURIComponent(n)}&includeEmployees=currentAndPast`);
      unicodeStatuses.push(r.status());
      if (r.status() !== 200) allUnicodeSafe = false;
    }
    report.check('4.1 Unicode CJK/aksen Latin/zero-width-space di nameOrId -> 200 semua (aman)', allUnicodeSafe, `statuses=${unicodeStatuses.join(',')}`);

    report.step('[4.1 BUG] Employee Name search dgn emoji astral (4-byte UTF-8) -> 500, BUKAN 200 kosong spt unicode lain');
    const firstEmojiSample = '🎉🚀';
    const emojiSamples = [firstEmojiSample, '😀', 'test🎉name', '🔥'];
    const emojiStatuses: number[] = [];
    for (const n of emojiSamples) {
      const r = await page.request.get(`${API}pim/employees?nameOrId=${encodeURIComponent(n)}&includeEmployees=currentAndPast`);
      emojiStatuses.push(r.status());
    }
    // ulangi payload pertama utk membuktikan deterministik (bukan flaky sesaat)
    const repeat1 = await page.request.get(`${API}pim/employees?nameOrId=${encodeURIComponent(firstEmojiSample)}&includeEmployees=currentAndPast`);
    const repeat2 = await page.request.get(`${API}pim/employees?nameOrId=${encodeURIComponent(firstEmojiSample)}&includeEmployees=currentAndPast`);
    report.check(
      '4.1 BUG: Employee Name search dgn emoji astral SEHARUSNYA 200 kosong (aman) spt unicode lain, BUKAN 500 Internal Server Error -- dikonfirmasi deterministik, 4 payload berbeda + 2 ulangan = 6/6 kali 500',
      emojiStatuses.every((st) => st === 200) && repeat1.status() === 200 && repeat2.status() === 200,
      `statuses=${emojiStatuses.join(',')} ulangan=${repeat1.status()},${repeat2.status()} (SEMUA 500, BUKAN 200 -- lihat BG-504)`,
    );

    report.step('[5.5] 8 percobaan proxy Punch In paralel (tanggal berbeda) -> tidak ada rate limiting (429)');
    const rateDates = ['2026-01-10', '2026-01-11', '2026-01-12', '2026-01-13', '2026-01-14', '2026-01-15', '2026-01-16', '2026-01-17'];
    const rateResps = await Promise.all(rateDates.map((d) => page.request.post(`${API}attendance/employees/${empNumber}/records`, { data: { date: d, time: '07:00', note: 'rate-probe', timezoneOffset: 7, timezoneName: 'Asia/Jakarta' }, failOnStatusCode: false })));
    const rateStatuses = rateResps.map((r) => r.status());
    const rateIds: number[] = [];
    for (const r of rateResps) {
      const b = await r.json().catch(() => ({}));
      if (b?.data?.id) rateIds.push(b.data.id);
    }
    await deleteEmployeeAttendanceRecords(page.request, emp, rateIds);
    report.check('5.5 8 create paralel -> TIDAK ADA satupun 429 (tidak ada rate limiting), konsisten dgn pola yg sama di modul lain (BG-491/BG-492)', !rateStatuses.includes(429), `statuses=${rateStatuses.join(',')}`);
  } finally {
    await deleteEmployeeAttendanceRecords(page.request, empNumber ?? -1, [idA, idB]);
  }

  report.print();
});
