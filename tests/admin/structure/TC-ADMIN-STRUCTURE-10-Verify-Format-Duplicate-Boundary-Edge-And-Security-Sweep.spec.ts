/**
 * ================================================================================
 * TC-ADMIN-STRUCTURE-10 — Verify Format, Duplicate Conflict, Invalid-Record, Boundary,
 *   Edge Case And Security Sweep For Organization Structure
 * Modul    : Admin > Organization > Structure (U020)
 * Kategori : Negative (-) 2.2 2.3 2.6 | Boundary (B) 3.1 | Edge (!) 4.1 4.2 4.3 4.5 4.6 4.7 4.8 |
 *            Security (S) 5.2-MassAssign 5.4 5.5 | API (A) 6.2 6.3 6.4 6.5 6.7 | UI (1.8) (8.4)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-STRUCTURE-10-Verify-Format-Duplicate-Boundary-Edge-And-Security-Sweep.spec.ts
 * Path     : tests/admin/structure/
 * ================================================================================
 *
 * LATAR: rebuild matrix 25 Nov 2026 menunjukkan U020 py 21 kode GAP -- TC lama
 * (STRUCTURE-01..09) sudah menguji CRUD dasar + nested child via UI, tapi belum menyentuh
 * schema/boundary/duplicate/security. Pola sama dgn TC-ADMIN-ORGGI-07 (U018), ditulis
 * terpisah krn bentuk endpoint beda total (tree nested-set, bukan singleton).
 *
 * EKSPLORASI LIVE (Playwright MCP, sebelum menulis kode) membuktikan:
 *   - POST/PUT /api/v2/admin/subunits (POST body: {name, unitId, description, parentId};
 *     PUT body: {name, unitId, description} -- parentId DITOLAK 422 di PUT, pohon tidak
 *     bisa dipindah lewat edit, hanya lewat hapus+buat ulang). DELETE /subunits/<id>
 *     (singular, BUKAN {ids:[]} spt list Admin lain). Response memakai model nested-set
 *     (level/left/right), bukan parentId langsung.
 *   - Boundary name: 100 karakter DITERIMA, 101 DITOLAK 422 -- IDENTIK dgn batas Organization
 *     Name di U018 (General Information), mengindikasikan validator yg dibagi (shared).
 *   - 404 "Record Not Found" (string status) konsisten utk GET/PUT/DELETE pd id yang sudah
 *     dihapus ATAU tidak pernah ada, DAN utk parentId hantu saat create -- KONTRAS POSITIF
 *     dgn pola bug BG-499/BG-504 (403 integer di endpoint lain), tidak ada bug di sini.
 *   - 4.8 non-obvious (BENAR, bukan bug): PUT record dgn namanya SENDIRI yang tidak berubah
 *     -> 200 (tidak keliru dianggap duplikat dgn dirinya sendiri).
 *   - 2.3/6.7 (KOREKSI PENTING vs dugaan awal): POST create dgn name yang SUDAH dipakai unit
 *     lain TERNYATA JUGA ditolak 422, KONSISTEN dgn PUT edit -- keunikan name ditegakkan DI
 *     KEDUANYA. Dugaan awal (POST longgar) berasal dari eksplorasi live SEBELUM menulis kode
 *     yang TANPA SADAR menguji ulang setelah demo publik reset ke data seed default
 *     (sehingga nama yang dikira "sudah dipakai" ternyata sudah tidak ada) -- dibuktikan
 *     SALAH lewat 2 POST sungguhan balik-balik (bukan terpisah sesi) di script ini: POST
 *     kedua dgn name identik ke POST pertama SELALU 422. TIDAK ada BG baru dari sini.
 *   - 4.2 double-submit (TERNYATA pola BEDA dari BG-427 family): 2 POST paralel dgn body
 *     name IDENTIK -> TEPAT SATU 200, yang lain 422 krn validasi keunikan yang sama di atas
 *     -- bukan dedicated idempotency key, tapi secara FUNGSIONAL mencegah double-submit
 *     duplikat (kontras POSITIF dgn Job Title/Custom Field/dst yang double-click-nya
 *     membuat 2 record, lihat BG-427/475/483/486/487).
 *   - 4.1 karakter tidak biasa (TEMUAN, bukan bug): accented/CJK/Arabic/Cyrillic/emoji BMP
 *     (U+2764 "heart") semua DITERIMA utuh, TAPI emoji ASTRAL (surrogate pair 4-byte UTF-8,
 *     mis. U+1F600 "grinning face") DITOLAK 422 -- kontras dgn Organization Name (U018) yang
 *     MENERIMA astral emoji yang SAMA (lihat TC-ADMIN-ORGGI-07). Dua field "name" yang
 *     berbagi batas panjang 100 karakter yang SAMA TIDAK berbagi validator karakter yang
 *     sama. Bukan bug (menolak astral di sini justru LEBIH AMAN, konsisten dgn kelas bug
 *     BG-494/496/501/505/506 di modul lain yang astral-nya malah 500), tapi inkonsistensi
 *     antar-field yang didokumentasikan sbg finding.
 *   - [KONFIRMASI BUG LAMA, BUKAN bug baru] description dikirim sbg JSON null (bukan string
 *     kosong) ditolak 422 BAIK di POST maupun PUT -- ini BG-025 yang sudah tercatat (9 Nov
 *     2026, ditemukan lewat jalur PUT rename), dibuktikan di sini jalur POST create jg
 *     terkena akar masalah yang sama; dicatat via finding(), bukan check gagal baru, utk
 *     hindari duplikasi bug id (konvensi project: 1 bug id per root cause yang SUDAH ada).
 *
 * SEMUA unit uji berprefix "QaStructSweep"/"QaStruct...", dibuat di bawah ROOT (bukan di
 * bawah Administration/Engineering/dst milik struktur asli) dan DIHAPUS di akhir test --
 * tidak menyentuh "hola"/"juan perez"/departemen bawaan yang dipakai modul lain.
 *
 * HASIL 25 Nov 2026: LOLOS PENUH, TIDAK ADA bug baru (stabil 3x run berturut-turut) -- 2
 *   dugaan bug dari eksplorasi awal (keunikan name longgar di create, double-submit
 *   duplikat) terbukti SALAH setelah diuji sungguhan di script (lihat koreksi di atas);
 *   1 bug lama (BG-025) dikonfirmasi ulang via finding(), bukan entri baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/structure/TC-ADMIN-STRUCTURE-10-Verify-Format-Duplicate-Boundary-Edge-And-Security-Sweep.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

const SUBUNITS_API = '/web/index.php/api/v2/admin/subunits';

type Row = Record<string, unknown>;
const json = async (r: { json(): Promise<unknown> }) => (await r.json().catch(() => null)) as { data?: Row; error?: Row } | null;

test('TC-ADMIN-STRUCTURE-10: format/duplicate/invalid-record/boundary/edge/security sweep for Organization Structure', async ({
  page,
  adminStructurePage,
}, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-ADMIN-STRUCTURE-10', 'Format Duplicate Boundary Edge Security Sweep', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /status of 401/, /reading 'response'/,
  ]);
  const createdIds: number[] = [];

  const post = async (data: Row) => {
    const res = await page.request.post(SUBUNITS_API, { data });
    const body = await json(res);
    const id = (body?.data as Row | undefined)?.id as number | undefined;
    if (typeof id === 'number') createdIds.push(id);
    return { status: res.status(), body, id };
  };
  const put = async (id: number, data: Row) => {
    const res = await page.request.put(`${SUBUNITS_API}/${id}`, { data });
    return { status: res.status(), body: await json(res) };
  };
  const del = async (id: number) => page.request.delete(`${SUBUNITS_API}/${id}`);

  report.step('Setup: buat 1 unit probe dasar di bawah root');
  const baseName = uniqueName('QaStructSweep');
  const base = await post({ name: baseName, unitId: '', description: 'probe base', parentId: 1 });
  report.check('Setup create -> 200 + id', base.status === 200 && typeof base.id === 'number', `status=${base.status}`);

  report.step('6.2 response schema: POST membawa id/name/unitId/description/level/left/right dgn tipe benar');
  const schemaKeys = Object.keys(base.body?.data ?? {});
  report.check('6.2 Schema POST lengkap (id/name/unitId/description/level/left/right)', ['id', 'name', 'unitId', 'description', 'level', 'left', 'right'].every((k) => schemaKeys.includes(k)), `keys=${JSON.stringify(schemaKeys)}`);

  report.step('2.2 format: name bertipe object (bukan string) -> 422, bukan 500');
  const badType = await post({ name: { bad: 'type' }, unitId: '', description: '', parentId: 1 });
  report.check('2.2 name bertipe object -> 422 (bukan 500)', badType.status === 422, `status=${badType.status}`);

  report.step('2.6 operasi pada record tidak valid: parentId hantu, nama kosong/whitespace-only, id tak ada/sudah dihapus');
  const ghostParent = await post({ name: uniqueName('QaStructGhostParent'), unitId: '', description: '', parentId: 999999 });
  report.check('2.6 parentId hantu (999999) -> 404 Record Not Found (bukan 500)', ghostParent.status === 404, `status=${ghostParent.status}`);
  const emptyName = await post({ name: '', unitId: '', description: '', parentId: 1 });
  report.check('2.1/2.6 name kosong -> 422', emptyName.status === 422, `status=${emptyName.status}`);
  const wsOnlyName = await post({ name: '      ', unitId: '', description: '', parentId: 1 });
  report.check('4.1 name whitespace-only -> 422 (ditolak, bukan diterima)', wsOnlyName.status === 422, `status=${wsOnlyName.status}`);
  const getNonExistent = await page.request.get(`${SUBUNITS_API}/999999`);
  report.check('2.6 GET id yang tidak pernah ada -> 404', getNonExistent.status() === 404, `status=${getNonExistent.status()}`);
  const delOnce = await del(base.id!);
  const delTwice = await del(base.id!);
  report.check('2.6 DELETE id yang SUDAH terhapus (kedua kali) -> 404 (bukan 200/500)', delOnce.status() === 200 && delTwice.status() === 404, `pertama=${delOnce.status()}, kedua=${delTwice.status()}`);
  createdIds.splice(createdIds.indexOf(base.id!), 1);

  report.step('3.1 boundary panjang Name subunit: 100 (terima) vs 101 (tolak)');
  const len100 = await post({ name: 'Q'.repeat(100), unitId: '', description: '', parentId: 1 });
  report.check('3.1 Name 100 karakter -> 200 (terima)', len100.status === 200, `status=${len100.status}`);
  const len101 = await post({ name: 'Q'.repeat(101), unitId: '', description: '', parentId: 1 });
  report.check('3.1 Name 101 karakter -> 422 (tolak)', len101.status === 422, `status=${len101.status}`);

  report.step('4.1 karakter tidak biasa: unicode non-astral tersimpan utuh, astral emoji DITOLAK (beda dgn Organization Name)');
  const cjkName = `QaStruct日本語${Date.now() % 100000}`;
  const cjk = await post({ name: cjkName, unitId: '', description: '', parentId: 1 });
  report.check('4.1 Unicode non-astral (CJK) di Name -> 200 & tersimpan UTUH', cjk.status === 200 && (cjk.body?.data as Row | undefined)?.name === cjkName, `name=${JSON.stringify((cjk.body?.data as Row | undefined)?.name)}`);
  const astralEmojiName = `QaStructEmoji\u{1F600}${Date.now() % 100000}`;
  const astralEmoji = await post({ name: astralEmojiName, unitId: '', description: '', parentId: 1 });
  report.check('4.1 Emoji ASTRAL (surrogate pair, mis. \u{1F600}) di Name -> 422 ditolak (bukan 500, aman)', astralEmoji.status === 422, `status=${astralEmoji.status}`);
  report.finding(
    '4.1 Inkonsistensi validator karakter antara 2 field "name" yang berbagi batas panjang 100',
    `Organization Name (U018, TC-ADMIN-ORGGI-07) MENERIMA emoji astral yang sama persis (200, tersimpan utuh); Structure Name (U020) MENOLAKNYA (422). Kedua field berbagi batas panjang 100 karakter yang identik tapi TIDAK berbagi validator karakter. Bukan bug (menolak astral justru lebih aman -- konsisten dgn kelas bug BG-494/496/501/505/506 di modul lain yang astral-nya 500 bukan ditolak bersih), didokumentasikan sbg inkonsistensi antar-field.`,
  );

  report.step('4.6 data kosong/null: description string KOSONG ("") saat create -> 200 (opsional, genuinely boleh kosong)');
  const noDesc = await post({ name: uniqueName('QaStructNoDesc'), unitId: '', description: '', parentId: 1 });
  report.check('4.6 description string kosong ("") -> 200 (opsional)', noDesc.status === 200, `status=${noDesc.status}`);
  const nullDescProbe = await post({ name: uniqueName('QaStructNullDescProbe'), unitId: '', description: null, parentId: 1 });
  report.finding(
    '4.6 description bernilai JSON null (BUKAN string kosong) saat create',
    `Server MENOLAK 422 (invalidParamKeys menyebut "description") ketika description dikirim sbg null -- field ini hanya menerima absennya konten lewat string kosong ("" ), bukan null. Ini KONFIRMASI ULANG bug yang SUDAH tercatat di Bug-List.xlsx sbg BG-025 (ditemukan 9 Nov 2026 lewat jalur PUT edit rename, kini terbukti jalur yang SAMA juga berlaku di POST create) -- TIDAK dicatat sbg bug baru, status=${nullDescProbe.status}.`,
  );

  report.step('4.8 non-obvious (BENAR): PUT record dgn nama SENDIRI yang tidak berubah -> 200, tidak dianggap duplikat dgn dirinya sendiri');
  const selfResave = await put(noDesc.id!, { name: (noDesc.body?.data as Row | undefined)?.name, unitId: '', description: 'desc berubah, name tidak' });
  report.check('4.8 PUT nama tak berubah (hanya description) -> 200', selfResave.status === 200, `status=${selfResave.status}`);

  report.step('5.2-MassAssign: field asing (id/level/left/right) di body PUT -> 422, ditolak eksplisit');
  const massAssign = await put(noDesc.id!, { name: uniqueName('QaStructMassAssign'), unitId: '', description: '', level: 99, left: 1, right: 2, id: 999 });
  const massAssignKeys = ((massAssign.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
  report.check('5.2-MassAssign Field asing ditolak 422 DAN disebut eksplisit', massAssign.status === 422 && !!massAssignKeys?.some((k) => ['level', 'left', 'right', 'id'].includes(k)), `status=${massAssign.status}, invalidParamKeys=${JSON.stringify(massAssignKeys)}`);
  const massAssignParentId = await put(noDesc.id!, { name: uniqueName('QaStructMassAssignParent'), unitId: '', description: '', parentId: 1 });
  report.check('5.2-MassAssign parentId (tidak diizinkan di PUT) ditolak 422 -- edit tidak bisa memindah node', massAssignParentId.status === 422, `status=${massAssignParentId.status}`);

  report.step('2.3 / 6.7: name duplikat DITOLAK KONSISTEN baik di POST create maupun PUT edit');
  const dupBaseName = uniqueName('QaStructDupBase');
  const dupBase = await post({ name: dupBaseName, unitId: '', description: '', parentId: 1 });
  const dupCreate = await post({ name: dupBaseName, unitId: '', description: 'dup via create', parentId: 1 });
  report.check(
    '2.3 POST create dgn name yang SUDAH dipakai unit lain -> 422 ditolak (keunikan ditegakkan di create, sama seperti edit)',
    dupCreate.status === 422,
    `status=${dupCreate.status} (name "${dupBaseName}" sudah dipakai id=${dupBase.id})`,
  );
  const dupViaEdit = await put(noDesc.id!, { name: dupBaseName, unitId: '', description: '' });
  report.check(
    '6.7 Konsisten dgn POST di atas: PUT edit ke name yang sama JUGA ditolak 422 (keunikan ditegakkan di create DAN edit, bukan salah satu saja)',
    dupViaEdit.status === 422,
    `status PUT=${dupViaEdit.status} vs status POST di atas=${dupCreate.status}`,
  );

  report.step('4.2 double-submit: 2 POST paralel dgn body IDENTIK (simulasi klik ganda Save) -> keunikan name mencegah duplikat (TEPAT SATU 200)');
  const dblName = uniqueName('QaStructDblSubmit');
  const [dblA, dblB] = await Promise.all([
    post({ name: dblName, unitId: '', description: 'A', parentId: 1 }),
    post({ name: dblName, unitId: '', description: 'B', parentId: 1 }),
  ]);
  const dblSuccessCount = [dblA, dblB].filter((r) => r.status === 200).length;
  report.finding(
    '4.2 Double-click Save (2 POST identik paralel) dicegah secara tidak langsung oleh validasi keunikan name',
    `TEPAT SATU dari 2 request paralel berhasil (A=${dblA.status}, B=${dblB.status}) -- yang kalah ditolak 422 krn name sudah dipakai duluan oleh yang menang. Bukan dedicated idempotency key, tapi secara fungsional mencegah double-submit membuat duplikat -- kontras POSITIF dgn Job Title/Custom Field/Tracker/dst di modul lain yang double-click-nya SUKSES membuat 2 record (BG-427/475/483/486/487 family).`,
  );
  report.check('4.2 Dua POST paralel dgn name identik -> TEPAT SATU 200 (keunikan mencegah duplikat, bukan 2x sukses atau crash)', dblSuccessCount === 1, `A=${dblA.status}, B=${dblB.status}`);

  report.step('4.7 konkurensi: 2 PUT paralel merename node yang SAMA ke nama berbeda -> salah satu menang, tidak korup');
  const [concA, concB] = await Promise.all([
    put(noDesc.id!, { name: uniqueName('QaStructConcA'), unitId: '', description: '' }),
    put(noDesc.id!, { name: uniqueName('QaStructConcB'), unitId: '', description: '' }),
  ]);
  const afterConc = await json(await page.request.get(`${SUBUNITS_API}/${noDesc.id}`));
  const concAName = (concA.body?.data as Row | undefined)?.name;
  const concBName = (concB.body?.data as Row | undefined)?.name;
  const finalName = (afterConc?.data as Row | undefined)?.name;
  report.check(
    '4.7 Dua PUT rename paralel (nama unik, tidak saling duplikat) ke node yang sama -> keduanya 200, hasil akhir = SALAH SATU nama yang dikirim (last-write-wins, bukan nama campur/korup)',
    concA.status === 200 && concB.status === 200 && (finalName === concAName || finalName === concBName),
    `A status=${concA.status} name=${concAName}, B status=${concB.status} name=${concBName}, akhir=${finalName}`,
  );

  report.step('5.5 rate limiting: 5 create paralel berturut-turut -> tidak ada pembatasan (didokumentasikan sbg finding, bukan hard-fail)');
  const rl = await Promise.all(Array.from({ length: 5 }, (_, i) => post({ name: uniqueName(`QaStructRate${i}`), unitId: '', description: '', parentId: 1 })));
  const rlOkCount = rl.filter((r) => r.status === 200).length;
  report.finding('5.5 Rate limiting create subunit', `${rlOkCount}/5 create paralel berturut-turut berhasil 200 -- tidak ada rate limiting pd endpoint ini (sama dgn pola unit lain di project ini).`);

  report.step('6.3 request method salah: PATCH -> 405, PUT tanpa id (collection) -> 405');
  const patchTry = await page.request.fetch(`${SUBUNITS_API}/${noDesc.id}`, { method: 'PATCH', data: { name: 'x' } });
  const putNoId = await page.request.put(SUBUNITS_API, { data: { name: 'x' } });
  report.check('6.3 PATCH -> 405 Method Not Allowed', patchTry.status() === 405, `status=${patchTry.status()}`);
  report.check('6.3 PUT tanpa id (collection) -> 405 Method Not Allowed', putNoId.status() === 405, `status=${putNoId.status()}`);

  report.step('6.4 auth/token: GET tree tanpa cookie sesi -> 401');
  const noAuthStatus = await page.evaluate(async (url) => {
    const r = await fetch(url, { credentials: 'omit' });
    return r.status;
  }, `${SUBUNITS_API}?mode=tree`);
  report.check('6.4 GET subunits tanpa cookie sesi -> 401 "Session expired"', noAuthStatus === 401, `status=${noAuthStatus}`);

  report.step('6.5 parameter negative test: parentId bertipe string non-numerik -> 404/422, bukan 500');
  const strParent = await post({ name: uniqueName('QaStructStrParent'), unitId: '', description: '', parentId: 'not-a-number' });
  report.check('6.5 parentId string non-numerik -> 4xx (bukan 500)', strParent.status >= 400 && strParent.status < 500, `status=${strParent.status}`);

  report.step('8.4 konsistensi pesan error: envelope error SAMA bentuknya utk 404 vs 422');
  const err404 = await page.request.get(`${SUBUNITS_API}/999999`);
  const err404Body = await json(err404);
  const err422Body = badType.body;
  const has404Shape = ['status', 'message'].every((k) => Object.keys((err404Body?.error as Row | undefined) ?? {}).includes(k));
  const has422Shape = ['status', 'message', 'data'].every((k) => Object.keys((err422Body?.error as Row | undefined) ?? {}).includes(k));
  report.check(
    '8.4 Struktur error {status,message[,data]} konsisten antar 404 dan 422',
    has404Shape && has422Shape && (err404Body?.error as Row | undefined)?.message === 'Record Not Found' && (err422Body?.error as Row | undefined)?.message === 'Invalid Parameter',
    `404=${JSON.stringify(err404Body)}, 422=${JSON.stringify(err422Body)}`,
  );

  report.step('1.8 feedback UI: Add unit valid via UI -> toast sukses muncul');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  await adminStructurePage.addUnderRoot();
  const uiName = uniqueName('QaStructUiToast');
  await adminStructurePage.nameInput.fill(uiName);
  const toast = page.locator('.oxd-toast-content, .oxd-text--toast-message').first();
  const [uiCreateRes] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(SUBUNITS_API) && r.request().method() === 'POST', { timeout: 20_000 }).catch(() => null),
    adminStructurePage.save(),
  ]);
  const uiCreateBody = uiCreateRes ? ((await json(uiCreateRes)) as { data?: Row } | null) : null;
  const uiCreateId = uiCreateBody?.data?.id as number | undefined;
  if (typeof uiCreateId === 'number') createdIds.push(uiCreateId);
  const toastVisible = await toast.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false);
  report.check('1.8 Toast sukses muncul setelah Add unit valid', toastVisible);

  report.step('4.3 navigasi tidak biasa: setelah Add, browser back/forward -> tree tetap render normal');
  await page.goBack({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.goForward({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const stillWorks = await isVisibleWithWait(page.getByText('Organization Structure', { exact: true }).first(), 10_000);
  report.check('4.3 Setelah Add -> back -> forward, halaman Structure tetap render normal', stillWorks, `url=${page.url()}`);

  report.step('4.5 session/koneksi: POST create di-abort mid-flight -> tidak silently sukses, node TIDAK ter-create di server');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  await adminStructurePage.addUnderRoot();
  const abortName = uniqueName('QaStructAbort');
  await adminStructurePage.nameInput.fill(abortName);
  await page.route('**/api/v2/admin/subunits', (route) => route.abort('failed'));
  await adminStructurePage.save().catch(() => {});
  await page.waitForTimeout(1500);
  await page.unroute('**/api/v2/admin/subunits').catch(() => {});
  const afterAbortTree = await json(await page.request.get(`${SUBUNITS_API}?mode=tree`));
  const treeHasAbortName = JSON.stringify(afterAbortTree).includes(abortName);
  report.check('4.5 Koneksi putus saat Add -> node TIDAK ter-create di server (tidak ada entri "QaStructAbort...")', !treeHasAbortName);

  report.step('5.4 CSRF: cookie sesi aman + Origin header tidak divalidasi (A/B status identik)');
  const cookie = (await page.context().cookies()).find((c) => c.name === 'orangehrm');
  report.check('5.4 Cookie sesi HttpOnly + Secure + SameSite Lax/Strict', !!cookie && cookie.httpOnly && cookie.secure && ['Lax', 'Strict'].includes(cookie.sameSite as string), JSON.stringify({ httpOnly: cookie?.httpOnly, secure: cookie?.secure, sameSite: cookie?.sameSite }));
  const legit = await post({ name: uniqueName('QaStructCsrfLegit'), unitId: '', description: '', parentId: 1 });
  const fake = await page.request.post(SUBUNITS_API, { data: { name: uniqueName('QaStructCsrfFake'), unitId: '', description: '', parentId: 1 }, headers: { Origin: 'https://evil.example' } });
  const fakeBody = await json(fake);
  const fakeId = (fakeBody?.data as Row | undefined)?.id as number | undefined;
  if (typeof fakeId === 'number') createdIds.push(fakeId);
  report.check('5.4 Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (pola app-wide)', legit.status === fake.status(), `legit=${legit.status}, fake=${fake.status()}`);

  report.step('Cleanup: hapus SEMUA unit probe yang dibuat (prefix QaStructSweep/QaStruct*)');
  for (const id of createdIds) {
    await del(id).catch(() => null);
  }
  const afterCleanupTree = await json(await page.request.get(`${SUBUNITS_API}?mode=tree`));
  const leftoverQa = JSON.stringify(afterCleanupTree).match(/QaStruct\w*/g) ?? [];
  report.check('Cleanup: tidak ada node "QaStruct*" tersisa di tree setelah dihapus semua', leftoverQa.length === 0, `sisa=${JSON.stringify(leftoverQa)}`);

  report.print();
});
