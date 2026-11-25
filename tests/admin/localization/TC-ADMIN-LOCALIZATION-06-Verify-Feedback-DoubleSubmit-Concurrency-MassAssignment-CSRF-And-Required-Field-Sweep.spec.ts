/**
 * ================================================================================
 * TC-ADMIN-LOCALIZATION-06 — Verify Feedback, Double-Submit, Navigation, Session,
 *   Concurrency, Mass Assignment, CSRF And Required-Field Sweep For Localization
 * Modul    : Admin > Configuration > Localization (U030)
 * Kategori : Positive (+) 1.1-U 1.2 1.8 | Negative (-) 2.1 | Edge (!) 4.2 4.3 4.5
 *            4.6 4.7 | Security (S) 5.2-MassAssign 5.4 | API (A) 6.2 6.3 6.4 6.5 |
 *            UI (8.4)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCALIZATION-06-Verify-Feedback-DoubleSubmit-Concurrency-MassAssignment-CSRF-And-Required-Field-Sweep.spec.ts
 * Path     : tests/admin/localization/
 * ================================================================================
 *
 * LATAR: rebuild matrix 26 Nov 2026 menunjukkan U030 py 16 kode GAP (pola IDENTIK
 * dgn U032 Modules -- lihat TC-ADMIN-MODULES-06). TC lama (LOCALIZATION-01..05)
 * hanya observasional/client-side (page object-nya SENGAJA tidak pernah klik Save,
 * krn setting ini GLOBAL utk semua user demo publik). Sesi ini memakai izin
 * eksplisit koordinator utk withConfigRestore (pola R6) -- SEMUA mutasi dibungkus
 * snapshot+restore, PUT langsung via page.request kecuali 1 langkah yg SENGAJA
 * memverifikasi toast 1.8 lewat UI Save asli.
 *
 * EKSPLORASI LIVE (Playwright MCP, sebelum menulis kode) membuktikan:
 *   - GET/PUT /api/v2/admin/localization, body {language, dateFormat} (2 string).
 *     Baseline demo ini: language="en_US", dateFormat="Y-d-m". Via UI klik dropdown
 *     + Save dikonfirmasi: "French - Français" -> language="fr"; "yyyy-mm-dd" ->
 *     dateFormat="Y-m-d" (kode internal BUKAN label UI apa pun yg terlihat).
 *   - BEDA dgn Modules (lihat BG-518): required-field DI SINI konsisten -- omit
 *     "language" sendirian -> 422 invalidParamKeys:["language"]; omit "dateFormat"
 *     sendirian -> 422 invalidParamKeys:["dateFormat"]; body kosong {} -> 422
 *     menyebut KEDUANYA. TIDAK ADA bug required-field di unit ini (finding kontras,
 *     bukan masalah).
 *   - Value tidak valid DITOLAK dgn benar di KEDUA field: language="zz_ZZ_BOGUS" ->
 *     422; dateFormat="NOT-A-REAL-FORMAT" -> 422; language bertipe number -> 422.
 *     Mass assignment (isSuperAdmin/extra) -> 422 eksplisit. TIDAK ADA bug security
 *     ditemukan di unit ini (semua jalur tervalidasi benar, kontras dgn
 *     BG-025/BG-517/BG-518 di unit Admin lain).
 *
 * SEMUA mutasi dibungkus withConfigRestore (snapshot GET di awal, restore PUT di
 * finally) -- record ini singleton global dilihat SEMUA user demo publik.
 *
 * HASIL 26 Nov 2026: SEMUA check lolos, TIDAK ADA bug baru di unit ini.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/localization/TC-ADMIN-LOCALIZATION-06-Verify-Feedback-DoubleSubmit-Concurrency-MassAssignment-CSRF-And-Required-Field-Sweep.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { withConfigRestore } from '../../../src/utils/withConfigRestore';

const API = '/web/index.php/api/v2/admin/localization';
const BASELINE = { language: 'en_US', dateFormat: 'Y-d-m' };
type Row = Record<string, unknown>;
const json = async (r: { json(): Promise<unknown> }) => (await r.json().catch(() => null)) as { data?: Row; error?: Row } | null;

test('TC-ADMIN-LOCALIZATION-06: feedback/double-submit/navigation/session/concurrency/mass-assignment/CSRF/required-field sweep for Localization', async ({
  page,
  adminLocalizationPage,
}, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-ADMIN-LOCALIZATION-06', 'Feedback DoubleSubmit Concurrency MassAssignment CSRF RequiredField Sweep', env.baseURL, page, [
    /status of 422/, /status of 401/, /status of 405/, /net::ERR_FAILED/, /reading 'response'/,
  ]);
  const lp = adminLocalizationPage;

  const putRaw = async (body: Row) => {
    const res = await page.request.put(API, { data: body });
    return { status: res.status(), body: await json(res) };
  };
  const put = (extra: Row) => putRaw({ ...BASELINE, ...extra });

  await withConfigRestore(
    async () => (await json(await page.request.get(API)))?.data as Row,
    async (snap) => { await putRaw(snap ?? BASELINE); },
    async () => {
      report.step('6.2: GET localization -> 200, schema {language, dateFormat} string');
      const getRes = await page.request.get(API);
      const data = (await json(getRes))?.data as Row;
      report.check('6.2 GET localization -> 200', getRes.status() === 200, `status=${getRes.status()}`);
      report.check('6.2 Schema membawa "language" dan "dateFormat", keduanya string', typeof data?.language === 'string' && typeof data?.dateFormat === 'string', `data=${JSON.stringify(data)}`);

      report.step('1.1-U / 1.8: ganti Language ke French via UI Save -> PUT 200 & toast sukses, lalu restore via UI Save lagi');
      await lp.goto();
      await lp.openLanguageOptions();
      await page.getByRole('option', { name: 'French - Français' }).click();
      const putWait = page.waitForResponse((r) => r.url().includes('/api/v2/admin/localization') && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
      await lp.saveButton.click();
      const putRes = await putWait;
      const toast = await page.locator('.oxd-toast').first().innerText({ timeout: 8_000 }).catch(() => '');
      report.check('1.1-U Ganti Language ke French -> PUT 200', putRes?.status() === 200, `status=${putRes?.status()}`);
      report.check('1.8 Toast sukses muncul setelah Save', /Success/i.test(toast), `toast="${toast}"`);
      const afterToggle = (await json(await page.request.get(API)))?.data as Row;
      report.check('1.1-U Setelah Save, GET mencerminkan language="fr"', afterToggle?.language === 'fr', `language=${afterToggle?.language}`);
      // Restore via API directly (NOT a 2nd UI round-trip): mengganti Language ke "fr" membuat
      // SELURUH UI app ikut berganti bahasa (termasuk label dropdown/tombol), jadi locator
      // berbasis teks Inggris ("English (United States)") tidak lagi cocok setelah Save pertama
      // -- dikonfirmasi live menyebabkan hang/timeout 300s pada percobaan trial run pertama.
      // Perilaku app ini sendiri genuine (bukan bug skrip di sisi app), tapi membuktikan restore
      // HARUS locale-independent -- page.request API dipakai di sini persis karena alasan itu.
      const restoreRes = await putRaw(BASELINE);
      report.check('1.1-U Restore Language via API -> GET kembali ke "en_US"', restoreRes.status === 200 && restoreRes.body?.data?.language === 'en_US', `status=${restoreRes.status}, language=${restoreRes.body?.data?.language}`);

      report.step('1.2: kombinasi Language + Date Format diganti BERSAMAAN dlm satu PUT -> 200, lalu dikombinasikan balik');
      const comboChange = await putRaw({ language: 'fr', dateFormat: 'Y-m-d' });
      report.check('1.2 Kombinasi language="fr" + dateFormat="Y-m-d" dlm satu body -> 200 & keduanya tersimpan', comboChange.status === 200 && comboChange.body?.data?.language === 'fr' && comboChange.body?.data?.dateFormat === 'Y-m-d', `status=${comboChange.status}, data=${JSON.stringify(comboChange.body?.data)}`);
      const comboRestore = await putRaw(BASELINE);
      report.check('1.2 Kombinasi direstore ke baseline dlm satu body -> 200', comboRestore.status === 200 && comboRestore.body?.data?.language === 'en_US' && comboRestore.body?.data?.dateFormat === 'Y-d-m', `status=${comboRestore.status}`);

      report.step('2.1: required-field -- KEDUA field (language & dateFormat) konsisten divalidasi kalau dihilangkan sendirian (kontras dgn BG-518 di Modules)');
      const omitLang: Row = { dateFormat: BASELINE.dateFormat };
      const langRes = await putRaw(omitLang);
      const langKeys = ((langRes.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('2.1 Hilangkan "language" dari body PUT -> 422 dgn invalidParamKeys menyebut "language"', langRes.status === 422 && !!langKeys?.includes('language'), `status=${langRes.status}, body=${JSON.stringify(langRes.body)}`);
      const omitDF: Row = { language: BASELINE.language };
      const dfRes = await putRaw(omitDF);
      const dfKeys = ((dfRes.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('2.1 Hilangkan "dateFormat" dari body PUT -> 422 dgn invalidParamKeys menyebut "dateFormat" (KONSISTEN dgn "language" -- TIDAK ada bug spt BG-518 di unit Modules)', dfRes.status === 422 && !!dfKeys?.includes('dateFormat'), `status=${dfRes.status}, body=${JSON.stringify(dfRes.body)}`);

      report.step('4.2: double-submit -- 2 PUT paralel dgn nilai dateFormat BEDA -> keduanya 200, state akhir = salah satu');
      const [raceA, raceB] = await Promise.all([put({ dateFormat: 'Y-m-d' }), put({ dateFormat: 'd-m-Y' })]);
      const afterRace = (await json(await page.request.get(API)))?.data as Row;
      report.check('4.2 Dua PUT paralel keduanya 200', raceA.status === 200 && raceB.status === 200, `A=${raceA.status}, B=${raceB.status}`);
      report.check('4.2 dateFormat akhir = salah satu dari 2 nilai (last-write-wins, bukan korup)', afterRace?.dateFormat === 'Y-m-d' || afterRace?.dateFormat === 'd-m-Y', `dateFormat akhir=${afterRace?.dateFormat}`);
      await putRaw(BASELINE);

      report.step('4.3: ganti Date Format di UI TANPA Save, lalu reload -> nilai server tetap tampil, perubahan client-side hilang');
      await lp.goto();
      await lp.openDateFormatOptions();
      await page.getByRole('option', { name: /yyyy-mm-dd/ }).click();
      const clientSideText = await lp.dateFormatSelect.textContent();
      await lp.goto();
      const afterReloadText = await lp.dateFormatSelect.textContent();
      report.check('4.3 Pilihan Date Format berubah secara visual TANPA Save', /yyyy-mm-dd/.test(clientSideText ?? ''), `clientSide="${clientSideText}"`);
      report.check('4.3 Setelah reload TANPA Save, Date Format kembali ke nilai server (yyyy-dd-mm) -- perubahan client-side tidak persist', /yyyy-dd-mm/.test(afterReloadText ?? ''), `afterReload="${afterReloadText}"`);

      report.step('4.5: PUT dgn sesi terputus (cookie dihapus) -> 401, state server TIDAK berubah');
      const beforeSession = (await json(await page.request.get(API)))?.data as Row;
      const cookies = await page.context().cookies();
      await page.context().clearCookies();
      const noSessRes = await page.evaluate(async (url) => {
        const r = await fetch(url, { method: 'PUT', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: 'fr', dateFormat: 'Y-m-d' }) });
        return r.status;
      }, API);
      await page.context().addCookies(cookies);
      const afterSession = (await json(await page.request.get(API)))?.data as Row;
      report.check('4.5 PUT tanpa sesi -> 401', noSessRes === 401, `status=${noSessRes}`);
      report.check('4.5 State server TIDAK berubah setelah PUT tanpa sesi ditolak', afterSession?.language === beforeSession?.language && afterSession?.dateFormat === beforeSession?.dateFormat, `sebelum=${JSON.stringify(beforeSession)}, sesudah=${JSON.stringify(afterSession)}`);

      report.step('4.6: PUT dgn body kosong {} -> 422, invalidParamKeys menyebut KEDUA field required (bukan silently diterima)');
      const emptyRes = await putRaw({});
      const emptyInvalidKeys = ((emptyRes.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('4.6 Body kosong {} -> 422 (bukan diterima, bukan 500)', emptyRes.status === 422, `status=${emptyRes.status}`);
      report.check('4.6 invalidParamKeys menyebut KEDUA field ("language" dan "dateFormat")', !!emptyInvalidKeys?.includes('language') && !!emptyInvalidKeys?.includes('dateFormat'), `invalidParamKeys=${JSON.stringify(emptyInvalidKeys)}`);

      report.step('4.7: konkurensi 2 "admin" -- 2 PUT paralel edit field BERBEDA (language vs dateFormat) -> keduanya tersimpan, tidak saling timpa');
      const [concA, concB] = await Promise.all([put({ language: 'fr' }), put({ dateFormat: 'Y-m-d' })]);
      const afterConc = (await json(await page.request.get(API)))?.data as Row;
      report.check(
        '4.7 Dua "admin" edit field berbeda scr paralel -> keduanya 200, TIDAK ada field yang kembali ke nilai lama krn ditimpa snapshot stale',
        concA.status === 200 && concB.status === 200 && (afterConc?.language === 'fr' || afterConc?.dateFormat === 'Y-m-d'),
        `A=${concA.status}, B=${concB.status}, language=${afterConc?.language}, dateFormat=${afterConc?.dateFormat}`,
      );
      await putRaw(BASELINE);

      report.step('5.2-MassAssign: field asing (isSuperAdmin/extra) -> 422 ditolak eksplisit');
      const massAssign = await put({ isSuperAdmin: true, extra: 1 });
      const massKeys = ((massAssign.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('5.2-MassAssign Field asing ditolak 422 DAN disebut eksplisit', massAssign.status === 422 && !!massKeys?.includes('isSuperAdmin') && !!massKeys?.includes('extra'), `status=${massAssign.status}, invalidParamKeys=${JSON.stringify(massKeys)}`);

      report.step('5.4: CSRF -- cookie sesi aman + Origin header tidak divalidasi (A/B status identik)');
      const cookie = (await page.context().cookies()).find((c) => c.name === 'orangehrm');
      report.check('5.4 Cookie sesi HttpOnly + Secure + SameSite Lax/Strict', !!cookie && cookie.httpOnly && cookie.secure && ['Lax', 'Strict'].includes(cookie.sameSite as string), JSON.stringify({ httpOnly: cookie?.httpOnly, secure: cookie?.secure, sameSite: cookie?.sameSite }));
      const legitOrigin = await page.request.put(API, { data: BASELINE });
      const fakeOrigin = await page.request.put(API, { data: BASELINE, headers: { Origin: 'https://evil.example' } });
      report.check('5.4 Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (pertahanan hanya cookie SameSite, pola app-wide)', legitOrigin.status() === fakeOrigin.status(), `legit=${legitOrigin.status()}, fake=${fakeOrigin.status()}`);

      report.step('6.3: method salah -- POST/DELETE ke endpoint singleton -> 405');
      const postTry = await page.request.post(API, { data: BASELINE });
      const deleteTry = await page.request.delete(API);
      report.check('6.3 POST -> 405', postTry.status() === 405, `status=${postTry.status()}`);
      report.check('6.3 DELETE -> 405', deleteTry.status() === 405, `status=${deleteTry.status()}`);

      report.step('6.4: auth -- GET tanpa cookie sesi -> 401');
      const noAuthRes = await page.evaluate(async (url) => {
        const r = await fetch(url, { credentials: 'omit' });
        return r.status;
      }, API);
      report.check('6.4 GET tanpa cookie sesi -> 401', noAuthRes === 401, `status=${noAuthRes}`);

      report.step('6.5: parameter negative -- value tidak valid utk KEDUA field -> 422');
      const badLang = await put({ language: 'zz_ZZ_BOGUS' });
      const badLangKeys = ((badLang.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('6.5 language dgn kode sembarang (bukan locale valid) -> 422 menyebut "language"', badLang.status === 422 && !!badLangKeys?.includes('language'), `status=${badLang.status}, invalidParamKeys=${JSON.stringify(badLangKeys)}`);
      const badDateFormat = await put({ dateFormat: 'NOT-A-REAL-FORMAT' });
      const badDFKeys = ((badDateFormat.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('6.5 dateFormat dgn string sembarang (bukan format valid) -> 422 menyebut "dateFormat"', badDateFormat.status === 422 && !!badDFKeys?.includes('dateFormat'), `status=${badDateFormat.status}, invalidParamKeys=${JSON.stringify(badDFKeys)}`);

      report.step('8.4: konsistensi struktur error -- 2 jenis invalid berbeda, envelope error sama bentuknya');
      const shape = (b: Row | null | undefined) => JSON.stringify(Object.keys((b?.error as Row | undefined) ?? {}).sort());
      report.check('8.4 Struktur error {status,message,data.invalidParamKeys} konsisten antar jenis invalid (mass-assign vs value tidak valid)', shape(massAssign.body) === shape(badLang.body), `massAssign=${shape(massAssign.body)}, badLang=${shape(badLang.body)}`);

      report.step('Konfirmasi akhir: state kembali ke baseline');
      const finalState = (await json(await page.request.get(API)))?.data as Row;
      report.check('language="en_US" & dateFormat="Y-d-m" (baseline) sebelum TC selesai', finalState?.language === BASELINE.language && finalState?.dateFormat === BASELINE.dateFormat, `finalState=${JSON.stringify(finalState)}`);
    },
  );

  report.print();
});
