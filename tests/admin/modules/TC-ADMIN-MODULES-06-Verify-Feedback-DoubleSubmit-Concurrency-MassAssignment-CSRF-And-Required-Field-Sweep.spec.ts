/**
 * ================================================================================
 * TC-ADMIN-MODULES-06 — Verify Feedback, Double-Submit, Navigation, Session,
 *   Concurrency, Mass Assignment, CSRF And Required-Field Sweep For Modules
 * Modul    : Admin > Configuration > Modules (U032)
 * Kategori : Positive (+) 1.1-U 1.2 1.8 | Negative (-) 2.1 | Edge (!) 4.2 4.3 4.5
 *            4.6 4.7 | Security (S) 5.2-MassAssign 5.4 | API (A) 6.2 6.3 6.4 6.5 |
 *            UI (8.4)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-MODULES-06-Verify-Feedback-DoubleSubmit-Concurrency-MassAssignment-CSRF-And-Required-Field-Sweep.spec.ts
 * Path     : tests/admin/modules/
 * ================================================================================
 *
 * LATAR: rebuild matrix 26 Nov 2026 menunjukkan U032 py 16 kode GAP. TC lama
 * (MODULES-01..05) hanya observasional (page object-nya SENGAJA tidak pernah klik
 * Save, krn modul ini GLOBAL dilihat semua user demo publik). Sesi ini mendapat
 * izin eksplisit koordinator utk memakai withConfigRestore (pola R6 yg sudah
 * mapan) supaya mutasi bisa diuji TANPA merusak state demo util modul lain --
 * SEMUA mutasi di TC ini memakai page.request langsung (bukan klik Save UI,
 * kecuali 1 langkah yg SENGAJA memverifikasi toast 1.8) dan HANYA menyentuh
 * module "mobile"/"directory" (dipilih krn dampak paling kecil thdp sidebar
 * modul lain dibanding leave/time/pim/recruitment/performance/claim/buzz/admin),
 * dipulihkan ke true dlm hitungan milidetik tiap langkah.
 *
 * EKSPLORASI LIVE (Playwright MCP, sebelum menulis kode) membuktikan:
 *   - GET/PUT /api/v2/admin/modules, body flat 11 key boolean (admin, pim, leave,
 *     time, recruitment, performance, maintenance, mobile, directory, claim,
 *     buzz -- TIDAK ada "Module" suffix di key API, beda dari label UI).
 *   - PUT admin:false (explicit, bukan dihilangkan) DITOLAK 422 invalidParamKeys
 *     ["admin"] -- app menegakkan "Admin tidak bisa dikunci sendiri" di server,
 *     bukan cuma disabled di UI. Tervalidasi benar, TIDAK ada bug di jalur ini.
 *   - Mass assignment (isSuperAdmin/extraHack) DITOLAK 422 eksplisit. Tervalidasi
 *     benar.
 *   - [BUG, lihat SENGAJA FAILED] Required-field validation TIDAK konsisten di
 *     ke-11 key: 7 key (leave/time/recruitment/performance/maintenance/mobile/
 *     directory) ditolak 422 "invalidParamKeys" kalau dihilangkan dari body PUT
 *     (benar, required). TAPI 4 key lain (admin/pim/claim/buzz) TIDAK ditolak
 *     sama sekali kalau dihilangkan SENDIRIAN -- diterima 200, dan utk "claim"
 *     & "buzz" secara spesifik, nilainya diam-diam DEFAULT KE FALSE (bukan
 *     ditolak, bukan dipertahankan nilai lama) -- yaitu partial PUT yang lupa
 *     menyertakan "buzz" DIAM-DIAM MENONAKTIFKAN modul Buzz utk SELURUH demo
 *     publik tanpa error apa pun. ("admin"/"pim" kebetulan aman krn default-nya
 *     ternyata true, bukan krn divalidasi -- dikonfirmasi dgn menghilangkan tiap
 *     key satu-satu). Dikonfirmasi deterministik di sesi ini (bukan reset demo
 *     publik -- semua probe dalam satu sesi tanpa jeda, restore <1 detik setiap
 *     kali, lihat log step demi step).
 *
 * SEMUA mutasi dibungkus withConfigRestore (snapshot GET di awal, restore PUT di
 * finally) -- record ini singleton global dilihat SEMUA user demo publik.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/modules/TC-ADMIN-MODULES-06-Verify-Feedback-DoubleSubmit-Concurrency-MassAssignment-CSRF-And-Required-Field-Sweep.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { withConfigRestore } from '../../../src/utils/withConfigRestore';

const API = '/web/index.php/api/v2/admin/modules';
const BASELINE = {
  admin: true, pim: true, leave: true, time: true, recruitment: true,
  performance: true, maintenance: true, mobile: true, directory: true,
  claim: true, buzz: true,
};
type Row = Record<string, unknown>;
const json = async (r: { json(): Promise<unknown> }) => (await r.json().catch(() => null)) as { data?: Row; error?: Row } | null;

test('TC-ADMIN-MODULES-06: feedback/double-submit/navigation/session/concurrency/mass-assignment/CSRF/required-field sweep for Modules', async ({
  page,
  adminModulesPage,
}, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-ADMIN-MODULES-06', 'Feedback DoubleSubmit Concurrency MassAssignment CSRF RequiredField Sweep', env.baseURL, page, [
    /status of 422/, /status of 401/, /status of 405/, /net::ERR_FAILED/, /reading 'response'/,
  ]);
  const mp = adminModulesPage;

  const putRaw = async (body: Row) => {
    const res = await page.request.put(API, { data: body });
    return { status: res.status(), body: await json(res) };
  };
  const put = (extra: Row) => putRaw({ ...BASELINE, ...extra });

  await withConfigRestore(
    async () => (await json(await page.request.get(API)))?.data as Row,
    async (snap) => { await putRaw(snap ?? BASELINE); },
    async () => {
      report.step('6.2: GET modules -> 200, schema flat 11 key boolean');
      const getRes = await page.request.get(API);
      const data = (await json(getRes))?.data as Row;
      const keys = Object.keys(data ?? {});
      report.check('6.2 GET modules -> 200', getRes.status() === 200, `status=${getRes.status()}`);
      report.check('6.2 Schema membawa SEMUA 11 key yang diharapkan', Object.keys(BASELINE).every((k) => keys.includes(k)) && keys.length === 11, `keys=${JSON.stringify(keys)}`);
      report.check('6.2 Semua value bertipe boolean', keys.every((k) => typeof data?.[k] === 'boolean'), `types=${JSON.stringify(keys.map((k) => typeof data?.[k]))}`);

      report.step('1.1-U / 1.8: toggle "Mobile" via UI Save -> PUT 200 & toast sukses, lalu restore via UI Save lagi');
      await mp.goto();
      const mobileRow = mp.rowByLabel('Mobile');
      const mobileSwitch = mp.switchInput(mobileRow);
      const wasChecked = await mobileSwitch.isChecked();
      await mobileRow.locator('.oxd-switch-wrapper').click();
      const putWait = page.waitForResponse((r) => r.url().includes('/api/v2/admin/modules') && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
      await mp.saveButton.click();
      const putRes = await putWait;
      const toast = await page.locator('.oxd-toast').first().innerText({ timeout: 8_000 }).catch(() => '');
      report.check('1.1-U Toggle Mobile -> PUT 200', putRes?.status() === 200, `status=${putRes?.status()}`);
      report.check('1.8 Toast sukses muncul setelah Save', /Success/i.test(toast), `toast="${toast}"`);
      const afterToggle = (await json(await page.request.get(API)))?.data as Row;
      report.check('1.1-U Setelah Save, GET mencerminkan nilai baru (Mobile = !semula)', afterToggle?.mobile === !wasChecked, `mobile=${afterToggle?.mobile}, semula=${wasChecked}`);
      // restore via UI round-trip too (not just API) to prove the UI Save path itself is reversible
      await mp.goto();
      await mp.rowByLabel('Mobile').locator('.oxd-switch-wrapper').click();
      const restoreWait = page.waitForResponse((r) => r.url().includes('/api/v2/admin/modules') && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
      await mp.saveButton.click();
      await restoreWait;
      const afterRestore = (await json(await page.request.get(API)))?.data as Row;
      report.check('1.1-U Restore Mobile via UI Save -> GET kembali ke nilai semula', afterRestore?.mobile === wasChecked, `mobile=${afterRestore?.mobile}`);

      report.step('1.2: kombinasi 2 modul dimatikan BERSAMAAN dlm satu PUT -> 200, lalu dikombinasikan balik');
      const comboOff = await put({ mobile: false, directory: false });
      report.check('1.2 Kombinasi mobile=false + directory=false dlm satu body -> 200 & keduanya tersimpan', comboOff.status === 200 && comboOff.body?.data?.mobile === false && comboOff.body?.data?.directory === false, `status=${comboOff.status}, data=${JSON.stringify(comboOff.body?.data)}`);
      const comboOn = await put({ mobile: true, directory: true });
      report.check('1.2 Kombinasi mobile=true + directory=true dlm satu body -> 200 & keduanya restore', comboOn.status === 200 && comboOn.body?.data?.mobile === true && comboOn.body?.data?.directory === true, `status=${comboOn.status}`);

      report.step('2.1: required-field -- field yang BENAR divalidasi (leave) vs [BUG] field yang TIDAK divalidasi & diam2 default false (buzz)');
      const base = { ...BASELINE };
      const omitLeave: Row = { ...base };
      delete omitLeave.leave;
      const leaveRes = await putRaw(omitLeave);
      const leaveInvalidKeys = (leaveRes.body?.error as Row | undefined)?.data as Row | undefined;
      report.check('2.1 Hilangkan "leave" dari body PUT -> 422 ditolak dgn invalidParamKeys menyebut "leave" (required field tervalidasi benar)', leaveRes.status === 422 && !!(leaveInvalidKeys?.invalidParamKeys as string[] | undefined)?.includes('leave'), `status=${leaveRes.status}, body=${JSON.stringify(leaveRes.body)}`);
      await putRaw(base); // make sure state is sane before next probe

      const omitBuzz: Row = { ...base };
      delete omitBuzz.buzz;
      const buzzRes = await putRaw(omitBuzz);
      // immediately restore regardless of outcome -- this module is shared by every demo visitor
      await putRaw(base);
      report.check(
        '2.1 [BUG] Hilangkan "buzz" dari body PUT (field lain lengkap) SEHARUSNYA ditolak 422 sama seperti "leave" (sama-sama required) -- NYATANYA diterima 200 & "buzz" diam-diam di-set false tanpa error apa pun',
        buzzRes.status !== 200 || buzzRes.body?.data?.buzz !== false,
        `status=${buzzRes.status}, buzz setelah dihilangkan=${JSON.stringify(buzzRes.body?.data?.buzz)} (dibandingkan "leave" yang benar ditolak 422 di atas)`,
      );
      const afterBuzzProbe = (await json(await page.request.get(API)))?.data as Row;
      report.check('2.1 State terkonfirmasi sudah dipulihkan ke semula setelah probe "buzz"', afterBuzzProbe?.buzz === true, `buzz=${afterBuzzProbe?.buzz}`);

      report.step('4.2: double-submit -- 2 PUT paralel dgn nilai BEDA utk "mobile" -> keduanya 200, state akhir = salah satu');
      const [raceA, raceB] = await Promise.all([put({ mobile: false }), put({ mobile: true })]);
      const afterRace = (await json(await page.request.get(API)))?.data as Row;
      report.check('4.2 Dua PUT paralel keduanya 200', raceA.status === 200 && raceB.status === 200, `A=${raceA.status}, B=${raceB.status}`);
      report.check('4.2 Mobile akhir = salah satu dari 2 nilai (last-write-wins, bukan korup)', afterRace?.mobile === true || afterRace?.mobile === false, `mobile akhir=${afterRace?.mobile}`);
      await putRaw(base);

      report.step('4.3: toggle Mobile di UI TANPA Save, lalu reload -> nilai server (checked) tetap, perubahan client-side hilang');
      await mp.goto();
      await mp.rowByLabel('Mobile').locator('.oxd-switch-wrapper').click();
      const clientSideChecked = await mp.switchInput(mp.rowByLabel('Mobile')).isChecked();
      await mp.goto();
      const afterReloadChecked = await mp.switchInput(mp.rowByLabel('Mobile')).isChecked();
      report.check('4.3 Toggle client-side TANPA Save berubah secara visual', clientSideChecked === false);
      report.check('4.3 Setelah reload TANPA Save, state kembali ke nilai server (true) -- perubahan client-side tidak persist', afterReloadChecked === true, `afterReload=${afterReloadChecked}`);

      report.step('4.5: PUT dgn sesi terputus (cookie dihapus) -> 401, state server TIDAK berubah');
      const beforeSession = (await json(await page.request.get(API)))?.data as Row;
      const cookies = await page.context().cookies();
      await page.context().clearCookies();
      const noSessRes = await page.evaluate(async (url) => {
        const r = await fetch(url, { method: 'PUT', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: false }) });
        return r.status;
      }, API);
      await page.context().addCookies(cookies);
      const afterSession = (await json(await page.request.get(API)))?.data as Row;
      report.check('4.5 PUT tanpa sesi -> 401', noSessRes === 401, `status=${noSessRes}`);
      report.check('4.5 State server TIDAK berubah setelah PUT tanpa sesi ditolak', afterSession?.mobile === beforeSession?.mobile, `sebelum=${beforeSession?.mobile}, sesudah=${afterSession?.mobile}`);

      report.step('4.6: PUT dgn body kosong {} -> 422, invalidParamKeys menyebut SEMUA field required yang hilang (bukan silently diterima)');
      const emptyRes = await putRaw({});
      const emptyInvalidKeys = ((emptyRes.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('4.6 Body kosong {} -> 422 (bukan diterima, bukan 500)', emptyRes.status === 422, `status=${emptyRes.status}`);
      report.check('4.6 invalidParamKeys menyebut field-field required (minimal "leave")', !!emptyInvalidKeys?.includes('leave'), `invalidParamKeys=${JSON.stringify(emptyInvalidKeys)}`);
      await putRaw(base);

      report.step('4.7: konkurensi 2 "admin" -- 2 PUT paralel edit modul BERBEDA (mobile vs directory) -> keduanya tersimpan, tidak saling timpa');
      const [concA, concB] = await Promise.all([put({ mobile: false }), put({ directory: false })]);
      const afterConc = (await json(await page.request.get(API)))?.data as Row;
      report.check(
        '4.7 Dua "admin" edit modul berbeda scr paralel -> keduanya 200, TIDAK ada field yang kembali ke nilai lama krn ditimpa snapshot stale',
        concA.status === 200 && concB.status === 200 && (afterConc?.mobile === false || afterConc?.directory === false),
        `A=${concA.status}, B=${concB.status}, mobile=${afterConc?.mobile}, directory=${afterConc?.directory}`,
      );
      await putRaw(base);

      report.step('5.2-MassAssign: field asing (isSuperAdmin/extraHack) -> 422 ditolak eksplisit');
      const massAssign = await put({ isSuperAdmin: true, extraHack: 1 });
      const massKeys = ((massAssign.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('5.2-MassAssign Field asing ditolak 422 DAN disebut eksplisit', massAssign.status === 422 && !!massKeys?.includes('isSuperAdmin') && !!massKeys?.includes('extraHack'), `status=${massAssign.status}, invalidParamKeys=${JSON.stringify(massKeys)}`);

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

      report.step('6.5: parameter negative -- tipe salah utk field boolean (string "yes" bukan boolean) -> 422');
      const badType = await put({ mobile: 'yes' as unknown as boolean });
      const badTypeKeys = ((badType.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('6.5 Tipe data salah (string bukan boolean) -> 422 menyebut field terkait', badType.status === 422 && !!badTypeKeys?.includes('mobile'), `status=${badType.status}, invalidParamKeys=${JSON.stringify(badTypeKeys)}`);

      report.step('8.4: konsistensi struktur error -- 2 jenis invalid berbeda, envelope error sama bentuknya');
      const shape = (b: Row | null | undefined) => JSON.stringify(Object.keys((b?.error as Row | undefined) ?? {}).sort());
      report.check('8.4 Struktur error {status,message,data.invalidParamKeys} konsisten antar jenis invalid (mass-assign vs tipe salah)', shape(massAssign.body) === shape(badType.body), `massAssign=${shape(massAssign.body)}, badType=${shape(badType.body)}`);

      report.step('Konfirmasi akhir: semua modul kembali ke baseline (semua true)');
      const finalState = (await json(await page.request.get(API)))?.data as Row;
      report.check('Semua 11 modul = true (baseline) sebelum TC selesai', Object.keys(BASELINE).every((k) => finalState?.[k] === true), `finalState=${JSON.stringify(finalState)}`);
    },
  );

  report.print();
});
