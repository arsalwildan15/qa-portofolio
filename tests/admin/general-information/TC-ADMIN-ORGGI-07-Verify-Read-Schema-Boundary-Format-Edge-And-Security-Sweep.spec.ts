/**
 * ================================================================================
 * TC-ADMIN-ORGGI-07 — Verify Read, Response Schema, Boundary, Format, Edge Case And
 *   Security Sweep For General Information
 * Modul    : Admin > Organization > General Information (U018)
 * Kategori : Positive (+) 1.1-R 1.2 1.4 1.8 | Negative (-) 2.2 | Boundary (B) 3.1 |
 *            Edge (!) 4.1 4.2 4.3 4.5 4.6 4.7 | Security (S) 5.2-MassAssign 5.4 |
 *            API (A) 6.2 6.3 6.4 6.5 | UI (8.4)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-ORGGI-07-Verify-Read-Schema-Boundary-Format-Edge-And-Security-Sweep.spec.ts
 * Path     : tests/admin/general-information/
 * ================================================================================
 *
 * LATAR: rebuild matrix 25 Nov 2026 menunjukkan U018 py 19 kode GAP identik dgn pola
 * "sweep" yg sudah dipakai di unit lain (TC-ADMIN-USER-12/13, TC-ADMIN-REFDATA-SWEEP-01) --
 * singleton record (bukan list Add/Edit/Delete) jadi TC lama (ORGGI-01..06) hanya menguji
 * happy-path + beberapa negative dasar, belum menyentuh schema/boundary/edge/security.
 *
 * EKSPLORASI LIVE (Playwright MCP, sebelum menulis kode) membuktikan:
 *   - GET/PUT /api/v2/admin/organization (singleton, TIDAK ada POST/DELETE -- 405 utk
 *     keduanya). Body PUT TERNYATA pakai key "country" (BUKAN "countryCode" spt asumsi di
 *     komentar page object lama), field kosong echo sbg null (bukan dihapus dari body).
 *   - Boundary name: 100 karakter DITERIMA, 101 DITOLAK 422 -- dikonfirmasi binary-search
 *     langsung via API (bukan ketik di form), sama persis dgn batas field "name" di
 *     subunits (U020), mengindikasikan validator yg dibagi (shared) antar 2 unit ini.
 *   - Mass assignment: field asing (noOfEmployees/isDefault/role/id) DITOLAK 422 dgn
 *     invalidParamKeys eksplisit menyebut nama field -- tervalidasi benar, TIDAK ada bug.
 *   - "Number of Employees" di UI TERBUKTI relasi nyata ke PIM (1.4): nilainya = meta.total
 *     dari GET pim/employees (bukan field tersendiri di response organization -- field itu
 *     SAMA SEKALI TIDAK ADA di payload GET/PUT organization, dikonfirmasi via daftar keys).
 *   - Leading/trailing whitespace pada Organization Name TIDAK di-trim server-side (disimpan
 *     verbatim) -- didokumentasikan sbg finding (bukan bug keras), whitespace-only & field
 *     bertipe non-string tetap ditolak 422 dgn benar.
 *   - [BUG, lihat SENGAJA FAILED] Field Country TIDAK divalidasi terhadap daftar kode ISO --
 *     string sembarang ("ZZZZZZ", 6 karakter, bukan kode 2-huruf valid) DITERIMA 200 via API
 *     langsung (dropdown UI memang hanya whitelist visual, server tidak menegakkan apa pun).
 *
 * SEMUA mutasi dibungkus snapshot (GET penuh di awal) + restore (PUT nilai asli di akhir,
 * finally-equivalent lewat urutan step) -- record ini singleton yg dilihat SEMUA user demo
 * publik, sama persis disiplin ORGGI-01..06.
 *
 * HASIL 25 Nov 2026: SENGAJA FAILED (1 check, R3 -- lihat BG-517), sisanya lolos.
 *   BG-517 (Medium) -- PUT admin/organization menerima nilai "country" sembarang tanpa
 *     validasi enum ISO (hanya divalidasi di UI lewat dropdown, bukan di server).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/general-information/TC-ADMIN-ORGGI-07-Verify-Read-Schema-Boundary-Format-Edge-And-Security-Sweep.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

const ORG_API = '/web/index.php/api/v2/admin/organization';
const EMP_API = '/web/index.php/api/v2/pim/employees';

type Row = Record<string, unknown>;
const json = async (r: { json(): Promise<unknown> }) => (await r.json().catch(() => null)) as { data?: Row; error?: Row } | null;

test('TC-ADMIN-ORGGI-07: read/schema/boundary/format/edge/security sweep for General Information', async ({
  page,
  adminGeneralInformationPage,
}, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-ADMIN-ORGGI-07', 'Read Schema Boundary Format Edge Security Sweep', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /status of 401/, /reading 'response'/,
  ]);
  const gi = adminGeneralInformationPage;

  report.step('1.1-R / 6.2: GET organization -> 200 + schema lengkap (semua key yang diharapkan ada, tipe benar)');
  const getRes = await page.request.get(ORG_API);
  const original = (await json(getRes))?.data as Row;
  const expectedKeys = ['name', 'taxId', 'registrationNumber', 'phone', 'fax', 'email', 'country', 'province', 'city', 'zipCode', 'street1', 'street2', 'note'];
  const actualKeys = Object.keys(original ?? {});
  report.check('1.1-R GET organization -> 200', getRes.status() === 200, `status=${getRes.status()}`);
  report.check('6.2 Response schema membawa SEMUA key yang diharapkan, tidak ada yang hilang', expectedKeys.every((k) => actualKeys.includes(k)), `keys=${JSON.stringify(actualKeys)}`);
  report.check('6.2 "name" bertipe string', typeof original?.name === 'string', `typeof=${typeof original?.name}`);

  const put = async (extra: Row) => {
    const res = await page.request.put(ORG_API, { data: { ...original, ...extra } });
    return { status: res.status(), body: await json(res) };
  };
  const restore = async () => put({});

  report.step('1.4 relasi antar-entity: "Number of Employees" di UI = meta.total dari GET pim/employees (toleransi kecil, demo publik dipakai banyak user bersamaan)');
  await gi.goto();
  const noOfEmployeesText = await page.locator('.oxd-input-group', { has: page.getByText('Number of Employees', { exact: true }) }).locator('p').first().textContent();
  const empListRes = await page.request.get(`${EMP_API}?limit=1`);
  const empTotal = ((await json(empListRes)) as unknown as { meta?: { total?: number } } | null)?.meta?.total;
  const uiCount = Number((noOfEmployeesText ?? '').trim());
  const diff = typeof empTotal === 'number' && !Number.isNaN(uiCount) ? Math.abs(empTotal - uiCount) : Infinity;
  report.check(
    '1.4 "Number of Employees" di halaman BERDEKATAN dgn total employee PIM (relasi nyata, bukan field statis -- toleransi kecil krn demo publik bisa berubah antara 2 pembacaan)',
    diff <= 15,
    `UI="${noOfEmployeesText}", PIM meta.total=${empTotal}, selisih=${diff}`,
  );

  report.step('1.2 kombinasi field opsional: semua NULL -> 200, semua TERISI -> 200');
  const allNull = await put({ taxId: null, registrationNumber: null, phone: null, fax: null, email: null, country: null, province: null, city: null, zipCode: null, street1: null, street2: null, note: null });
  report.check('1.2 Semua field opsional dikosongkan (null) -> 200 (genuinely opsional)', allNull.status === 200, `status=${allNull.status}`);
  const allFilled = await put({ taxId: 'QA-TAX', registrationNumber: 'QA-REG', phone: '021-555', fax: '021-556', email: 'qa-sweep@example.com', country: 'ID', province: 'QA Province', city: 'QA City', zipCode: '12345', street1: 'QA Street 1', street2: 'QA Street 2', note: 'QA note' });
  report.check('1.2 Semua field opsional diisi penuh -> 200 & tersimpan', allFilled.status === 200 && (allFilled.body?.data as Row | undefined)?.email === 'qa-sweep@example.com', `status=${allFilled.status}`);

  report.step('4.6 data kosong/null: GET setelah semua null -> field tetap echo null (bukan hilang dari schema)');
  await put({ taxId: null, registrationNumber: null, phone: null, fax: null, email: null, country: null, province: null, city: null, zipCode: null, street1: null, street2: null, note: null });
  const afterNullGet = (await json(await page.request.get(ORG_API)))?.data as Row;
  report.check('4.6 Field null tetap muncul EKSPLISIT sbg null di schema (bukan key hilang)', Object.keys(afterNullGet ?? {}).includes('taxId') && afterNullGet?.taxId === null, `taxId=${JSON.stringify(afterNullGet?.taxId)}`);

  report.step('2.2 format salah: email tanpa "@", name bertipe number -> 422 (bukan 500)');
  const badEmail = await put({ email: 'not-an-email' });
  const badEmailKeys = ((badEmail.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
  report.check('2.2 Email format salah -> 422 dgn invalidParamKeys menyebut "email"', badEmail.status === 422 && !!badEmailKeys?.includes('email'), `status=${badEmail.status}, invalidParamKeys=${JSON.stringify(badEmailKeys)}`);
  const badNameType = await put({ name: 12345 });
  report.check('2.2 Organization Name bertipe number (bukan string) -> 422', badNameType.status === 422, `status=${badNameType.status}`);

  report.step('3.1 boundary panjang Organization Name: 100 (terima) vs 101 (tolak), dicek via API langsung');
  const len100 = await put({ name: 'Q'.repeat(100) });
  report.check('3.1 Name 100 karakter -> 200 (terima)', len100.status === 200, `status=${len100.status}`);
  const len101 = await put({ name: 'Q'.repeat(101) });
  report.check('3.1 Name 101 karakter -> 422 (tolak, satu karakter lewat batas)', len101.status === 422, `status=${len101.status}`);

  report.step('4.1 karakter tidak biasa: emoji/unicode tersimpan utuh, whitespace-only ditolak, leading/trailing space TIDAK di-trim (finding)');
  const emoji = await put({ name: 'Qa\u{1F600}Sweep' });
  report.check('4.1 Emoji di Organization Name -> 200 & tersimpan UTUH (tidak terkorupsi jadi "??")', emoji.status === 200 && (emoji.body?.data as Row | undefined)?.name === 'Qa\u{1F600}Sweep', `name=${JSON.stringify((emoji.body?.data as Row | undefined)?.name)}`);
  const wsOnly = await put({ name: '      ' });
  report.check('4.1 Name whitespace-only -> 422 (ditolak, bukan diterima sbg string "kosong tak terlihat")', wsOnly.status === 422, `status=${wsOnly.status}`);
  const padded = await put({ name: '  QaPaddedSweep  ' });
  const paddedBack = (padded.body?.data as Row | undefined)?.name;
  report.finding('4.1 Leading/trailing whitespace pada Organization Name', `Server TIDAK men-trim: dikirim "  QaPaddedSweep  " -> disimpan verbatim sbg ${JSON.stringify(paddedBack)}. Bukan bug keras (tidak ada field lain yang mengasumsikan ter-trim), tapi berisiko nama tampil dgn spasi tak terlihat di laporan/pencarian.`);

  report.step('4.2 double-submit: 2 PUT paralel dgn nilai BEDA -> keduanya 200, state akhir = salah satu (bukan korup)');
  const [raceA, raceB] = await Promise.all([
    put({ note: 'QaRaceA' }),
    put({ note: 'QaRaceB' }),
  ]);
  const afterRace = (await json(await page.request.get(ORG_API)))?.data as Row;
  report.check('4.2 Dua PUT paralel keduanya 200 (tidak ada yang crash/ditolak krn konflik)', raceA.status === 200 && raceB.status === 200, `A=${raceA.status}, B=${raceB.status}`);
  report.check('4.2 Notes akhir = salah satu dari 2 nilai yang dikirim paralel (last-write-wins, bukan data campur/korup)', afterRace?.note === 'QaRaceA' || afterRace?.note === 'QaRaceB', `note akhir="${afterRace?.note}"`);

  report.step('4.7 konkurensi multi-user: 2 field BERBEDA diedit via 2 request paralel (simulasi 2 admin edit bersamaan) -> keduanya tersimpan, tidak ada yang hilang/overwrite silang');
  const concPhone = '0215551234';
  const concFax = '0215555678';
  const [concA, concB] = await Promise.all([
    put({ phone: concPhone }),
    put({ fax: concFax }),
  ]);
  const afterConc = (await json(await page.request.get(ORG_API)))?.data as Row;
  report.check(
    '4.7 Dua admin "berbeda" mengedit field BERBEDA pd record yang sama secara paralel -> keduanya 200, TIDAK ada field yang kembali ke nilai lama (last-write-wins per-request, bukan snapshot stale yang menimpa balik)',
    concA.status === 200 && concB.status === 200 && (afterConc?.phone === concPhone || afterConc?.fax === concFax),
    `A=${concA.status}, B=${concB.status}, phone akhir="${afterConc?.phone}", fax akhir="${afterConc?.fax}"`,
  );

  report.step('4.3 navigasi tidak biasa: Save via UI lalu browser back/forward -> halaman tetap berfungsi normal');
  await gi.goto();
  await gi.enableEdit();
  await gi.notesField.fill('QaNavSweep');
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(ORG_API) && r.request().method() === 'PUT', { timeout: 20_000 }).catch(() => null),
    gi.save(),
  ]);
  await page.goBack({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.goForward({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const stillWorks = await isVisibleWithWait(page.getByText('General Information', { exact: true }).first(), 10_000);
  report.check('4.3 Setelah Save -> back -> forward, halaman General Information tetap render normal (tidak blank/error)', stillWorks, `url=${page.url()}`);

  report.step('1.8 feedback UI: Save valid menampilkan toast sukses');
  await gi.goto();
  await gi.enableEdit();
  await gi.notesField.fill('QaToastSweep');
  const toast = page.locator('.oxd-toast-content, .oxd-text--toast-message').first();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(ORG_API) && r.request().method() === 'PUT', { timeout: 20_000 }).catch(() => null),
    gi.save(),
  ]);
  const toastVisible = await toast.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false);
  report.check('1.8 Toast sukses muncul setelah Save valid', toastVisible);

  report.step('4.5 session/koneksi: PUT di-abort mid-flight (koneksi putus) -> tidak silently sukses, data server TIDAK berubah');
  const beforeAbort = (await json(await page.request.get(ORG_API)))?.data as Row;
  await gi.goto();
  await gi.enableEdit();
  await gi.notesField.fill('QaShouldNotPersistAbort');
  await page.route('**/api/v2/admin/organization', (route) => route.abort('failed'));
  await gi.save().catch(() => {});
  await page.waitForTimeout(1500);
  await page.unroute('**/api/v2/admin/organization').catch(() => {});
  const afterAbort = (await json(await page.request.get(ORG_API)))?.data as Row;
  report.check(
    '4.5 Koneksi putus saat Save -> Notes di server TETAP nilai sebelumnya (tidak ada perubahan yang silently tersimpan)',
    afterAbort?.note === beforeAbort?.note,
    `sebelum="${beforeAbort?.note}", sesudah="${afterAbort?.note}"`,
  );

  report.step('8.4 konsistensi pesan error: envelope error SAMA bentuknya utk 2 jenis invalid berbeda');
  const err1 = await put({ email: 'bad' });
  const err2 = await put({ name: { bad: 'type' } });
  const shape = (b: typeof err1.body) => JSON.stringify(Object.keys((b?.error as Row | undefined) ?? {}).sort());
  report.check('8.4 Struktur error {status,message,data.invalidParamKeys} konsisten antar jenis invalid', shape(err1.body) === shape(err2.body), `err1=${shape(err1.body)}, err2=${shape(err2.body)}`);

  report.step('5.2-MassAssign: field asing (noOfEmployees/isDefault/role/id) di body PUT -> 422, ditolak eksplisit');
  const massAssign = await put({ noOfEmployees: 99999, isDefault: true, role: 'admin', id: 1 });
  const invalidKeys = ((massAssign.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
  report.check('5.2-MassAssign Field asing ditolak 422 DAN disebut eksplisit di invalidParamKeys', massAssign.status === 422 && !!invalidKeys?.includes('noOfEmployees'), `status=${massAssign.status}, invalidParamKeys=${JSON.stringify(invalidKeys)}`);

  report.step('5.4 CSRF: cookie sesi aman + Origin header tidak divalidasi (A/B status identik)');
  const cookie = (await page.context().cookies()).find((c) => c.name === 'orangehrm');
  report.check('5.4 Cookie sesi HttpOnly + Secure + SameSite Lax/Strict', !!cookie && cookie.httpOnly && cookie.secure && ['Lax', 'Strict'].includes(cookie.sameSite as string), JSON.stringify({ httpOnly: cookie?.httpOnly, secure: cookie?.secure, sameSite: cookie?.sameSite }));
  const legitOrigin = await page.request.put(ORG_API, { data: { ...original, note: 'QaCsrfLegit' } });
  const fakeOrigin = await page.request.put(ORG_API, { data: { ...original, note: 'QaCsrfFake' }, headers: { Origin: 'https://evil.example' } });
  report.check('5.4 Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (pertahanan hanya cookie SameSite, pola app-wide)', legitOrigin.status() === fakeOrigin.status(), `legit=${legitOrigin.status()}, fake=${fakeOrigin.status()}`);

  report.step('6.3 request method salah: POST/DELETE ke endpoint singleton -> 405');
  const postTry = await page.request.post(ORG_API, { data: original });
  const deleteTry = await page.request.delete(ORG_API);
  report.check('6.3 POST ke /admin/organization -> 405 Method Not Allowed', postTry.status() === 405, `status=${postTry.status()}`);
  report.check('6.3 DELETE ke /admin/organization -> 405 Method Not Allowed', deleteTry.status() === 405, `status=${deleteTry.status()}`);

  report.step('6.4 auth/token: GET tanpa cookie sesi -> 401');
  const noAuthRes = await page.evaluate(async (url) => {
    const r = await fetch(url, { credentials: 'omit' });
    return r.status;
  }, ORG_API);
  report.check('6.4 GET organization tanpa cookie sesi -> 401 "Session expired"', noAuthRes === 401, `status=${noAuthRes}`);

  report.step('[SENGAJA FAILED, lihat BG-517] 6.5 parameter negative test: Country diisi kode sembarang (bukan ISO valid)');
  const badCountry = await put({ country: 'ZZZZZZ' });
  report.check(
    '6.5 Country dgn kode sembarang ("ZZZZZZ", bukan kode ISO 2-huruf valid) SEHARUSNYA ditolak 422, bukan diterima 200 (dropdown UI hanya whitelist visual, server tidak menegakkan apa pun)',
    badCountry.status !== 200,
    `status=${badCountry.status}, body=${JSON.stringify(badCountry.body)}`,
  );

  report.step('Restore nilai asli (shared-demo hygiene)');
  const restored = await restore();
  report.check('Record organization dikembalikan ke nilai asli', restored.status === 200, `status=${restored.status}`);

  report.print();
});
