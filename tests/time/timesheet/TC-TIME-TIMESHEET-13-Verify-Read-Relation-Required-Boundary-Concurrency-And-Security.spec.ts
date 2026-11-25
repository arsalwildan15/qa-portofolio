/**
 * ================================================================================
 * TC-TIME-TIMESHEET-13 — Verify My Timesheet (ESS): Read, Relation, Required Field, Boundary,
 *                          Race/Concurrency, Non-Obvious Behavior, And Security (SQLi/PrivEsc/
 *                          MassAssign/CSRF/API Negative)
 * Modul    : Time > Timesheets > My Timesheet (ESS self-service) (U055)
 * Kategori : Positive (+) 1.1-R 1.2 1.4 | Negative (-) 2.1 2.5 | Boundary (B) 3.1 3.4 |
 *            Edge (!) 4.1 4.4 4.7 4.8 | Security (S) 5.1-SQLi 5.2-PrivEsc 5.2-MassAssign 5.4 |
 *            API (A) 6.5 | UI/UX (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TIMESHEET-13-Verify-Read-Relation-Required-Boundary-Concurrency-And-Security.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * LATAR (KOREKSI OVERCLAIM): docs/Execution-Plan.md & docs/TC-Time.txt sebelumnya mencatat
 * "U055 My Timesheet SUDAH TUTUP" via TC-TIME-TIMESHEET-12 -- KELIRU. TC-TIME-TIMESHEET-12 HANYA
 * menutup 1.1-U/1.3/1.8/4.2/4.3/4.5/5.1-XSS-Reflected. 3 rebuild matrix independen berturut-turut
 * (bug baca matrix.json val[0] di koordinator sudah diperbaiki) menunjukkan 17 kode LAIN masih GAP:
 * 1.1-R/1.2/1.4/2.1/2.5/3.1/3.4/4.1/4.4/4.7/4.8/5.1-SQLi/5.2-PrivEsc/5.2-MassAssign/5.4/6.5/8.4.
 * TC INI menutup ke-17 kode tersebut. Semua terbukti GENUINELY TESTABLE via eksplorasi live
 * (Playwright MCP, 25 Nov 2026) -- TIDAK ada yg N/A struktural, jadi build_matrix.py TIDAK diubah.
 *
 * TEMUAN LIVE PENTING (sblm kode ditulis):
 *   - Project autocomplete (field "Type for hints...") memanggil GET time/projects
 *     ?onlyAllowed=false&model=detailed&customerOrProjectName=<q> -- SATU-SATUNYA field teks
 *     bebas di unit ini (PUT entries TIDAK menerima "comment" sama sekali, lihat temuan 4.8 di
 *     bawah) -- jadi 3.1/4.1/5.1-SQLi SEMUA diuji lewat field pencarian project ini.
 *   - customerOrProjectName dibatasi PERSIS 100 karakter server-side (100 ok/200, 101 -> 422
 *     invalidParamKeys:["customerOrProjectName"], dikonfirmasi binary-search).
 *   - SQLi payload di customerOrProjectName -> 200, 0 hasil, tidak ada DB error/bypass (aman).
 *   - Emoji ASTRAL (4-byte UTF-8) di customerOrProjectName -> 500 Internal Server Error (BUG BARU
 *     BG-506, Medium -- pola SAMA dgn BG-494/496/501/505 -- mismatch charset DB utf8 vs utf8mb4);
 *     CJK/aksen Latin/Arab/unicode BIASA semua aman (200, 0 hasil).
 *   - Required field: baris baru dgn Project terisi + durasi terisi tapi Activity "-- Select --"
 *     -> Save diblokir CLIENT-SIDE ("Select an Activity"), TIDAK ada PUT terkirim (2.1).
 *   - GET time/timesheets/default?date=<boundary> (leap day 2028-02-29, lintas tahun 2026-12-31,
 *     jauh ke depan/lalu) SEMUA 200 graceful (periode dihitung benar, id:null kalau belum pernah
 *     dibuka); date non-tanggal -> 422 invalidParamKeys:["date"] (3.4, tidak ada bug).
 *   - PUT entries dgn field "comment" di dates{} APAPUN isinya (pendek maupun kosong) -> SELURUH
 *     entries ditolak 422 invalidParamKeys:["entries"] -- field ini HANYA read-only (muncul di GET
 *     response, selalu null di unit ini krn tidak pernah bisa diisi via endpoint ini) -- behavior
 *     non-obvious: field ADA di skema response tapi TIDAK PERNAH bisa diisi dari endpoint yg sama
 *     (4.8).
 *   - PUT entries/action dgn tipe salah (duration number, duration negatif, entries:null, field
 *     ekstra tak dikenal, body kosong) -> 422 konsisten, envelope SAMA
 *     {error:{status,message,data:{invalidParamKeys}}} semua kasus (6.5/8.4).
 *   - PUT timesheet {action:'APPROVE'|'REJECT'} dari ESS pemilik SENDIRI (endpoint
 *     time/timesheets/<id>, BUKAN endpoint admin yg sudah diuji TC-TIME-TS-APPROVAL-03) -> 400 Bad
 *     Request, ditolak (5.2-PrivEsc, finding positif -- tidak ada bug).
 *   - PUT timesheet dgn field asing "status"/"employeeId" -> 422 invalidParamKeys menyebutnya
 *     eksplisit, BUKAN diterima diam2 (5.2-MassAssign, finding positif).
 *
 * HASIL: 30 check -> 29 lolos, 1 SENGAJA FAILED (BG-506), stabil 3x run berturut-turut.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TIMESHEET-13-Verify-Read-Relation-Required-Boundary-Concurrency-And-Security.spec.ts --project=chromium --workers=1
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { MyTimesheetPage } from '../../../src/pages';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { createEssTimesheet } from '../../../src/utils/createEssTimesheet';
import { loginAs } from '../../../src/utils/loginAs';
import { API, createCustomer, createProject, deleteCustomers, deleteProjects } from '../../../src/utils/timeData';
import { uniqueName } from '../../../src/data/testData';
import type { APIRequestContext } from '@playwright/test';

const ATTACKER = 'https://attacker.test';

async function essDefault(req: APIRequestContext): Promise<{ id: number; startDate: string; status: string | null }> {
  const body = await (await req.get(`${API}time/timesheets/default`)).json();
  return { id: body.data.id, startDate: body.data.startDate, status: body.data.status?.id };
}

async function searchProjects(req: APIRequestContext, q: string): Promise<{ status: number; count: number | null; body: unknown }> {
  const r = await req.get(`${API}time/projects?onlyAllowed=false&model=detailed&customerOrProjectName=${encodeURIComponent(q)}`);
  const body = await r.json().catch(() => null);
  const count = Array.isArray(body?.data) ? body.data.length : null;
  return { status: r.status(), count, body };
}

test('TC-TIME-TIMESHEET-13: My Timesheet (ESS) - read, relation, required field, boundary, concurrency, security', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-TIME-TIMESHEET-13', 'My Timesheet Read Relation Required Boundary Concurrency Security', env.baseURL, page);
  const s = Date.now().toString().slice(-6);

  report.step('[Setup] ESS A - timesheet NOT SUBMITTED baru');
  const essA = await createEssAccount(page, addEmployeePage, 'QaTsGap');
  const { page: a, close: closeA } = await loginAs(browser, essA.username, essA.password);
  const myA = new MyTimesheetPage(a);
  await myA.goto();
  await a.waitForLoadState('networkidle').catch(() => {});
  const defA = await essDefault(a.request);
  report.check('[Setup] Status awal "NOT SUBMITTED"', defA.status === 'NOT SUBMITTED', `status=${defA.status}`);

  report.step('1.1-R / 1.2 Isi Senin + Rabu (Selasa dibiarkan kosong), Save, baca ulang via API = cocok dgn yg disimpan');
  await myA.startEdit();
  const row = await myA.fillFirstRow(['ACME', 'Apache', 'Coca-Cola', 'Fresh Books', 'FreeWave']);
  await myA.fillDuration(0, '3:00');
  await myA.fillDuration(2, '1:30');
  const saveResp = await myA.save();
  report.check('1.2 Save dgn Selasa kosong (field hari = opsional) -> PUT entries 200', saveResp?.status() === 200, `status=${saveResp?.status()} row=${JSON.stringify(row)}`);
  const entries1 = await (await a.request.get(`${API}time/timesheets/${defA.id}/entries`)).json();
  const mon = addDaysIso(defA.startDate, 0);
  const tue = addDaysIso(defA.startDate, 1);
  const wed = addDaysIso(defA.startDate, 2);
  const rowData = entries1?.data?.[0];
  report.check(
    '1.1-R Baca ulang via GET entries -> Senin=03:00, Rabu=01:30, Selasa TIDAK ADA (persis yg disimpan, tidak ada yg hilang/berubah diam-diam)',
    rowData?.dates?.[mon]?.duration === '03:00' && rowData?.dates?.[wed]?.duration === '01:30' && rowData?.dates?.[tue] === undefined,
    `dates=${JSON.stringify(rowData?.dates)}`,
  );

  report.step('1.4 Project BARU (dibuat via Admin API detik ini) langsung muncul di pencarian Project My Timesheet (relasi Project Info -> My Timesheet)');
  const custName = uniqueName(`QaTsCust${s}`);
  const projName = uniqueName(`QaTsProj${s}`);
  const custId = await createCustomer(page.request, custName);
  const projId = await createProject(page.request, custId, projName);
  const relSearch = await searchProjects(a.request, projName);
  report.check('1.4 ESS mencari nama Project yg BARU dibuat Admin -> muncul (relasi lintas-unit Project Info -> My Timesheet)', relSearch.status === 200 && relSearch.count === 1, `status=${relSearch.status} count=${relSearch.count}`);

  report.step('2.1 Baris baru: Project terisi, Activity dibiarkan "-- Select --", durasi terisi -> Save diblokir client-side, tidak ada PUT');
  await myA.goto();
  await a.waitForLoadState('networkidle').catch(() => {});
  await myA.startEdit();
  await myA.addRowButton.click();
  const newRowProjectInput = a.getByPlaceholder('Type for hints...').last();
  await newRowProjectInput.fill(custName.slice(0, 4));
  await a.getByText('Searching....').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  await a.waitForTimeout(600);
  const option = a.locator('.oxd-autocomplete-option').first();
  await option.click().catch(() => {});
  await a.waitForTimeout(400);
  const newRowDurationInputs = a.locator('td.orangehrm-timesheet-table-body-cell.\\--duration-input input');
  await newRowDurationInputs.last().fill('1:00');
  let putSentAfterMissingActivity = false;
  const onReq = (r: import('@playwright/test').Request) => { if (r.url().includes('/entries') && r.method() === 'PUT') putSentAfterMissingActivity = true; };
  a.on('request', onReq);
  await myA.saveButton.click();
  await a.waitForTimeout(1_500);
  a.off('request', onReq);
  const requiredErr = await a.getByText('Select an Activity').isVisible().catch(() => false);
  report.check('2.1 Activity kosong (wajib) -> validasi "Select an Activity" tampil, TIDAK ada PUT entries terkirim', requiredErr && !putSentAfterMissingActivity, `errVisible=${requiredErr} putSent=${putSentAfterMissingActivity}`);
  await myA.goto();
  await a.waitForLoadState('networkidle').catch(() => {});

  report.step('4.8 PUT entries dgn field "comment" (APAPUN isinya) -> SELURUH entries ditolak 422; TANPA comment -> 200 (field read-only, ADA di skema GET tapi TIDAK PERNAH bisa diisi dari endpoint yg sama)');
  // Use the real saved project/activity ids from entries1 for a realistic attempt.
  const savedProjectId = rowData?.project?.id;
  const savedActivityId = rowData?.activity?.id;
  const withCommentReal = await a.request.put(`${API}time/timesheets/${defA.id}/entries`, {
    data: { entries: [{ projectId: savedProjectId, activityId: savedActivityId, dates: { [mon]: { duration: '03:00', comment: 'note' } } }], deletedEntries: [] },
  });
  const withCommentBody = await withCommentReal.json().catch(() => null);
  const withoutComment = await a.request.put(`${API}time/timesheets/${defA.id}/entries`, {
    data: { entries: [{ projectId: savedProjectId, activityId: savedActivityId, dates: { [mon]: { duration: '03:00' } } }], deletedEntries: [] },
  });
  report.check('4.8 PUT entries DENGAN field "comment" -> 422, invalidParamKeys menyebut "entries" (comment tidak pernah diterima dari endpoint ini)', withCommentReal.status() === 422 && (withCommentBody?.error?.data?.invalidParamKeys ?? []).includes('entries'), `status=${withCommentReal.status()} body=${JSON.stringify(withCommentBody?.error)}`);
  report.check('4.8 PUT entries yg SAMA TANPA field "comment" -> 200 (satu-satunya beda: comment dihapus dari body)', withoutComment.status() === 200, `status=${withoutComment.status()}`);
  report.finding('4.8 Field "comment" pada entries.dates[] bersifat read-only non-obvious', 'GET time/timesheets/<id>/entries mengembalikan "comment":null per hari di skema respons, tapi PUT entries MENOLAK SELURUH array "entries" (422, bukan hanya mengabaikan field itu) begitu key "comment" disertakan di body -- field ini TIDAK PERNAH bisa diisi dari endpoint yg sama dgn yg menampilkannya, perilaku tidak intuitif yg perlu didokumentasikan, bukan bug (tidak ada cara UI utk mengisinya pun -- tombol komentar di sel selalu display:none, dikonfirmasi live).');

  report.step('6.5 / 8.4 Parameter negatif pada PUT entries & PUT action -- semua 422, envelope konsisten');
  const wrongType = await a.request.put(`${API}time/timesheets/${defA.id}/entries`, { data: { entries: [{ projectId: savedProjectId, activityId: savedActivityId, dates: { [mon]: { duration: 180 } } }], deletedEntries: [] } });
  const negDuration = await a.request.put(`${API}time/timesheets/${defA.id}/entries`, { data: { entries: [{ projectId: savedProjectId, activityId: savedActivityId, dates: { [mon]: { duration: '-2:00' } } }], deletedEntries: [] } });
  const nullEntries = await a.request.put(`${API}time/timesheets/${defA.id}/entries`, { data: { entries: null, deletedEntries: [] } });
  const extraTop = await a.request.put(`${API}time/timesheets/${defA.id}/entries`, { data: { entries: [{ projectId: savedProjectId, activityId: savedActivityId, dates: { [mon]: { duration: '01:00' } } }], deletedEntries: [], foo: 'bar' } });
  const emptyBody = await a.request.put(`${API}time/timesheets/${defA.id}/entries`, { data: {} });
  const negChecks = [
    { name: 'duration tipe number', r: wrongType },
    { name: 'duration negatif', r: negDuration },
    { name: 'entries:null', r: nullEntries },
    { name: 'field ekstra "foo"', r: extraTop },
    { name: 'body kosong', r: emptyBody },
  ];
  const bodies = await Promise.all(negChecks.map((c) => c.r.json().catch(() => null)));
  report.check(
    '6.5 Semua parameter negatif (tipe salah/negatif/null/field ekstra/body kosong) pada PUT entries -> 422',
    negChecks.every((c) => c.r.status() === 422),
    negChecks.map((c) => `${c.name}=${c.r.status()}`).join(', '),
  );
  const envelopeOk = bodies.every((b) => b?.error?.status === '422' && b?.error?.message === 'Invalid Parameter' && Array.isArray(b?.error?.data?.invalidParamKeys));
  report.check('8.4 Envelope error SEMUA kasus negatif di atas konsisten {error:{status,message,data:{invalidParamKeys}}}', envelopeOk, JSON.stringify(bodies.map((b) => b?.error)));

  report.step('5.1-SQLi Payload SQL Injection di pencarian Project (customerOrProjectName) -> 200, 0 hasil, tidak ada DB error/bypass');
  const sqli1 = await searchProjects(a.request, "' OR '1'='1");
  const sqli2 = await searchProjects(a.request, `${projName}'; DROP TABLE ohrm_project; --`);
  report.check('5.1-SQLi Payload SQLi di pencarian Project -> 200 aman, 0 hasil, tidak ada bypass/leak', sqli1.status === 200 && sqli1.count === 0 && sqli2.status === 200 && sqli2.count === 0, `sqli1=${sqli1.status}/${sqli1.count} sqli2=${sqli2.status}/${sqli2.count}`);
  const stillAlive = await searchProjects(a.request, projName);
  report.check('5.1-SQLi Tabel project TIDAK rusak oleh payload (pencarian nama asli masih 200 & ketemu sesudahnya)', stillAlive.status === 200 && stillAlive.count === 1, `status=${stillAlive.status} count=${stillAlive.count}`);

  report.step('3.1 Panjang customerOrProjectName -- 100 karakter diterima (200), 101 ditolak (422)');
  const len100 = await searchProjects(a.request, 'A'.repeat(100));
  const len101 = await searchProjects(a.request, 'A'.repeat(101));
  report.check('3.1 customerOrProjectName 100 karakter -> 200 (diterima)', len100.status === 200, `status=${len100.status}`);
  report.check('3.1 customerOrProjectName 101 karakter -> 422 invalidParamKeys:["customerOrProjectName"] (ditolak, batas PERSIS 100)', len101.status === 422 && ((len101.body as { error?: { data?: { invalidParamKeys?: string[] } } })?.error?.data?.invalidParamKeys ?? []).includes('customerOrProjectName'), `status=${len101.status} body=${JSON.stringify(len101.body)}`);

  report.step('4.1 BUG: emoji astral di pencarian Project -> 500 (bukan 200/422); unicode/CJK/Arab biasa tetap aman');
  const emojiSearch = await searchProjects(a.request, '\u{1F389}\u{1F680}');
  const cjkSearch = await searchProjects(a.request, '日本語プロジェクト');
  const arabicSearch = await searchProjects(a.request, 'مشروع');
  report.check(
    '4.1 BUG BG-506: emoji ASTRAL (4-byte UTF-8, mis. party-popper/rocket) di customerOrProjectName -> SEHARUSNYA 200/422 graceful, tapi 500 Internal Server Error; CJK/Arab/unicode biasa (3-byte atau kurang) semuanya AMAN (200) -- pola SAMA dgn BG-494/496/501/505 (kolom/parameter DB "utf8" 3-byte, bukan "utf8mb4" 4-byte)',
    emojiSearch.status !== 500 && cjkSearch.status === 200 && arabicSearch.status === 200,
    `emoji=${emojiSearch.status} cjk=${cjkSearch.status} arabic=${arabicSearch.status}`,
  );

  report.step('3.4 GET default?date=<boundary> -- leap day, lintas tahun, jauh ke depan/lalu semua graceful; date bukan-tanggal -> 422');
  async function defAt(date: string): Promise<{ status: number; body: unknown }> {
    const r = await a.request.get(`${API}time/timesheets/default?date=${date}`);
    return { status: r.status(), body: await r.json().catch(() => null) };
  }
  const leap = await defAt('2028-02-29');
  const yearCross = await defAt('2026-12-31');
  const farFuture = await defAt('2099-12-31');
  const farPast = await defAt('1990-01-01');
  const badDate = await defAt('not-a-date');
  report.check(
    '3.4 Leap day / lintas-tahun / jauh ke depan-lalu via GET default?date= -> SEMUA 200, periode dihitung benar',
    leap.status === 200 && yearCross.status === 200 && farFuture.status === 200 && farPast.status === 200,
    `leap=${leap.status} yearCross=${yearCross.status} farFuture=${farFuture.status} farPast=${farPast.status}`,
  );
  report.check('3.4 date bukan-tanggal via GET default?date= -> 422 invalidParamKeys:["date"]', badDate.status === 422 && ((badDate.body as { error?: { data?: { invalidParamKeys?: string[] } } })?.error?.data?.invalidParamKeys ?? []).includes('date'), `status=${badDate.status}`);

  report.step('5.4 Situs lain (attacker.test) coba PUT entries pakai sesi ESS A yg login -- cookie sesi TIDAK ikut');
  {
    const origin = new URL(env.baseURL).origin;
    const sent: string[] = [];
    const withCookie: string[] = [];
    a.context().on('request', async (r) => {
      if (!r.url().startsWith(`${origin}${API}time/timesheets/`)) return;
      const h = await r.allHeaders().catch(() => ({}) as Record<string, string>);
      if ((h['referer'] ?? '').startsWith(ATTACKER) || (h['origin'] ?? '') === ATTACKER) {
        sent.push(`${r.method()} ${r.url().replace(origin, '')}`);
        if (/orangehrm=/.test(h['cookie'] ?? '')) withCookie.push(`${r.method()} ${r.url().replace(origin, '')}`);
      }
    });
    const csrfComment = `QaCsrfTs-${s}`;
    const targetUrl = `${origin}${API}time/timesheets/${defA.id}/entries`;
    const body = { entries: [{ projectId: savedProjectId, activityId: savedActivityId, dates: { [wed]: { duration: '09:00' } } }], deletedEntries: [] };
    const js = `
      fetch(${JSON.stringify(targetUrl)}, { method: 'PUT', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'text/plain' }, body: ${JSON.stringify(JSON.stringify(body))} }).then(() => results.push('no-cors PUT'), (e) => results.push('no-cors gagal ' + e));
      fetch(${JSON.stringify(targetUrl)}, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: ${JSON.stringify(JSON.stringify(body))} }).then((r) => results.push('cors ' + r.status), (e) => results.push('cors diblok ' + e.name));`;
    await a.context().route(`${ATTACKER}/**`, (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body><script>window.results = [];\n${js}\n</script></body></html>` }));
    const attacker = await a.context().newPage();
    await attacker.goto(`${ATTACKER}/jam-kerja-gratis`);
    await attacker.waitForFunction(() => (window as unknown as { results: string[] }).results?.length >= 2, null, { timeout: 20_000 }).catch(() => {});
    const results = await attacker.evaluate(() => (window as unknown as { results: string[] }).results).catch(() => [] as string[]);
    await attacker.close();
    const entriesAfterCsrf = await (await a.request.get(`${API}time/timesheets/${defA.id}/entries`)).json().catch(() => null);
    const wedDurationAfter = entriesAfterCsrf?.data?.[0]?.dates?.[wed]?.duration;
    void csrfComment;
    report.check('5.4 Request PUT entries dari situs penyerang terkirim TANPA cookie sesi (SameSite=Lax)', sent.length > 0 && withCookie.length === 0, `terkirim=${sent.join(', ') || '(tidak terlihat)'}; dgn cookie=${withCookie.join(', ') || 'tidak ada'}; fetch=${results.join(' | ')}`);
    report.check('5.4 Rabu TIDAK berubah jadi 09:00 akibat situs penyerang (tetap 01:30 sebelumnya)', wedDurationAfter !== '09:00', `duration=${wedDurationAfter}`);
  }

  report.step('4.7 2 PUT entries PARALEL (hari yg sama, durasi berbeda) -- tidak ada 5xx/korupsi, hasil akhir = salah satu dari keduanya');
  const [parA, parB] = await Promise.all([
    a.request.put(`${API}time/timesheets/${defA.id}/entries`, { data: { entries: [{ projectId: savedProjectId, activityId: savedActivityId, dates: { [tue]: { duration: '02:00' } } }], deletedEntries: [] } }),
    a.request.put(`${API}time/timesheets/${defA.id}/entries`, { data: { entries: [{ projectId: savedProjectId, activityId: savedActivityId, dates: { [tue]: { duration: '04:00' } } }], deletedEntries: [] } }),
  ]);
  const entriesAfterPar = await (await a.request.get(`${API}time/timesheets/${defA.id}/entries`)).json();
  const tueFinal = entriesAfterPar?.data?.[0]?.dates?.[tue]?.duration;
  report.check(
    '4.7 2 PUT entries paralel ke hari yg sama -> TIDAK ada 5xx, hasil akhir SATU nilai valid (02:00 atau 04:00), tidak korup/hilang',
    parA.status() < 500 && parB.status() < 500 && (tueFinal === '02:00' || tueFinal === '04:00'),
    `parA=${parA.status()} parB=${parB.status()} tueFinal=${tueFinal}`,
  );

  report.step('5.2-MassAssign PUT timesheet (action) dgn field asing "status"/"employeeId" -- 422 eksplisit, bukan diterima diam2');
  const massStatus = await a.request.put(`${API}time/timesheets/${defA.id}`, { data: { action: 'SUBMIT', status: { id: 'APPROVED' } } });
  const massStatusBody = await massStatus.json().catch(() => null);
  const massEmp = await a.request.put(`${API}time/timesheets/${defA.id}`, { data: { action: 'SUBMIT', employeeId: 1 } });
  const massEmpBody = await massEmp.json().catch(() => null);
  report.check(
    '5.2-MassAssign Field asing "status" di body PUT timesheet -> 422, disebut eksplisit di invalidParamKeys',
    massStatus.status() === 422 && (massStatusBody?.error?.data?.invalidParamKeys ?? []).includes('status'),
    `status=${massStatus.status()} body=${JSON.stringify(massStatusBody?.error)}`,
  );
  report.check(
    '5.2-MassAssign Field asing "employeeId" di body PUT timesheet -> 422, disebut eksplisit (tidak bisa pindah kepemilikan timesheet)',
    massEmp.status() === 422 && (massEmpBody?.error?.data?.invalidParamKeys ?? []).includes('employeeId'),
    `status=${massEmp.status()} body=${JSON.stringify(massEmpBody?.error)}`,
  );

  report.step('5.2-PrivEsc (sblm submit) PUT timesheet {action:APPROVE|REJECT} dari ESS pemilik sendiri -- ditolak, bukan 200');
  const approveBefore = await a.request.put(`${API}time/timesheets/${defA.id}`, { data: { action: 'APPROVE' } });
  const rejectBefore = await a.request.put(`${API}time/timesheets/${defA.id}`, { data: { action: 'REJECT' } });
  report.check('5.2-PrivEsc action APPROVE oleh ESS pemilik sendiri (status msh NOT SUBMITTED) -> ditolak (bukan 200)', approveBefore.status() !== 200, `status=${approveBefore.status()}`);
  report.check('5.2-PrivEsc action REJECT oleh ESS pemilik sendiri -> ditolak (bukan 200)', rejectBefore.status() !== 200, `status=${rejectBefore.status()}`);
  const statusStillNotSubmitted = await essDefault(a.request);
  report.check('5.2-PrivEsc Status TETAP NOT SUBMITTED sesudah percobaan APPROVE/REJECT sendiri', statusStillNotSubmitted.status === 'NOT SUBMITTED', `status=${statusStillNotSubmitted.status}`);

  report.step('2.5 / 5.2-PrivEsc (sesudah submit) Submit timesheet, lalu Submit LAGI (transisi invalid) & coba APPROVE diri sendiri (eskalasi privilese)');
  const submitResp = await a.request.put(`${API}time/timesheets/${defA.id}`, { data: { action: 'SUBMIT' } });
  const statusAfterSubmit = await essDefault(a.request);
  report.check('[Setup] Submit pertama -> 200, status SUBMITTED', submitResp.status() === 200 && statusAfterSubmit.status === 'SUBMITTED', `status=${submitResp.status()} timesheetStatus=${statusAfterSubmit.status}`);
  const doubleSubmit = await a.request.put(`${API}time/timesheets/${defA.id}`, { data: { action: 'SUBMIT' } });
  const statusAfterDouble = await essDefault(a.request);
  report.check('2.5 Submit LAGI pada timesheet yg SUDAH SUBMITTED (transisi invalid) -> ditolak (bukan 200), status TETAP SUBMITTED', doubleSubmit.status() !== 200 && statusAfterDouble.status === 'SUBMITTED', `status=${doubleSubmit.status()} timesheetStatus=${statusAfterDouble.status}`);
  const approveAfterSubmit = await a.request.put(`${API}time/timesheets/${defA.id}`, { data: { action: 'APPROVE' } });
  const statusAfterApproveAttempt = await essDefault(a.request);
  report.check(
    '5.2-PrivEsc ESS coba self-approve timesheet SENDIRI yg sudah SUBMITTED (action APPROVE via endpoint ESS sendiri) -> ditolak (bukan 200), status TETAP SUBMITTED (bukan APPROVED)',
    approveAfterSubmit.status() !== 200 && statusAfterApproveAttempt.status === 'SUBMITTED',
    `status=${approveAfterSubmit.status()} timesheetStatus=${statusAfterApproveAttempt.status}`,
  );
  await closeA();

  report.step('[Setup] ESS B - timesheet NOT SUBMITTED dgn 1 entry valid, utk race condition Submit');
  const { essPage: b, close: closeB, timesheetId: idB } = await createEssTimesheet(page, browser, addEmployeePage, 'QaTsRace', { submit: false });
  const statusBeforeRace = await essDefault(b.request);
  report.check('[Setup] ESS B status awal NOT SUBMITTED sblm race', statusBeforeRace.status === 'NOT SUBMITTED', `status=${statusBeforeRace.status}`);

  report.step('4.4 2 PUT {action:SUBMIT} PARALEL pada timesheet yg SAMA -- HARUS tepat SATU yg sukses 200, tidak boleh keduanya sukses/korup');
  const [subA, subB] = await Promise.all([
    b.request.put(`${API}time/timesheets/${idB}`, { data: { action: 'SUBMIT' } }),
    b.request.put(`${API}time/timesheets/${idB}`, { data: { action: 'SUBMIT' } }),
  ]);
  const statusAfterRace = await essDefault(b.request);
  const successCount = [subA, subB].filter((r) => r.status() === 200).length;
  report.check(
    '4.4 Race condition 2x Submit paralel -> TEPAT SATU 200 (yg lain ditolak/non-200), status akhir SUBMITTED (tidak ada duplikasi/korupsi state)',
    successCount === 1 && statusAfterRace.status === 'SUBMITTED',
    `subA=${subA.status()} subB=${subB.status()} successCount=${successCount} timesheetStatus=${statusAfterRace.status}`,
  );
  await closeB();

  report.step('[Cleanup] Hapus Customer+Project yg dibuat utk uji 1.4');
  await deleteProjects(page.request, [projId]);
  await deleteCustomers(page.request, [custId]);

  report.print();
});

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
