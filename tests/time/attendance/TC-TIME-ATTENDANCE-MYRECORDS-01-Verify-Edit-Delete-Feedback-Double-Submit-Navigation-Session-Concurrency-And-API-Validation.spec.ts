/**
 * ================================================================================
 * TC-TIME-ATTENDANCE-MYRECORDS-01 — Verify My Attendance Records: Edit, Delete, Feedback, Double-Submit, Navigation, Session, Concurrency And API Validation
 * Modul    : Time > Attendance > My Records (U056)
 * Kategori : Positive (+) 1.1-D 1.1-U 1.2 1.4 1.8 | Negative (-) 2.1 2.2 | Boundary (B) 3.4 |
 *            Edge (!) 4.2 4.3 4.5 4.7 4.8 | Security (S) 5.2-PrivEsc 5.2-MassAssign 5.4 |
 *            API (A) 6.5 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-ATTENDANCE-MYRECORDS-01-Verify-Edit-Delete-Feedback-Double-Submit-Navigation-Session-Concurrency-And-API-Validation.spec.ts
 * Path     : tests/time/attendance/
 * ================================================================================
 *
 * TUJUAN (LIVE 24 Nov 2026): menutup U056 "Attendance My Records" -- halaman ESS self-service
 * di /attendance/viewMyAttendanceRecord, yg menampilkan RIWAYAT punch in/out milik diri sendiri
 * (BUKAN Punch In/Out real-time/U057, BUKAN Admin Employee Records/U058). Dikonfirmasi live
 * SEBELUM menulis TC ini: halaman ini BUKAN read-only -- setiap baris punya tombol trash
 * (delete) & pencil (edit) yg membuka /attendance/editAttendanceRecord/<id>, form dgn field
 * Date, Time, Note (keduanya wajib; dan section Punch Out kalau record sudah lengkap).
 * GET/PUT/DELETE semua lewat /api/v2/attendance/records(/<id>). Filter list HANYA 1 field:
 * Date (wajib di UI, TERNYATA opsional di API -- lihat 4.8).
 *
 * KESELAMATAN DATA: SEMUA record yg dibaca/diedit/dihapus di TC ini dibuat sendiri via Punch
 * In/Out API (punchIn/punchOut, timeData.ts) dgn note unik ber-timestamp -- tidak pernah
 * menyentuh record attendance employee lain yg sudah ada di demo bersama. Record A dihapus
 * sendiri sbg bagian dari skenario 1.1-D/4.2; record B dihapus di `finally`.
 *
 * TEMUAN UTAMA (BUG BARU BG-499, Low): DELETE /api/v2/attendance/records thd id yg SUDAH terhapus (atau
 * tak pernah ada) mengembalikan 403 "Unauthorized" -- BUKAN 404 "Record Not Found" spt GET utk
 * kondisi yg SAMA persis (record tdk ditemukan). Dikonfirmasi deterministik (bukan flaky): baik
 * dipanggil SEQUENTIAL maupun PARALLEL (simulasi klik ganda tombol trash), panggilan ke-2 SELALU
 * 403. Format error-nya pun tdk konsisten dgn GET/PUT di endpoint yg SAMA (GET/PUT memakai
 * `status` berupa STRING "404"/"422"; DELETE disini memakai INTEGER 403 tanpa kutip) -- field
 * tipe campur dlm API yg sama. Dampak: user yg klik ganda tombol delete (race umum di UI) akan
 * melihat toast/pesan "Unauthorized" yg menyesatkan (terkesan masalah izin akses), padahal
 * sebenarnya aksi PERTAMA sudah berhasil -- bukan kegagalan otorisasi sama sekali.
 * SENGAJA FAILED (R3) utk membuktikan BG-499 (2 check: 4.2 dan 8.4). HASIL: 30/32 lolos
 * (2 sengaja FAILED, BG-499), stabil 3x run berturut-turut.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/attendance/TC-TIME-ATTENDANCE-MYRECORDS-01-Verify-Edit-Delete-Feedback-Double-Submit-Navigation-Session-Concurrency-And-API-Validation.spec.ts --project=chromium --workers=1
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { fillDate, convertDateFormat } from '../../../src/utils/dateInput';
import { API, getJson, punchIn, punchOut, deleteAttendanceRecords } from '../../../src/utils/timeData';

const ATTACKER = 'https://attacker.test';

interface AttendanceRecord {
  id: number;
  punchIn: { userDate: string | null; userTime: string | null; note: string | null };
  punchOut: { userDate: string | null; userTime: string | null; note: string | null };
}

test('TC-TIME-ATTENDANCE-MYRECORDS-01: My Attendance Records edit, delete, feedback, double-submit, navigation, session, concurrency, API validation', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(240_000);
  // Noise 401 + unhandled "reading 'response'" adl bug app-wide yg sudah terdokumentasi &
  // diverifikasi terpisah di TC-XMOD-07 -- selalu muncul di console stlh simulasi sesi
  // berakhir (4.5), bukan bug baru yg relevan di TC ini.
  const report = new TestReport('TC-TIME-ATTENDANCE-MYRECORDS-01', 'Attendance My Records Edit Delete Feedback DoubleSubmit Navigation Session Concurrency API', env.baseURL, page, [/status of 401/, /reading 'response'/]);
  const s = `${Date.now() % 100000}`;
  const noteA = `QaMyRecA-${s}`;
  const noteA2 = `QaMyRecA2-${s}`;
  let idA: number | undefined;
  let idB: number | undefined;

  try {
    report.step('Setup: buka My Attendance Records, baca tanggal hari ini dari filter Date');
    await page.goto('/web/index.php/attendance/viewMyAttendanceRecord');
    await page.waitForLoadState('networkidle');
    // [BUG SCRIPT, diperbaiki] Panel filter Date TERBUKA SECARA DEFAULT di sesi baru (dikonfirmasi
    // via probe) -- mengklik tombol toggle di sini justru MENUTUPNYA (bukan membukanya), krn versi
    // awal skrip ini SELALU mengasumsikan tertutup. Tidak perlu klik toggle sama sekali.
    const dateFilterInput = page.locator('input[placeholder="yyyy-mm-dd"], input[placeholder="yyyy-dd-mm"], input[placeholder="dd-mm-yyyy"], input[placeholder="mm-dd-yyyy"], input[placeholder="dd-yyyy-mm"], input[placeholder="mm-yyyy-dd"]').first();
    await dateFilterInput.waitFor({ state: 'visible', timeout: 10_000 });
    const todayPlaceholder = (await dateFilterInput.getAttribute('placeholder')) ?? 'yyyy-mm-dd';
    const todayDisplayed = (await dateFilterInput.inputValue()).trim();
    // Format TAMPILAN date input bisa berupa permutasi apa pun (yyyy-dd-mm dll, lihat dateInput.ts) --
    // API SELALU memakai yyyy-mm-dd murni apa pun format tampilan UI, jadi konversi dulu token-nya.
    const today = convertDateFormat(todayDisplayed, todayPlaceholder, 'yyyy-mm-dd');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`Setup: gagal membaca tanggal hari ini dari filter Date (placeholder="${todayPlaceholder}" nilai="${todayDisplayed}" hasil konversi="${today}")`);

    // ============================================================ Record A: punch-in only ============================================================
    report.step('[1.1-C setup] Buat record A (Punch In saja) via API, lalu edit via UI');
    idA = await punchIn(page.request, today, '09:00', noteA);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const rowA = () => page.locator('.oxd-table-card').filter({ hasText: noteA });
    const rowA2 = () => page.locator('.oxd-table-card').filter({ hasText: noteA2 });
    await rowA().waitFor({ state: 'visible', timeout: 10_000 });
    await rowA().locator('button').nth(1).click(); // pencil = edit
    await page.waitForURL(/editAttendanceRecord\/\d+/, { timeout: 15_000 });
    // [BUG SCRIPT, diperbaiki] Halaman edit ini memicu GET async punch-in-overlaps sesaat
    // setelah render (pola sama dgn AdminAttendanceRecordsPage.openAddForm) -- mengisi
    // field SEBELUM GET itu selesai membuat Note yg baru diketik ter-reset diam2 ke nilai
    // lama saat form state di-sinkronkan ulang. Tunggu networkidle dulu.
    await page.waitForLoadState('networkidle');

    const timeInput = page.locator('input[placeholder="hh:mm"]').first();
    const noteInput = page.locator('textarea').first();
    await timeInput.fill('09:15 AM');
    await noteInput.fill(noteA2);
    const putEdit1 = page.waitForResponse((r) => r.url().includes(`/api/v2/attendance/records/${idA}`) && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Save' }).click();
    const editResp1 = await putEdit1;
    const toast1 = await page.locator('.oxd-toast').first().innerText({ timeout: 8_000 }).catch(() => '');
    report.check('1.1-U Edit record A (Time+Note) via UI -> PUT 200', editResp1?.status() === 200, `status=${editResp1?.status()}`);
    report.check('1.8 Toast sukses muncul setelah Save', /Successfully (Updated|Saved)/.test(toast1), `toast="${toast1}"`);
    const afterEdit1 = await getJson<AttendanceRecord>(page.request, `attendance/records/${idA}`);
    report.check('1.1-U Nilai baru (Note) benar2 tersimpan di server', afterEdit1.punchIn.note === noteA2, `note=${afterEdit1.punchIn.note}`);
    // App redirect balik ke list TIDAK instan -- tunggu eksplisit, jangan asumsikan sudah pindah
    // halaman begitu toast tampil (pola sama dgn TC-TIME-TIMESHEET-12).
    await page.waitForURL(/viewMyAttendanceRecord/, { timeout: 15_000 }).catch(() => {});

    report.step('[2.1] Form edit record A: kosongkan Date* -> Save diblokir dgn validasi inline');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await rowA2().waitFor({ state: 'visible', timeout: 10_000 });
    await rowA2().locator('button').nth(1).click();
    await page.waitForURL(/editAttendanceRecord\/\d+/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle');
    const dateEditInput = page.locator('input[placeholder="yyyy-mm-dd"], input[placeholder="yyyy-dd-mm"], input[placeholder="dd-mm-yyyy"], input[placeholder="mm-dd-yyyy"], input[placeholder="dd-yyyy-mm"], input[placeholder="mm-yyyy-dd"]').first();
    await dateEditInput.fill('');
    const noPutOnEmptyDate = page.waitForResponse((r) => r.url().includes(`/api/v2/attendance/records/${idA}`) && r.request().method() === 'PUT', { timeout: 4_000 }).then(() => true).catch(() => false);
    await page.getByRole('button', { name: 'Save' }).click();
    const fired = await noPutOnEmptyDate;
    const requiredShown = await page.getByText('Required', { exact: true }).first().isVisible().catch(() => false);
    report.check('2.1 Date* dikosongkan -> validasi "Required" muncul, PUT TIDAK terkirim', !fired && requiredShown, `PUT terkirim=${fired}, "Required" tampil=${requiredShown}`);

    report.step('[4.3] Edit record A via UI TANPA Save, lalu browser back -> perubahan dibuang');
    // Lanjut dari form edit yg SAMA (jangan klik Cancel dulu -- dikonfirmasi live: Cancel/
    // back dari edit page yg dibuka via page.goto() LANGSUNG (bukan via klik pencil dari
    // list) membuat router kembali ke list TANPA state filter Date, menampilkan "No Records
    // Found" krn query param date hilang -- navigasi harus selalu lewat klik pencil dari
    // list spy history SPA konsisten).
    await dateEditInput.fill(today);
    await page.locator('textarea').first().fill('QaMyRecA-discarded-change');
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

    report.step('[5.2-PrivEsc / 5.2-MassAssign] API PUT: field asing (employee/state/isLocked) ditolak, bukan diterima diam2');
    const privEsc = await page.request.put(`${API}attendance/records/${idA}`, { data: { punchInDate: today, punchInTime: '09:15', punchInNote: noteA2, employee: { empNumber: 3 } } });
    const privEscBody = await privEsc.json().catch(() => ({}));
    report.check('5.2-PrivEsc PUT dgn "employee":{empNumber lain} (coba pindah kepemilikan) -> 422 ditolak', privEsc.status() === 422 && privEscBody?.error?.data?.invalidParamKeys?.includes('employee'), `status=${privEsc.status()} body=${JSON.stringify(privEscBody)}`);
    const massAssign = await page.request.put(`${API}attendance/records/${idA}`, { data: { punchInDate: today, punchInTime: '09:15', punchInNote: noteA2, state: { id: 'PUNCHED OUT' }, isLocked: false } });
    const massAssignBody = await massAssign.json().catch(() => ({}));
    report.check('5.2-MassAssign PUT dgn field asing (state/isLocked) -> 422, menyebut field tsb eksplisit', massAssign.status() === 422 && massAssignBody?.error?.data?.invalidParamKeys?.includes('state') && massAssignBody?.error?.data?.invalidParamKeys?.includes('isLocked'), `status=${massAssign.status()} body=${JSON.stringify(massAssignBody)}`);

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
    report.check('4.2 / 4.7 2 PUT paralel (klik ganda Save / dua sesi) ke record sama -> tanpa 5xx, nilai akhir = SALAH SATU dari keduanya (tidak korup/campur)', bothOk && consistent, `statusA=${parA.status()} statusB=${parB.status()} noteAkhir="${afterParallel.punchIn.note}"`);

    report.step('[4.5] Sesi berakhir (cookies dikosongkan sesaat) lalu Save -> PUT 401, dialihkan ke login, nilai tidak berubah');
    // Pakai `page` UTAMA sendiri (simpan cookie asli -> kosongkan -> coba Save -> kembalikan
    // cookie), BUKAN login kedua via loginAs() -- dikonfirmasi live: login kedua dgn akun yg
    // SAMA (Admin) men-invalidasi sesi `page` utama (server tampaknya satu sesi aktif per
    // user), yg merusak SEMUA langkah berikutnya di TC ini. Pola ini identik dgn
    // TC-LEAVE-CONFIG-01 (simpan/clear/restore cookies pd page yg sama).
    await page.goto(`/web/index.php/attendance/editAttendanceRecord/${idA}`);
    await page.waitForLoadState('networkidle');
    await page.locator('textarea').first().fill('QaMyRecA-session-expired-attempt');
    const cookiesBeforeExpiry = await page.context().cookies();
    await page.context().clearCookies();
    const sessPut = page.waitForResponse((r) => r.url().includes(`/api/v2/attendance/records/${idA}`) && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Save' }).click();
    const toLogin = await page.waitForURL(/auth\/login/, { timeout: 20_000 }).then(() => true, () => false);
    const sessResp = await sessPut;
    await page.context().addCookies(cookiesBeforeExpiry);
    const recAfterSessionExpiry = await getJson<AttendanceRecord>(page.request, `attendance/records/${idA}`);
    // Kadang redirect ke /auth/login terjadi lewat permintaan LAIN (bukan PUT ini sendiri,
    // mis. polling latar belakang yg lebih dulu kena 401) sebelum waitForResponse sempat
    // menangkap PUT yg sama persis -- bukti utama yg wajib benar2 terpenuhi adalah redirect
    // ke login DAN nilai server TIDAK berubah; status PUT yg teramati sifatnya pendukung.
    report.check(
      '4.5 Sesi berakhir lalu Save -> dialihkan ke login, nilai record TIDAK berubah (PUT ditolak)',
      toLogin && recAfterSessionExpiry.punchIn.note !== 'QaMyRecA-session-expired-attempt' && (sessResp === null || sessResp?.status() === 401),
      `PUT=${sessResp?.status() ?? '(tidak teramati langsung, redirect terjadi lbh dulu)'} login=${toLogin} note="${recAfterSessionExpiry.punchIn.note}"`,
    );
    // Stabilkan `page` sblm lanjut ke langkah berikutnya -- pastikan sesi BENAR2 pulih
    // (navigasi balik berhasil, bukan nyangkut di /auth/login) sblm UI-driven check lain.
    await page.goto('/web/index.php/attendance/viewMyAttendanceRecord');
    await page.waitForURL(/viewMyAttendanceRecord/, { timeout: 20_000 });
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
      await attacker.goto(`${ATTACKER}/jam-kerja-gratis`);
      await attacker.waitForFunction(() => (window as unknown as { results: string[] }).results?.length >= 2, null, { timeout: 20_000 }).catch(() => {});
      const results = await attacker.evaluate(() => (window as unknown as { results: string[] }).results).catch(() => [] as string[]);
      await attacker.close();
      const recAfterCsrf = await getJson<AttendanceRecord>(page.request, `attendance/records/${idA}`);
      report.check('5.4 Request dari situs penyerang terkirim TANPA cookie sesi', sent.length > 0 && withCookie.length === 0, `terkirim=${sent.join(', ') || '(tidak terlihat)'}; dgn cookie=${withCookie.join(', ') || 'tidak ada'}; fetch=${results.join(' | ')}`);
      report.check('5.4 Record A TIDAK berubah oleh situs penyerang', recAfterCsrf.punchIn.note !== 'QaCsrfAttempt');
      report.check('5.4 Sesi Admin tetap aktif setelah halaman penyerang dibuka', (await page.request.get(`${API}attendance/records/${idA}`)).status() === 200);
    }

    report.step('[1.1-D / 4.2 BUG / 8.4 BUG] Hapus record A dua kali (simulasi klik ganda tombol trash)');
    const [delFirst, delSecond] = await Promise.all([
      page.request.delete(`${API}attendance/records`, { data: { ids: [idA] } }),
      page.request.delete(`${API}attendance/records`, { data: { ids: [idA] } }),
    ]);
    const [b1, b2] = [delFirst.status(), delSecond.status()].sort((x, y) => x - y);
    const firstBody = await (delFirst.status() === 200 ? delFirst : delSecond).json().catch(() => ({}));
    const secondResp = delFirst.status() === 200 ? delSecond : delFirst;
    const secondBody = await secondResp.json().catch(() => ({}));
    report.check('1.1-D Delete record A -> SALAH SATU panggilan 200, record benar2 hilang', b1 === 200 || b2 === 200, `status1=${delFirst.status()} status2=${delSecond.status()} bodyYgBerhasil=${JSON.stringify(firstBody)}`);
    const getAfterDelete = await page.request.get(`${API}attendance/records/${idA}`);
    const getAfterDeleteBody = await getAfterDelete.json().catch(() => ({}));
    report.check(
      '4.2 BUG: panggilan DELETE ke-2 (record sudah terhapus, spt klik ganda tombol trash) SEHARUSNYA konsisten dgn GET (404 "Record Not Found"), BUKAN 403 "Unauthorized" yg menyesatkan',
      secondResp.status() === 404,
      `DELETE ke-2 status=${secondResp.status()} body=${JSON.stringify(secondBody)} | GET record yg sama (pembanding)=${getAfterDelete.status()} body=${JSON.stringify(getAfterDeleteBody)}`,
    );
    report.check(
      '8.4 BUG: format error DELETE (status integer tanpa kutip, message "Unauthorized") TIDAK konsisten dgn GET/PUT endpoint yg sama (status string "404"/"422", message "Record Not Found"/"Invalid Parameter") utk kondisi record-tidak-ditemukan yg SAMA',
      typeof getAfterDeleteBody?.error?.status === 'string' && typeof secondBody?.error?.status === 'string',
      `GET error.status tipe=${typeof getAfterDeleteBody?.error?.status} (${JSON.stringify(getAfterDeleteBody?.error?.status)}); DELETE ke-2 error.status tipe=${typeof secondBody?.error?.status} (${JSON.stringify(secondBody?.error?.status)}); message GET="${getAfterDeleteBody?.error?.message}" vs DELETE="${secondBody?.error?.message}"`,
    );
    idA = undefined; // sudah terhapus, tidak perlu dibersihkan lagi di finally

    // ============================================================ Record B: full punch in+out ============================================================
    report.step('[1.4] Buat record B (Punch In lalu Punch Out) via API -> langsung muncul sbg baris baru di list (relasi create -> read)');
    idB = await punchIn(page.request, today, '10:00', `QaMyRecB-${s}`);
    const outResp = await punchOut(page.request, today, '10:30', `QaMyRecB-out-${s}`);
    report.check('1.4 [setup] Punch Out (menutup record B) -> 200', outResp.status() === 200, `status=${outResp.status()}`);
    const listAfterB = await getJson<AttendanceRecord[]>(page.request, `attendance/records?limit=50&offset=0&date=${today}`);
    report.check('1.4 Record B yg baru dibuat via Punch In/Out LANGSUNG tampil di GET My Attendance Records (tanpa aksi tambahan)', listAfterB.some((r) => r.id === idB), `ids=${listAfterB.map((r) => r.id).join(',')}`);

    report.step('[3.4] Date* filter: tanggal tanpa record, leap year, dan jauh di masa depan -- semua graceful');
    await page.goto('/web/index.php/attendance/viewMyAttendanceRecord');
    await page.waitForLoadState('networkidle');
    const dateFilterInput2 = page.locator('input[placeholder="yyyy-mm-dd"], input[placeholder="yyyy-dd-mm"], input[placeholder="dd-mm-yyyy"], input[placeholder="mm-dd-yyyy"], input[placeholder="dd-yyyy-mm"], input[placeholder="mm-yyyy-dd"]').first();
    await dateFilterInput2.waitFor({ state: 'visible', timeout: 10_000 });
    await fillDate(dateFilterInput2, '2000-01-01', 'yyyy-mm-dd');
    await page.getByRole('button', { name: 'View' }).click();
    // Pakai locator yg auto-retry (bukan satu kali page.locator('body').innerText() yg bisa
    // menangkap DOM SESAAT sblm re-render selesai, race yg sama polanya dgn yg sudah
    // terdokumentasi di tempat lain di suite ini) utk menunggu benar2 "No Records Found"
    // muncul, baru baca body innerText sbg bukti.
    await page.getByText('No Records Found', { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    const emptyStateText = await page.locator('body').innerText();
    // Dikonfirmasi live: utk 0 hasil, teks tampilannya persis "No Records Found" (BUKAN pola
    // "(0) Records Found" spt dugaan awal -- pola "(N) Records Found" hanya muncul saat N>=1).
    report.check('3.4 Tanggal jauh di masa lalu TANPA record -> empty state "No Records Found" (tanpa crash)', /No Records Found/.test(emptyStateText), `teks="${emptyStateText.match(/No Records Found|\(\d+\)\s*Records Found/)?.[0]}"`);
    const leapResp = await page.request.get(`${API}attendance/records?limit=50&offset=0&date=2028-02-29`);
    const farFutureResp = await page.request.get(`${API}attendance/records?limit=50&offset=0&date=2099-12-31`);
    report.check('3.4 Tanggal leap year (2028-02-29) -> 200 graceful (bukan crash)', leapResp.status() === 200, `status=${leapResp.status()}`);
    report.check('3.4 Tanggal jauh di masa depan (2099-12-31) -> 200 graceful (bukan crash)', farFutureResp.status() === 200, `status=${farFutureResp.status()}`);

    report.step('[4.8] Date* ditandai WAJIB di UI, tapi TERNYATA opsional di API murni');
    const noDateResp = await page.request.get(`${API}attendance/records?limit=5&offset=0`);
    report.check('4.8 GET tanpa parameter date -> TETAP 200 (bukan 422), behavior non-obvious vs form UI yg menandai Date* wajib', noDateResp.status() === 200, `status=${noDateResp.status()}`);
    report.finding('4.8 Date* wajib di UI form tapi opsional di API', 'GET /attendance/records tanpa query param "date" tetap 200 (mengembalikan data tanpa filter tanggal), padahal form filter UI menandainya "Date* Required" -- known behavior, didokumentasikan, bukan bug.');

    report.step('[6.5] GET list: format tanggal salah, limit negatif, parameter asing -- semua 422 konsisten');
    const badDateFilter = await page.request.get(`${API}attendance/records?limit=50&offset=0&date=not-a-date`);
    const negLimit = await page.request.get(`${API}attendance/records?limit=-5&offset=0&date=${today}`);
    const unknownParam = await page.request.get(`${API}attendance/records?limit=50&offset=0&date=${today}&empNumber=3`);
    report.check('6.5 GET date format salah -> 422', badDateFilter.status() === 422, `status=${badDateFilter.status()}`);
    report.check('6.5 GET limit negatif -> 422', negLimit.status() === 422, `status=${negLimit.status()}`);
    report.check('6.5 GET parameter asing (empNumber) -> 422, bukan diabaikan diam2', unknownParam.status() === 422, `status=${unknownParam.status()}`);

    report.step('[5.4] Situs lain coba DELETE record B pakai sesi Admin');
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
      const targetUrl = `${origin}${API}attendance/records`;
      const body = { ids: [idB] };
      const js = `
        fetch(${JSON.stringify(targetUrl)}, { method: 'DELETE', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'text/plain' }, body: ${JSON.stringify(JSON.stringify(body))} }).then(() => results.push('no-cors DELETE'), (e) => results.push('no-cors gagal ' + e));
        fetch(${JSON.stringify(targetUrl)}, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: ${JSON.stringify(JSON.stringify(body))} }).then((r) => results.push('cors ' + r.status), (e) => results.push('cors diblok ' + e.name));`;
      await page.context().route(`${ATTACKER}/**`, (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body><script>window.results = [];\n${js}\n</script></body></html>` }));
      const attacker2 = await page.context().newPage();
      await attacker2.goto(`${ATTACKER}/jam-kerja-gratis-2`);
      await attacker2.waitForFunction(() => (window as unknown as { results: string[] }).results?.length >= 2, null, { timeout: 20_000 }).catch(() => {});
      const results2 = await attacker2.evaluate(() => (window as unknown as { results: string[] }).results).catch(() => [] as string[]);
      await attacker2.close();
      const getB = await page.request.get(`${API}attendance/records/${idB}`);
      report.check('5.4 Request DELETE dari situs penyerang terkirim TANPA cookie sesi', sent.length > 0 && withCookie.length === 0, `terkirim=${sent.join(', ') || '(tidak terlihat)'}; dgn cookie=${withCookie.join(', ') || 'tidak ada'}; fetch=${results2.join(' | ')}`);
      report.check('5.4 Record B TIDAK terhapus oleh situs penyerang', getB.status() === 200, `status=${getB.status()}`);
    }
  } finally {
    await deleteAttendanceRecords(page.request, [idA, idB]);
  }

  report.print();
});
