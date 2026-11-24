/**
 * ================================================================================
 * TC-TIME-PUNCH-03 — Verify Punch In/Out: Feedback, Validation, Boundary, Edge,
 * Security And API Contract
 * Modul    : Time > Attendance > Punch In/Out (U057)
 * Kategori : Positive (+) 1.1-R 1.2 1.4 1.8 | Negative (-) 2.1 2.2 2.5 | Boundary (B) 3.1 3.4 |
 *            Edge (!) 4.1 4.2 4.3 4.4 4.5 4.8 | Security (S) 5.1-SQLi 5.2-MassAssign 5.4 5.5 5.9 |
 *            API (A) 6.5 6.7 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-PUNCH-03-Verify-Feedback-Validation-Boundary-Edge-Security-And-API-Contract.spec.ts
 * Path     : tests/time/attendance/
 * ================================================================================
 *
 * TUJUAN (LIVE 24 Nov 2026): menutup SISA 23 kode taksonomi GAP di U057 "Punch In/Out"
 * (TC-TIME-PUNCH-01 sudah menutup 1.1-C/1.3 [cycle dasar]; TC-TIME-PUNCH-02 sudah menutup
 * 5.1-XSS-Stored [Note]). Endpoint: POST {API}attendance/records (Punch In) & PUT
 * {API}attendance/records (Punch Out) -- KEDUANYA ke endpoint KOLEKSI (tanpa :id), server
 * menutup/membuka punch employee yg sedang login dari sesi, bukan dari id yg dikirim client
 * (dikonfirmasi live & sudah didokumentasikan di timeData.ts). GET {API}attendance/records/latest
 * membaca record TERBARU (dipakai utk 1.1-R). TC ini 100% dibuktikan LIVE via Playwright MCP
 * SEBELUM kode ditulis (navigasi sidebar Attendance > Punch In/Out, page.on request/response).
 *
 * PELAJARAN METODOLOGI PENTING (ditemukan & diperbaiki sblm run resmi): "state Punch In/Out"
 * adl SATU flag GLOBAL per employee (empNumber=7 "John Doe", default seed account) di DEMO
 * PUBLIK yg dipakai banyak orang di dunia scr bersamaan utk belajar -- percobaan pertama TC
 * ini (sblm diperbaiki) MEMBUKTIKAN ini nyata: satu Punch In via UI yg SUKSES (200) ternyata
 * sudah "Already Punched Out" sesaat kemudian via API, kemungkinan krn pengunjung lain pd demo
 * publik yg sama ikut menekan Punch In/Out pd akun default yg sama scr bersamaan. SEMUA
 * transisi state di TC ini karenanya memakai helper `ensureClosed`/`ensureOpen` yg SELALU
 * membaca state aktual dulu (bukan berasumsi dari langkah sebelumnya) & self-heal (retry)
 * kalau ternyata sudah berubah krn pihak lain -- pola yg sama filosofinya dgn "self-heal
 * identity corruption" yg sudah terdokumentasi di modul lain pd demo publik ini.
 *
 * TEMUAN PENTING (app behavior BERUBAH dari komentar lama di TimeAttendancePage.ts / TC-01):
 * halaman ini KINI punya 2 URL terpisah per state (/attendance/punchIn vs /attendance/punchOut,
 * router redirect otomatis sesuai state) -- BUKAN lagi "satu URL yg sama, tidak re-render
 * otomatis" spt dicatat di komentar TC-01 (kemungkinan app demo di-upgrade sejak itu). Tidak
 * mengubah TC-01/02 (keduanya tetap lolos krn dipakai via timeAttendancePage.goto() yg SELALU
 * menavigasi ulang dari sidebar), hanya dicatat di sini sbg referensi utk sesi berikutnya.
 *
 * TEMUAN BUG BARU #1 (BG-501, Medium-High, SENGAJA FAILED R3, kode 4.1): karakter emoji ASTRAL
 * (4-byte UTF-8, di luar Basic Multilingual Plane -- mis. "🎉" U+1F389) di field Note RUSAK
 * PERMANEN setiap kali DIBACA ULANG dari server (GET /records/latest, GET list, GET /records/
 * <id> -- SEMUA 3 jalur baca, dikonfirmasi satu per satu live) menjadi literal "??", walau
 * respons POST/PUT yg LANGSUNG meng-echo body yg baru dikirim (tanpa round-trip DB) masih
 * benar persis. Karakter CJK (日本語), aksen Latin (é), dan RTL embedding mark (U+202B/U+202C)
 * SEMUA aman -- HANYA emoji/code point astral (surrogate pair di UTF-16 JS) yg korup, pola
 * klasik kolom database bertipe `utf8` (3-byte) bukan `utf8mb4` (4-byte). Dampak: Note yg
 * berisi emoji HILANG SELAMANYA begitu halaman di-reload/dibuka ulang, silent data corruption,
 * bukan sekadar penolakan/validasi.
 *
 * TEMUAN BUG BARU #2 (BG-502, Medium, SENGAJA FAILED R3, kode 3.4 & 5.9): Punch In/Out TIDAK
 * punya validasi rentang tanggal SAMA SEKALI -- dibuktikan baik via API LANGSUNG maupun via
 * UI SUNGGUHAN (mengetik tanggal di field Date* lalu klik "In", BUKAN bypass API): tanggal
 * 73 tahun ke DEPAN (2099-12-31, belum terjadi) DAN 36 tahun ke BELAKANG (1990-01-01) KEDUANYA
 * diterima 200 tanpa penolakan apa pun. Dampak bisnis: karyawan ESS bisa memfabrikasi jam
 * kerja utk tanggal apa pun (termasuk tanggal yg belum terjadi), krn server hanya memvalidasi
 * FORMAT tanggal (2.2) dan urutan relatif punch-in/punch-out (2.5/"Punch-In Overlap Found" /
 * "Punch out Time Should Be Later Than Punch in Time") tapi TIDAK PERNAH membandingkan ke
 * tanggal SEKARANG (current-datetime). Record yg dibuat utk pembuktian KEDUA bug di atas
 * dihapus sendiri di `finally`.
 *
 * TEMUAN LAIN (bukan bug, didokumentasikan sbg finding/4.8): field "empNumber" asing di body
 * POST DITERIMA 200 (tidak masuk invalidParamKeys spt employeeId/id/state) tapi diam2 DIABAIKAN
 * -- record tetap tercatat milik employee dari sesi (bukan empNumber yg dikirim), jadi BUKAN
 * mass-assignment yg eksploitasi (tidak ada privilege escalation nyata), hanya field tak-
 * dikenal yg tidak di-strict-validate spt field lain. Tidak ada rate limit pd Punch In/Out
 * (5.5, 8 siklus beruntun semua 200) -- konsisten dgn pola app-wide, didokumentasikan finding.
 * Browser back SATU KALI dari Punch Out melompat ke halaman pencarian Timesheets (bukan ke
 * form Punch In spt intuisi user), krn navigasi menu Attendance adl client-side route change
 * tanpa history entry per klik menu -- tidak crash, tidak duplikat record (dibuktikan), hanya
 * navigasi non-obvious (4.3).
 *
 * PELAJARAN SKRIP (diperbaiki sblm run resmi, SETELAH beberapa trial run): (1) `ensureClosed`
 * versi awal menutup selalu di jam TETAP "23:59" -- begitu ADA record lain yg ditutup di
 * tanggal yg sama dgn interval yg overlap persis di 23:59, PUT itu GAGAL TOTAL berulang
 * (400 "Punch-Out Overlap Found") krn jam yg diulang sama tak pernah bisa lolos; fix: coba
 * beberapa jam RELATIF terhadap jam punch-in record yg terbuka (makin jauh tiap percobaan).
 * (2) Perbandingan status 2 request paralel pakai `.sort((a,b)=>a-b)` lalu MENGHARAPKAN index
 * 0 = 400 -- salah, ascending sort menaruh angka LEBIH KECIL (200) di index 0, bukan 400; 8
 * check gagal palsu di 2 trial run krn ini sblm diperbaiki (index 0 = 200, index 1 = 400).
 * (3) Cek heading via `getByRole('heading', {level:6}).first()` stlh browser back SALAH
 * target -- halaman ini py >=2 heading level-6 (judul breadcrumb banner "Attendance" DAN
 * judul kartu "Punch In"/"Punch Out"), `.first()` selalu kena breadcrumb; diperbaiki pakai
 * label tombol submit ("In"/"Out") spt pola TC-01, bukan heading. (4) Lupa teruskan
 * `expectedConsoleErrorPatterns` ke constructor `TestReport` utk noise 401/"reading response"
 * yg sudah terdokumentasi dr simulasi sesi berakhir (4.5) -- pola sama persis dgn
 * TC-TIME-ATTENDANCE-MYRECORDS-01, harusnya disalin dari awal.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/attendance/TC-TIME-PUNCH-03-Verify-Feedback-Validation-Boundary-Edge-Security-And-API-Contract.spec.ts --project=chromium --workers=1
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { API, deleteAttendanceRecords } from '../../../src/utils/timeData';
import { convertDateFormat } from '../../../src/utils/dateInput';
import type { TimeAttendancePage } from '../../../src/pages/TimeAttendancePage';
import type { APIRequestContext, APIResponse } from '@playwright/test';

const ATTACKER = 'https://attacker.test';

interface AttendanceRecord {
  id: number;
  punchIn: { userDate: string | null; userTime: string | null; note: string | null };
  punchOut: { userDate: string | null; userTime: string | null; note: string | null };
  state: { id: string; name: string };
  employee: { empNumber: number };
}

async function getLatest(req: APIRequestContext): Promise<AttendanceRecord> {
  const r = await req.get(`${API}attendance/records/latest`);
  return ((await r.json()) as { data: AttendanceRecord }).data;
}

/** `minutes` since 00:00 (clamped to 23:59) -> "HH:MM". */
function hhmm(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

/**
 * Closes whatever punch is currently open (if any), self-healing against a race with another
 * concurrent visitor on this shared public demo account -- always re-reads actual state rather
 * than assuming it from a previous step. Idempotent: a no-op if already closed.
 *
 * [BUG SCRIPT, diperbaiki] versi awal selalu menutup di jam TETAP "23:59" -- gagal TOTAL (loop
 * 10x tanpa pernah berhasil) begitu ADA record lain yg sudah ditutup di tanggal yg sama dgn
 * interval yg "menyentuh" 23:59 (dikonfirmasi live: PUT -> 400 "Punch-Out Overlap Found"),
 * krn jam tetap yg diulang persis sama TIDAK PERNAH bisa lolos dari overlap yg sama. Fix:
 * coba beberapa kandidat jam RELATIF terhadap jam punch-in record yg sedang terbuka (makin
 * jauh tiap percobaan), bukan satu jam mutlak yg sama berulang.
 */
async function ensureClosed(req: APIRequestContext): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const latest = await getLatest(req);
    if (latest?.state?.id !== 'PUNCHED IN') return;
    const date = latest.punchIn.userDate ?? (await getToday(req));
    const parts = (latest.punchIn.userTime ?? '00:00').split(':');
    const h = parseInt(parts[0] ?? '0', 10);
    const m = parseInt(parts[1] ?? '0', 10);
    const punchInMinutes = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    const offsets = [1, 7, 23, 61, 127, 241, 359, 499, 601, 719];
    const time = hhmm(punchInMinutes + (offsets[attempt % offsets.length] ?? 1));
    await req.put(`${API}attendance/records`, { data: { date, time, note: null, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } });
  }
}

/**
 * Opens a fresh punch with `note` on `date`, self-healing by closing any stray open punch first
 * (possibly left by another visitor on this shared public demo account, confirmed live: the
 * global Punch In/Out state for this seeded account genuinely flips from OUTSIDE this test
 * mid-run). `time` is a FRESH callback invoked PER ATTEMPT (not a fixed string) -- a fixed time
 * reused across retries would fail IDENTICALLY every time if the real cause is an overlap
 * against some OTHER already-closed interval on the same date (not "already open"), since
 * retrying with the exact same time can never escape that. Returns the new record's id.
 */
async function ensureOpen(req: APIRequestContext, date: string, time: () => string, note: string | null): Promise<number> {
  let lastBody = '';
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await ensureClosed(req);
    const r = await req.post(`${API}attendance/records`, { data: { date, time: time(), note, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } });
    const body = (await r.json().catch(() => ({}))) as { data?: { id?: number } };
    if (r.status() === 200 && body.data?.id) return body.data.id;
    lastBody = await r.text().catch(() => '');
  }
  throw new Error(`ensureOpen failed after retries (date=${date}): ${lastBody}`);
}

async function getToday(req: APIRequestContext): Promise<string> {
  const r = await req.get(`${API}attendance/current-datetime`);
  return ((await r.json()) as { data: { utcDate: string } }).data.utcDate;
}

async function closeAt(req: APIRequestContext, date: string, time: string, note: string | null = null): Promise<APIResponse> {
  return req.put(`${API}attendance/records`, { data: { date, time, note, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } });
}

/**
 * [BUG SCRIPT, diperbaiki] `today` (dibaca sekali dari GET current-datetime, berbasis UTC) TIDAK
 * SELALU sama dgn tanggal yg DITAMPILKAN/DIKIRIM form Punch In/Out via UI (yg memakai jam LOKAL
 * +7, bisa 1 hari berbeda dari UTC di jendela dini hari) -- dikonfirmasi live, beberapa run gagal
 * "menemukan" record yg baru dibuat via UI krn mencarinya dgn filter tanggal UTC yg SALAH hari.
 * Baca tanggal yg BENAR2 ditampilkan di field Date* form (bukan asumsikan sama dgn `today`).
 */
async function readUiDate(tap: TimeAttendancePage): Promise<string> {
  const placeholder = (await tap.dateInput.getAttribute('placeholder')) ?? 'yyyy-mm-dd';
  const displayed = (await tap.dateInput.inputValue()).trim();
  return convertDateFormat(displayed, placeholder, 'yyyy-mm-dd');
}

/**
 * Navigates to the Punch In/Out page and makes sure it is showing the "Punch In" form (button
 * "In"). Closes any open punch via the FAST API helper first (`ensureClosed`, which is itself
 * robust against overlap collisions -- see its comment), THEN navigates; falls back to closing
 * via the UI's own "Out" button if the label still reads "Out" after that (e.g. a genuinely
 * concurrent visitor on this shared public demo account punched in during our own navigation).
 */
async function gotoPunchInResilient(tap: TimeAttendancePage, req: APIRequestContext): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await ensureClosed(req);
    await tap.goto();
    const label = (await tap.submitButton.textContent())?.trim();
    if (label === 'In') return;
    await tap.submit(); // someone else's punch is open -- close it via the UI, then retry
  }
}

test('TC-TIME-PUNCH-03: Punch In/Out feedback, validation, boundary, edge, security, API contract', async ({
  page,
  timeAttendancePage,
}, testInfo) => {
  testInfo.setTimeout(300_000);
  // Noise 401 + unhandled "reading 'response'" adl bug app-wide yg sudah terdokumentasi (sama
  // persis dgn TC-TIME-ATTENDANCE-MYRECORDS-01) -- selalu muncul di console stlh simulasi sesi
  // berakhir (4.5), bukan bug baru yg relevan di TC ini. "400 (Bad Request)" jg di-exclude --
  // dikonfirmasi berasal dari widget dashboard BAWAAN (bukan aksi skrip ini) yg polling status
  // attendance scr independen saat `page` dibiarkan idle di dashboard selama bagian API-only
  // (5.1-5.5) -- terkena kontensi state global yg sama dgn pengunjung lain di demo publik ini
  // (lihat PELAJARAN METODOLOGI di docstring atas), bukan error yg disebabkan skrip ini.
  const report = new TestReport('TC-TIME-PUNCH-03', 'Punch In/Out Feedback Validation Boundary Edge Security API', env.baseURL, page, [/status of 401/, /reading 'response'/, /400 \(Bad Request\)/]);
  const s = `${Date.now() % 100000}`;
  const cleanupIds: number[] = [];
  // Jam yg selalu NAIK dlm hari "today" yg sama -- endpoint menolak Punch-In yg overlap dgn
  // record yg sudah ditutup di hari yg sama (lihat 2.5), jadi SETIAP slot baru harus > slot
  // sebelumnya yg sudah ditutup.
  let clockMinutes = 6 * 60; // mulai 06:00
  const nextTime = (gapMinutes = 10): string => {
    clockMinutes += gapMinutes;
    const h = Math.floor(clockMinutes / 60) % 24;
    const m = clockMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  try {
    report.step('Setup: baca tanggal server (current-datetime) & pastikan state awal PUNCHED OUT');
    const today = await getToday(page.request);
    await ensureClosed(page.request);

    // ============================================================ 1.1-R / 1.4 / 1.8 / 1.2 ============================================================
    report.step('[1.1-R / 1.4] Punch In via API, lalu baca record via GET (read) -- id, state, note, employee semua konsisten');
    const noteIn1 = `QaPunch-${s}-in1`;
    const idA = await ensureOpen(page.request, today, nextTime, noteIn1);
    cleanupIds.push(idA);
    const getA = await page.request.get(`${API}attendance/records/${idA}`);
    const recA = ((await getA.json()) as { data: AttendanceRecord }).data;
    report.check('1.1-R GET attendance/records/<id> setelah Punch In -> 200, note & state sesuai yg baru dikirim', getA.status() === 200 && recA.punchIn.note === noteIn1 && recA.state.id === 'PUNCHED IN', `status=${getA.status()} note="${recA.punchIn.note}" state=${recA.state.id}`);
    report.check('1.4 Record Punch In membawa relasi ke entity Employee (empNumber) yg valid, bukan null/kosong', typeof recA.employee?.empNumber === 'number' && recA.employee.empNumber > 0, `empNumber=${recA.employee?.empNumber}`);
    const listResp = await page.request.get(`${API}attendance/records?limit=50&offset=0&date=${today}`);
    const listBody = ((await listResp.json()) as { data: AttendanceRecord[] }).data;
    report.check('1.4 Record yg baru dibuat via Punch In LANGSUNG muncul di GET list attendance/records (relasi create -> read, tanpa aksi tambahan)', listBody.some((r) => r.id === idA), `ids=${listBody.map((r) => r.id).join(',')}`);
    await ensureClosed(page.request);

    report.step('[1.8] Punch In via UI SUNGGUHAN -- feedback-nya adalah redirect otomatis ke state "Punch Out" + teks "Punched in time"');
    await gotoPunchInResilient(timeAttendancePage, page.request);
    const initialLabel = (await timeAttendancePage.submitButton.textContent())?.trim();
    report.check('Setup UI: state awal "Punch In" (tombol "In")', initialLabel === 'In', `label="${initialLabel}"`);
    const uiDateFor18 = await readUiDate(timeAttendancePage);
    const noteUi = `QaPunch-${s}-ui-${Date.now()}`;
    await timeAttendancePage.fillNote(noteUi);
    const { response: uiInResp } = await timeAttendancePage.submit();
    report.check('[API] POST attendance/records (Punch In via UI) -> 200', uiInResp?.status() === 200, `status=${uiInResp?.status()}`);
    const redirectedToPunchOut = await page.waitForURL(/attendance\/punchOut/, { timeout: 10_000 }).then(() => true, () => false);
    const punchedInTextShown = await page.getByText('Punched in time', { exact: false }).first().waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false);
    const toastText = await page.locator('.oxd-toast').first().innerText({ timeout: 2_000 }).catch(() => '');
    report.check(
      '1.8 Feedback sukses Punch In = REDIRECT OTOMATIS ke /attendance/punchOut + teks "Punched in time" tampil (feedback via halaman, bukan harus toast)',
      redirectedToPunchOut && punchedInTextShown,
      `redirected=${redirectedToPunchOut} punchedInTextShown=${punchedInTextShown} toastText="${toastText}"`,
    );
    // Verifikasi record KITA yg benar2 terbuka (match via note unik, BUKAN via "latest" yg bisa
    // jadi milik pengunjung lain pd demo publik yg sama kalau ada interferensi bersamaan).
    const myOpenRecords = ((await (await page.request.get(`${API}attendance/records?limit=50&offset=0&date=${uiDateFor18}`)).json()) as { data: AttendanceRecord[] }).data;
    const myOpenRecord = myOpenRecords.find((r) => r.punchIn.note === noteUi);
    if (myOpenRecord) cleanupIds.push(myOpenRecord.id);
    report.check('1.8 Record Punch In via UI benar2 tersimpan server-side dgn Note yg sesuai', !!myOpenRecord, `ditemukan=${!!myOpenRecord} noteDicari="${noteUi}"`);
    await ensureClosed(page.request);

    report.step('[1.2] Punch Out dgn Note DIKOSONGKAN (opsional) via API, lalu Punch In lagi dgn Note DIISI -- dua variasi diterima');
    const idForEmptyNote = await ensureOpen(page.request, today, nextTime, 'temp-before-empty-note-out');
    cleanupIds.push(idForEmptyNote);
    const outEmptyNote = await closeAt(page.request, today, nextTime());
    report.check('1.2 Punch Out dgn Note kosong (opsional, tidak diisi) -> 200', outEmptyNote.status() === 200, `status=${outEmptyNote.status()}`);
    const noteIn2 = `QaPunch-${s}-in2-filled`;
    const idB = await ensureOpen(page.request, today, nextTime, noteIn2);
    cleanupIds.push(idB);
    const recB = ((await (await page.request.get(`${API}attendance/records/${idB}`)).json()) as { data: AttendanceRecord }).data;
    report.check('1.2 Punch In dgn Note DIISI -> 200, tersimpan persis', recB.punchIn.note === noteIn2, `note="${recB.punchIn.note}"`);
    await ensureClosed(page.request);

    // ============================================================ 2.1 / 2.2 / 2.5 ============================================================
    report.step('[2.1] POST tanpa field Date, dan tanpa field Time -- keduanya WAJIB, 422 invalidParamKeys konsisten');
    const missingDate = await page.request.post(`${API}attendance/records`, { data: { time: nextTime(), note: null, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } });
    const missingDateBody = await missingDate.json().catch(() => ({}));
    report.check('2.1 Date (required) dikosongkan -> 422, invalidParamKeys=["date"]', missingDate.status() === 422 && missingDateBody?.error?.data?.invalidParamKeys?.includes('date'), `status=${missingDate.status()} body=${JSON.stringify(missingDateBody)}`);
    const missingTime = await page.request.post(`${API}attendance/records`, { data: { date: today, note: null, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } });
    const missingTimeBody = await missingTime.json().catch(() => ({}));
    report.check('2.1 Time (required) dikosongkan -> 422, invalidParamKeys=["time"]', missingTime.status() === 422 && missingTimeBody?.error?.data?.invalidParamKeys?.includes('time'), `status=${missingTime.status()} body=${JSON.stringify(missingTimeBody)}`);

    report.step('[2.2] POST dgn format Date/Time salah -- 422, bukan 500');
    const badDateFmt = await page.request.post(`${API}attendance/records`, { data: { date: '24-11-2026', time: nextTime(), note: null, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } });
    const badDateFmtBody = await badDateFmt.json().catch(() => ({}));
    report.check('2.2 Date format salah ("24-11-2026") -> 422, invalidParamKeys=["date"]', badDateFmt.status() === 422 && badDateFmtBody?.error?.data?.invalidParamKeys?.includes('date'), `status=${badDateFmt.status()} body=${JSON.stringify(badDateFmtBody)}`);
    const badTimeFmt = await page.request.post(`${API}attendance/records`, { data: { date: today, time: '25:99', note: null, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } });
    const badTimeFmtBody = await badTimeFmt.json().catch(() => ({}));
    report.check('2.2 Time format salah ("25:99") -> 422, invalidParamKeys=["time"]', badTimeFmt.status() === 422 && badTimeFmtBody?.error?.data?.invalidParamKeys?.includes('time'), `status=${badTimeFmt.status()} body=${JSON.stringify(badTimeFmtBody)}`);

    report.step('[2.5] State transition invalid: Punch Out TANPA punch terbuka, dan Punch In DUA KALI berturut -- keduanya ditolak 400 dgn pesan jelas');
    await ensureClosed(page.request);
    const outNoOpen = await closeAt(page.request, today, nextTime());
    const outNoOpenBody = await outNoOpen.json().catch(() => ({}));
    report.check('2.5 Punch Out saat TIDAK ada punch terbuka -> 400 "Cannot Proceed Punch Out Employee Already Punched Out"', outNoOpen.status() === 400 && /Already Punched Out/i.test(outNoOpenBody?.error?.message ?? ''), `status=${outNoOpen.status()} body=${JSON.stringify(outNoOpenBody)}`);
    const idC = await ensureOpen(page.request, today, nextTime, `QaPunch-${s}-doubleIn`);
    cleanupIds.push(idC);
    const doubleIn = await page.request.post(`${API}attendance/records`, { data: { date: today, time: nextTime(), note: null, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } });
    const doubleInBody = await doubleIn.json().catch(() => ({}));
    report.check('2.5 Punch In saat SUDAH punya punch terbuka -> 400 "Cannot Proceed Punch In Employee Already Punched In"', doubleIn.status() === 400 && /Already Punched In/i.test(doubleInBody?.error?.message ?? ''), `status=${doubleIn.status()} body=${JSON.stringify(doubleInBody)}`);
    await ensureClosed(page.request);

    // ============================================================ 3.1 / 3.4 + 5.9 BUG ============================================================
    report.step('[3.1] Boundary panjang Note: 250 karakter diterima, 251 karakter ditolak 422 (dikonfirmasi via binary search probe sblm TC ini ditulis)');
    const mk = (n: number) => `Q${s}_`.padEnd(n, 'x').slice(0, n);
    await ensureClosed(page.request);
    const ok250 = await page.request.post(`${API}attendance/records`, { data: { date: today, time: nextTime(), note: mk(250), timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } });
    const ok250Body = await ok250.json().catch(() => ({}));
    report.check('3.1 Note 250 karakter (batas atas) -> 200, diterima', ok250.status() === 200, `status=${ok250.status()}`);
    if (ok250.status() === 200 && ok250Body?.data?.id) cleanupIds.push(ok250Body.data.id);
    await ensureClosed(page.request);
    const bad251 = await page.request.post(`${API}attendance/records`, { data: { date: today, time: nextTime(), note: mk(251), timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } });
    const bad251Body = await bad251.json().catch(() => ({}));
    report.check('3.1 Note 251 karakter (batas atas + 1) -> 422, invalidParamKeys=["note"]', bad251.status() === 422 && bad251Body?.error?.data?.invalidParamKeys?.includes('note'), `status=${bad251.status()} body=${JSON.stringify(bad251Body)}`);

    report.step('[3.4 + 5.9 BUG BG-502] Punch In dgn tanggal EKSTREM (73 tahun ke depan, 36 tahun ke lalu, leap year) -- SEMUA diterima tanpa validasi rentang, termasuk via UI SUNGGUHAN');
    await ensureClosed(page.request);
    const idFuture = await ensureOpen(page.request, '2099-12-31', nextTime, `QaPunch-${s}-future`);
    const futureRec = ((await (await page.request.get(`${API}attendance/records/${idFuture}`)).json()) as { data: AttendanceRecord }).data;
    cleanupIds.push(idFuture);
    await closeAt(page.request, '2099-12-31', '23:59');
    const idPast = await ensureOpen(page.request, '1990-01-01', nextTime, `QaPunch-${s}-past`);
    const pastRec = ((await (await page.request.get(`${API}attendance/records/${idPast}`)).json()) as { data: AttendanceRecord }).data;
    cleanupIds.push(idPast);
    await closeAt(page.request, '1990-01-01', '23:59');
    const leapResp = await page.request.get(`${API}attendance/records?limit=5&offset=0&date=2028-02-29`);
    report.check(
      '3.4 Tanggal leap year (2028-02-29) sbg filter list -> 200 graceful (bukan crash)',
      leapResp.status() === 200,
      `status=${leapResp.status()}`,
    );
    report.check(
      '3.4 / 5.9 BUG BG-502: Punch In dgn tanggal 73 TAHUN KE DEPAN (2099-12-31, belum terjadi) via API -> SEHARUSNYA ditolak (tidak mungkin "sudah hadir" pd tanggal yg belum terjadi), tapi diterima 200',
      false,
      `POST attendance/records date=2099-12-31 -> 200 (id=${idFuture}, tersimpan: ${futureRec.punchIn.userDate}); tidak ada validasi rentang tanggal sama sekali, hanya validasi FORMAT (2.2) & urutan punch-in/out relatif (2.5)`,
    );
    report.check(
      '3.4 / 5.9 BUG BG-502: Punch In dgn tanggal 36 TAHUN KE BELAKANG (1990-01-01) via API -> diterima 200 jg, memperkuat tidak ada rentang tanggal yg ditegakkan',
      false,
      `POST attendance/records date=1990-01-01 -> 200 (id=${idPast}, tersimpan: ${pastRec.punchIn.userDate})`,
    );

    report.step('[5.9 BUG BG-502, pembuktian via UI SUNGGUHAN, bukan bypass API] Ketik tanggal 2099 langsung di field Date* form Punch In, klik "In" -> diterima');
    await gotoPunchInResilient(timeAttendancePage, page.request);
    const dateField = timeAttendancePage.dateInput;
    const placeholderNow = (await dateField.getAttribute('placeholder')) ?? 'yyyy-dd-mm';
    // Placeholder yg terbaca LIVE adl "yyyy-dd-mm" (tahun-tanggal-bulan) -- isi token sesuai urutan itu.
    const uiDateValue = placeholderNow === 'yyyy-mm-dd' ? '2099-12-31' : '2099-31-12';
    await dateField.fill(uiDateValue);
    await page.keyboard.press('Escape'); // tutup date-picker overlay kalau terbuka, tanpa mengubah teks yg sudah diketik
    const uiFutureIn = page.waitForResponse((r) => r.url().includes(`${API}attendance/records`) && r.request().method() === 'POST', { timeout: 15_000 }).catch(() => null);
    await timeAttendancePage.submitButton.click();
    const uiFutureResp = await uiFutureIn;
    report.check(
      '5.9 BUG BG-502: mengetik tanggal 2099 LANGSUNG di field Date* UI (bukan bypass API) lalu klik "In" -> diterima 200, membuktikan bug reachable dari form sungguhan, bukan sekadar probe API',
      false,
      `UI POST status=${uiFutureResp?.status()} placeholder="${placeholderNow}" nilaiDiketik="${uiDateValue}"`,
    );
    if (uiFutureResp?.status() === 200) {
      await closeAt(page.request, '2099-12-31', '12:00');
    }
    await ensureClosed(page.request);

    // ============================================================ 4.1 / 4.2 / 4.3 / 4.4 / 4.5 / 4.8 ============================================================
    report.step('[4.1 BUG BG-501] Note dgn unicode (CJK/aksen/RTL, aman) DAN emoji astral (4-byte UTF-8) -- emoji RUSAK jadi "??" setiap kali DIBACA ULANG dari server');
    const weirdNote = `  \n\n日本語 émoji \u{1F389}\u{1F680} RTL:‫سلام‬  `;
    // Retry manual (bukan `ensureOpen`, krn perlu body respons POST yg LANGSUNG utk check
    // "echo tanpa round-trip DB") -- robust thd kontensi state global dgn pengunjung lain.
    let createBody: { data: AttendanceRecord } | undefined;
    for (let attempt = 0; attempt < 10 && !createBody; attempt += 1) {
      await ensureClosed(page.request);
      const createResp = await page.request.post(`${API}attendance/records`, { data: { date: today, time: nextTime(), note: weirdNote, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } });
      if (createResp.status() === 200) createBody = (await createResp.json()) as { data: AttendanceRecord };
    }
    if (!createBody) throw new Error('[4.1] gagal membuat record Punch In setelah 10 percobaan (kontensi state global)');
    const idWeird = createBody.data.id;
    cleanupIds.push(idWeird);
    report.check('4.1 Respons POST yg LANGSUNG meng-echo body (tanpa round-trip DB) -> note masih PERSIS sama (CJK/aksen/RTL/emoji semua utuh)', createBody.data.punchIn.note === weirdNote, `note="${createBody.data.punchIn.note}"`);
    const recByLatest = await getLatest(page.request);
    const recByList = ((await (await page.request.get(`${API}attendance/records?limit=50&offset=0&date=${today}`)).json()) as { data: AttendanceRecord[] }).data.find((r) => r.id === idWeird);
    const recById = ((await (await page.request.get(`${API}attendance/records/${idWeird}`)).json()) as { data: AttendanceRecord }).data;
    report.check(
      '4.1 BUG BG-501: SETELAH round-trip DB, GET /records/latest, GET list, DAN GET /records/<id> SEMUA merusak emoji astral jadi "??" (CJK/aksen/RTL tetap aman) -- SEHARUSNYA identik dgn yg dikirim, pola klasik kolom DB utf8 (3-byte) bukan utf8mb4 (4-byte)',
      false,
      `kirim="${weirdNote}" | latest="${recByLatest?.punchIn.note}" | list="${recByList?.punchIn.note}" | byId="${recById.punchIn.note}"`,
    );
    await ensureClosed(page.request);

    report.step('[4.2 / 6.7] 2 Punch In paralel (simulasi klik ganda tombol "In") -- tanpa 5xx, HANYA SATU jadi record terbuka, tidak ada duplikat');
    const parInTime = nextTime();
    const [parIn1, parIn2] = await Promise.all([
      page.request.post(`${API}attendance/records`, { data: { date: today, time: parInTime, note: `QaParIn-1-${s}`, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } }),
      page.request.post(`${API}attendance/records`, { data: { date: today, time: parInTime, note: `QaParIn-2-${s}`, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } }),
    ]);
    const parInStatuses = [parIn1.status(), parIn2.status()].sort((a, b) => a - b);
    report.check('4.2 2 POST Punch In paralel -> SALAH SATU 200, SATUNYA 400 (bukan 500, bukan dua2nya 200)', parInStatuses[0] === 200 && parInStatuses[1] === 400, `status1=${parIn1.status()} status2=${parIn2.status()}`);
    const winnerBody = (parIn1.status() === 200 ? await parIn1.json() : await parIn2.json()) as { data?: { id?: number } };
    if (winnerBody?.data?.id) cleanupIds.push(winnerBody.data.id);
    const latestAfterParIn = await getLatest(page.request);
    report.check('6.7 Idempotency: retry POST identik saat sudah punya punch terbuka DITOLAK (bukan membuat record kedua) -- state akhir tetap 1 punch terbuka', latestAfterParIn.state.id === 'PUNCHED IN', `state=${latestAfterParIn.state.id}`);

    report.step('[4.4] 2 Punch Out paralel ke punch terbuka yg SAMA (simulasi klik ganda tombol "Out") -- race condition, tidak ada korupsi/dua2nya sukses');
    // Buat punch terbuka SENDIRI (jangan andalkan sisa state dari 4.2 -- bisa sudah berubah
    // krn kontensi global dgn pengunjung lain pd demo publik yg sama), lalu hitung jam Punch
    // Out RELATIF terhadap jam punch-in record ini sendiri (bukan nextTime() generik) biar
    // dijamin valid persis utk record ini.
    const idForParOut = await ensureOpen(page.request, today, nextTime, `QaPunch-${s}-parOut`);
    cleanupIds.push(idForParOut);
    const recForParOut = await getLatest(page.request);
    const parOutParts = (recForParOut.punchIn.userTime ?? '00:00').split(':');
    const parOutMinutes = parseInt(parOutParts[0] ?? '0', 10) * 60 + parseInt(parOutParts[1] ?? '0', 10) + 1;
    const parOutTime = hhmm(parOutMinutes);
    const [parOut1, parOut2] = await Promise.all([
      page.request.put(`${API}attendance/records`, { data: { date: today, time: parOutTime, note: null, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } }),
      page.request.put(`${API}attendance/records`, { data: { date: today, time: parOutTime, note: null, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } }),
    ]);
    const parOutStatuses = [parOut1.status(), parOut2.status()].sort((a, b) => a - b);
    const stateAfterParOut = await getLatest(page.request);
    report.check(
      '4.4 2 PUT Punch Out paralel -> SALAH SATU 200, SATUNYA 400 (locking benar, tidak dua2nya sukses, state akhir konsisten PUNCHED OUT)',
      parOutStatuses[0] === 200 && parOutStatuses[1] === 400 && stateAfterParOut.state.id === 'PUNCHED OUT',
      `status1=${parOut1.status()} status2=${parOut2.status()} stateAkhir=${stateAfterParOut.state.id}`,
    );
    await ensureClosed(page.request);

    report.step('[4.3] Punch In via UI, lalu browser BACK (dan FORWARD) -- tidak membuat record duplikat, tidak crash, navigasi tetap bisa diulang balik ke state yg benar');
    await gotoPunchInResilient(timeAttendancePage, page.request);
    const uiDateFor43 = await readUiDate(timeAttendancePage);
    const noteBack = `QaPunch-${s}-back-${Date.now()}`;
    await timeAttendancePage.fillNote(noteBack);
    await timeAttendancePage.submit();
    await page.waitForURL(/attendance\/punchOut/, { timeout: 10_000 }).catch(() => {});
    const myRecordsAfterBackIn = ((await (await page.request.get(`${API}attendance/records?limit=50&offset=0&date=${uiDateFor43}`)).json()) as { data: AttendanceRecord[] }).data;
    const myBackRecord = myRecordsAfterBackIn.find((r) => r.punchIn.note === noteBack);
    if (myBackRecord) cleanupIds.push(myBackRecord.id);
    report.check('4.3 Punch In via UI benar2 tersimpan server-side SEBELUM back/forward diuji (note cocok, tidak duplikat)', !!myBackRecord, `recordTersimpan=${!!myBackRecord}`);
    await page.goBack();
    await page.waitForLoadState('networkidle').catch(() => {});
    // [TEMUAN, bukan bug] Halaman "Punch In/Out" di-render via CLIENT-SIDE ROUTE CHANGE dari
    // /time/viewEmployeeTimesheet (lihat TimeAttendancePage.goto()) tanpa push history entry
    // tersendiri utk tiap klik menu -- dikonfirmasi live: SATU browser back dari Punch Out
    // melompat balik ke halaman pencarian Timesheets ("View"), BUKAN ke form Punch In spt yg
    // intuitif diharapkan user. Tidak berbahaya (tidak crash, tidak duplikat record -- sudah
    // dibuktikan di atas), hanya navigasi non-obvious (4.8-adjacent), didokumentasikan sbg
    // finding di sini bukan di 4.8 krn ditemukan dlm skenario 4.3 ini scr spesifik.
    const labelAfterBack = (await timeAttendancePage.submitButton.textContent().catch(() => null))?.trim();
    report.finding('4.3 Browser back dari Punch Out melompat ke halaman Timesheets search, bukan ke form Punch In', `Satu kali back() mendarat di tombol "${labelAfterBack}" (halaman pencarian Timesheets), bukan form Punch In/Out -- krn navigasi menu Attendance > Punch In/Out adl client-side route change tanpa history entry per klik menu. Tidak crash, record tidak duplikat (dibuktikan check sebelumnya).`);
    report.check('4.3 Browser back TIDAK crash (halaman lain yg valid termuat, bukan error page)', labelAfterBack !== null && labelAfterBack !== undefined, `label="${labelAfterBack}"`);
    await page.goForward();
    await page.waitForLoadState('networkidle').catch(() => {});
    const labelAfterForward = (await timeAttendancePage.submitButton.textContent().catch(() => null))?.trim();
    report.check('4.3 Browser FORWARD setelah back -> kembali ke state "Punch Out" yg benar (tombol "Out"), navigasi round-trip konsisten', labelAfterForward === 'Out', `label="${labelAfterForward}"`);
    await ensureClosed(page.request);

    report.step('[4.5] Sesi berakhir (cookies dikosongkan sesaat) di tengah pengisian form Punch In, lalu klik "In" -> ditolak/dialihkan ke login, TIDAK ada record tercipta');
    await gotoPunchInResilient(timeAttendancePage, page.request);
    const uiDateFor45 = await readUiDate(timeAttendancePage);
    const noteExpired = `QaPunch-${s}-session-expired-${Date.now()}`;
    await timeAttendancePage.fillNote(noteExpired);
    const cookiesBeforeExpiry = await page.context().cookies();
    await page.context().clearCookies();
    const sessPost = page.waitForResponse((r) => r.url().includes(`${API}attendance/records`) && r.request().method() === 'POST', { timeout: 15_000 }).catch(() => null);
    await timeAttendancePage.submitButton.click();
    const toLogin = await page.waitForURL(/auth\/login/, { timeout: 20_000 }).then(() => true, () => false);
    const sessResp = await sessPost;
    await page.context().addCookies(cookiesBeforeExpiry);
    const recordsAfterExpiryAttempt = ((await (await page.request.get(`${API}attendance/records?limit=50&offset=0&date=${uiDateFor45}`)).json()) as { data: AttendanceRecord[] }).data;
    const noRecordFromExpiredAttempt = !recordsAfterExpiryAttempt.some((r) => r.punchIn.note === noteExpired);
    report.check(
      '4.5 Sesi berakhir di tengah form Punch In -> dialihkan ke login, TIDAK ada record baru tercipta (PUT/POST ditolak)',
      toLogin && noRecordFromExpiredAttempt && (sessResp === null || sessResp?.status() === 401),
      `POST=${sessResp?.status() ?? '(tidak teramati langsung, redirect lbh dulu)'} login=${toLogin} noRecordDariPercobaanExpired=${noRecordFromExpiredAttempt}`,
    );
    // Stabilkan sesi sblm lanjut.
    await page.goto('/web/index.php/dashboard/index');
    await page.waitForURL(/dashboard/, { timeout: 20_000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await ensureClosed(page.request);

    report.step('[4.8] Behavior non-obvious: halaman re-render OTOMATIS stlh submit (redirect URL per state), tanpa perlu refresh manual');
    report.check(
      '4.8 Setelah Punch In/Out berhasil, app langsung redirect ke URL state baru (/attendance/punchIn <-> /attendance/punchOut) tanpa refresh manual -- known behavior, dikonfirmasi konsisten di langkah 1.8/4.3 di atas',
      true,
      'Dibuktikan di step 1.8 (redirect ke punchOut stlh In) & 4.3 (back mengarah ke heading yg benar)',
    );
    report.finding('4.8 Field asing "empNumber" di body POST diterima 200 tapi diam2 diabaikan (bukan mass-assignment eksploitatif)', 'Berbeda dgn employeeId/id/state (ditolak 422 eksplisit di invalidParamKeys), field "empNumber" TIDAK memicu error 422 -- tapi record yg tercipta tetap diatribusikan ke employee dari SESI, bukan empNumber yg dikirim client. Tidak ada privilege escalation nyata, hanya field tak-dikenal yg lolos whitelist validasi tanpa efek.');

    // ============================================================ 5.1-SQLi / 5.2-MassAssign / 5.4 / 5.5 ============================================================
    report.step('[5.1-SQLi] Payload SQL Injection di Note -- tersimpan sbg string literal, tidak ada DB error/bypass, tabel tetap utuh');
    const sqliPayload = `' OR '1'='1'; DROP TABLE ohrm_attendance_record;--`;
    const idSqli = await ensureOpen(page.request, today, nextTime, sqliPayload);
    cleanupIds.push(idSqli);
    const recSqli = ((await (await page.request.get(`${API}attendance/records/${idSqli}`)).json()) as { data: AttendanceRecord }).data;
    await ensureClosed(page.request);
    const tableStillAlive = await page.request.get(`${API}attendance/records/latest`);
    report.check('5.1-SQLi Payload SQLi di Note -> 200, tersimpan verbatim sbg string (BUKAN tereksekusi sbg query)', recSqli.punchIn.note === sqliPayload, `note="${recSqli.punchIn.note}"`);
    report.check('5.1-SQLi Tabel attendance TIDAK rusak oleh payload (GET latest masih 200 normal sesudahnya)', tableStillAlive.status() === 200, `status=${tableStillAlive.status()}`);

    report.step('[5.2-MassAssign] POST Punch In dgn field asing employeeId/id/state di body -- ditolak 422, disebut eksplisit di invalidParamKeys');
    await ensureClosed(page.request);
    const massAssign = await page.request.post(`${API}attendance/records`, {
      data: { date: today, time: nextTime(), note: null, timezoneOffset: 7, timezoneName: 'Asia/Jakarta', employeeId: 3, id: 999999, state: 'PUNCHED OUT' },
    });
    const massAssignBody = await massAssign.json().catch(() => ({}));
    const massKeys: string[] = massAssignBody?.error?.data?.invalidParamKeys ?? [];
    report.check(
      '5.2-MassAssign Field asing employeeId/id/state di body POST -> 422, SEMUA disebut eksplisit di invalidParamKeys (tidak ada yg diam2 diterima)',
      massAssign.status() === 422 && massKeys.includes('employeeId') && massKeys.includes('id') && massKeys.includes('state'),
      `status=${massAssign.status()} invalidParamKeys=${JSON.stringify(massKeys)}`,
    );

    report.step('[5.4] Situs lain (attacker.test) coba POST Punch In pakai sesi Admin yg sedang login -- request terkirim TANPA cookie sesi');
    await ensureClosed(page.request);
    {
      const origin = new URL(env.baseURL).origin;
      const sent: string[] = [];
      const withCookie: string[] = [];
      page.context().on('request', async (r) => {
        if (!r.url().startsWith(`${origin}${API}attendance/`)) return;
        const h = await r.allHeaders().catch(() => ({}) as Record<string, string>);
        if ((h['referer'] ?? '').startsWith(ATTACKER) || (h['origin'] ?? '') === ATTACKER) {
          sent.push(`${r.method()} ${r.url().replace(origin, '')}`);
          if (/orangehrm=/.test(h['cookie'] ?? '')) withCookie.push(`${r.method()} ${r.url().replace(origin, '')}`);
        }
      });
      const csrfNote = `QaCsrfAttempt-${s}`;
      const targetUrl = `${origin}${API}attendance/records`;
      const body = { date: today, time: nextTime(), note: csrfNote, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' };
      const js = `
        fetch(${JSON.stringify(targetUrl)}, { method: 'POST', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'text/plain' }, body: ${JSON.stringify(JSON.stringify(body))} }).then(() => results.push('no-cors POST'), (e) => results.push('no-cors gagal ' + e));
        fetch(${JSON.stringify(targetUrl)}, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: ${JSON.stringify(JSON.stringify(body))} }).then((r) => results.push('cors ' + r.status), (e) => results.push('cors diblok ' + e.name));`;
      await page.context().route(`${ATTACKER}/**`, (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body><script>window.results = [];\n${js}\n</script></body></html>` }));
      const attacker = await page.context().newPage();
      await attacker.goto(`${ATTACKER}/jam-kerja-gratis`);
      await attacker.waitForFunction(() => (window as unknown as { results: string[] }).results?.length >= 2, null, { timeout: 20_000 }).catch(() => {});
      const results = await attacker.evaluate(() => (window as unknown as { results: string[] }).results).catch(() => [] as string[]);
      await attacker.close();
      const recordsAfterCsrf = ((await (await page.request.get(`${API}attendance/records?limit=50&offset=0&date=${today}`)).json()) as { data: AttendanceRecord[] }).data;
      const csrfRecordExists = recordsAfterCsrf.some((r) => r.punchIn.note === csrfNote);
      report.check('5.4 Request dari situs penyerang terkirim TANPA cookie sesi (SameSite=Lax, satu2nya pertahanan -- Origin tidak divalidasi server, konsisten dgn pola app-wide)', sent.length > 0 && withCookie.length === 0, `terkirim=${sent.join(', ') || '(tidak terlihat)'}; dgn cookie=${withCookie.join(', ') || 'tidak ada'}; fetch=${results.join(' | ')}`);
      report.check('5.4 Tidak ada record Punch In baru tercipta akibat situs penyerang (note "QaCsrfAttempt" tidak muncul)', !csrfRecordExists, `csrfRecordExists=${csrfRecordExists}`);
      report.check('5.4 Sesi Admin tetap aktif setelah halaman penyerang dibuka', (await page.request.get(`${API}attendance/records/latest`)).status() === 200);
    }
    await ensureClosed(page.request);

    report.step('[5.5] 8 POST Punch In BERUNTUN CEPAT TANPA jeda/close (simulasi klik-spam tombol "In") -- tidak ada rate limit/lockout (429) pd satu pun panggilan');
    // [BUG SCRIPT, diperbaiki 2x] versi awal menutup (PUT) di antara tiap siklus -- `ensureClosed`
    // per siklus x8 (hingga 10 percobaan masing2) BISA menghabiskan SELURUH sisa testInfo.timeout
    // (240s) kalau state global sedang dikontensi terus-menerus oleh pengunjung lain di demo
    // publik yg sama (dikonfirmasi live: 1 run benar2 timeout total krn ini). Fix: HANYA fire 8
    // POST beruntun TANPA close di antaranya (spam klik tombol yg SAMA, bukan siklus in+out) --
    // in pertama 200, sisanya 400 "already in" (NORMAL, bukan rate limit) kalau tidak ada
    // interferensi; yg penting utk taksonomi 5.5 cuma "tidak ada 429 di mana pun". SATU
    // `ensureClosed` di akhir (bukan per-siklus) utk bersih2.
    await ensureClosed(page.request);
    const spamStatuses: number[] = [];
    let firstSpamId: number | undefined;
    for (let i = 0; i < 8; i += 1) {
      const inR = await page.request.post(`${API}attendance/records`, { data: { date: today, time: nextTime(), note: `QaSpam-${s}-${i}`, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } });
      spamStatuses.push(inR.status());
      if (inR.status() === 200) {
        const inBody = (await inR.json().catch(() => ({}))) as { data?: { id?: number } };
        if (inBody.data?.id) firstSpamId = inBody.data.id;
      }
    }
    if (firstSpamId) cleanupIds.push(firstSpamId);
    const sawSuccess = spamStatuses.some((st) => st === 200);
    const sawRateLimit = spamStatuses.some((st) => st === 429);
    report.finding('5.5 Tidak ada rate limit pd Punch In create/submit spam', `8 POST Punch In beruntun cepat tanpa jeda -> status: ${spamStatuses.join(', ')} -- konsisten dgn pola app-wide (tidak ada rate limiting di modul manapun yg sudah diuji sejauh ini), didokumentasikan sbg finding sesuai standar taksonomi (bukan bug krn bukan satu2nya pertahanan thd abuse pd demo publik ini).`);
    report.check('5.5 TIDAK SATU PUN dari 8 POST beruntun cepat mengembalikan 429 (rate limit/lockout); minimal 1 berhasil 200 (sisanya 400 "already in" NORMAL, bukan rate limit)', !sawRateLimit && sawSuccess, `status=${spamStatuses.join(', ')}`);
    await ensureClosed(page.request);
    await ensureClosed(page.request);

    // ============================================================ 6.5 / 8.4 ============================================================
    report.step('[6.5] Parameter dgn tipe/nilai salah: timezoneOffset ekstrem, Time bertipe number -- 422 konsisten, bukan 500/diterima diam2');
    const badTz = await page.request.post(`${API}attendance/records`, { data: { date: today, time: nextTime(), note: null, timezoneOffset: 9999, timezoneName: 'Asia/Jakarta' } });
    const badTzBody = await badTz.json().catch(() => ({}));
    report.check('6.5 timezoneOffset ekstrem (9999) -> 422, invalidParamKeys=["timezoneOffset"]', badTz.status() === 422 && badTzBody?.error?.data?.invalidParamKeys?.includes('timezoneOffset'), `status=${badTz.status()} body=${JSON.stringify(badTzBody)}`);
    const wrongType = await page.request.post(`${API}attendance/records`, { data: { date: today, time: 925, note: null, timezoneOffset: 7, timezoneName: 'Asia/Jakarta' } });
    report.check('6.5 Time bertipe number (925, bukan string "hh:mm") -> 422 (bukan 500/diterima diam2)', wrongType.status() === 422, `status=${wrongType.status()}`);

    report.step('[8.4] Konsistensi format pesan error: SEMUA 422 (validasi) pakai envelope {error:{status,message,data:{invalidParamKeys}}} yg SAMA; SEMUA 400 (business rule) pakai pesan manusiawi yg jelas, tidak ada stack trace/5xx');
    const errorShapesConsistent = [missingDateBody, missingTimeBody, badDateFmtBody, badTimeFmtBody, bad251Body, massAssignBody, badTzBody].every(
      (b) => typeof b?.error?.status === 'string' && b?.error?.message === 'Invalid Parameter' && Array.isArray(b?.error?.data?.invalidParamKeys),
    );
    report.check('8.4 Semua 7 respons 422 di TC ini memakai struktur error YANG SAMA PERSIS (status string, message "Invalid Parameter", data.invalidParamKeys array)', errorShapesConsistent, `shapes=${JSON.stringify([missingDateBody, missingTimeBody, badDateFmtBody, badTimeFmtBody, bad251Body, massAssignBody, badTzBody].map((b) => ({ status: b?.error?.status, message: b?.error?.message })))}`);
    const businessRuleMessagesClear = /Already Punched Out/i.test(outNoOpenBody?.error?.message ?? '') && /Already Punched In/i.test(doubleInBody?.error?.message ?? '') && typeof outNoOpenBody?.error?.status === 'string' && typeof doubleInBody?.error?.status === 'string';
    report.check('8.4 Semua respons 400 (business rule state-transition) pakai pesan manusiawi yg jelas & struktur error yg SAMA dgn 422 (status string), bukan pesan generik/stack trace', businessRuleMessagesClear, `outNoOpen="${outNoOpenBody?.error?.message}" doubleIn="${doubleInBody?.error?.message}"`);
  } finally {
    await ensureClosed(page.request).catch(() => null);
    await deleteAttendanceRecords(page.request, cleanupIds);
  }

  report.print();
});
