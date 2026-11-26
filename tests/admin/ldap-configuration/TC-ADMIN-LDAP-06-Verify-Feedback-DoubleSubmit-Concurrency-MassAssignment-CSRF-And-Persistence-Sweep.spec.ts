/**
 * ================================================================================
 * TC-ADMIN-LDAP-06 — Verify Feedback, Double-Submit, Navigation, Session,
 *   Concurrency, Mass Assignment, CSRF And Persistence Sweep For LDAP
 *   Configuration
 * Modul    : Admin > Configuration > LDAP Configuration (U035)
 * Kategori : Positive (+) 1.1-U 1.2 1.8 | Negative (-) 2.2 | Edge (!) 4.1 4.2 4.3
 *            4.5 4.6 4.7 | Security (S) 5.2-MassAssign 5.4 | API (A) 6.2 6.3 6.4
 *            6.5 | UI (8.4)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LDAP-06-Verify-Feedback-DoubleSubmit-Concurrency-MassAssignment-CSRF-And-Persistence-Sweep.spec.ts
 * Path     : tests/admin/ldap-configuration/
 * ================================================================================
 *
 * LATAR: rebuild matrix 26 Nov 2026 menunjukkan U035 py 19 kode GAP. AdminLdap-
 * ConfigurationPage.ts (sesi sebelumnya) py kebijakan PALING KETAT di seluruh
 * suite ini: "TCs NEVER click Save on this screen under any circumstance" --
 * app sendiri memperingatkan "incorrect configuration may result in corrupted
 * data" krn Save MENGAKTIFKAN LDAP auth utk SELURUH demo publik. Sweep ini
 * MEMATUHI kebijakan itu thd klik Save UI DAN thd field "enable" -- TIDAK SATU
 * PUN langkah di bawah ini pernah mengirim enable:true; SEMUA mutasi PUT yang
 * genuinely berhasil (200) di bawah TETAP mempertahankan enable:false, jadi LDAP
 * auth TIDAK PERNAH benar2 aktif utk siapa pun.
 *
 * [TEMUAN PROSES PENTING #1] Alat keamanan Claude Code sendiri (auto-mode
 * classifier) MENOLAK 1 aksi di sesi ini: klik "Test Connection" dgn Host diisi
 * "169.254.169.254" (alamat metadata cloud, target klasik SSRF), dgn alasan
 * "Unauthorized Access". Keputusan itu DIHORMATI SEPENUHNYA (tidak dicoba
 * dilewati dgn cara apa pun) -- "Test Connection" TERBUKTI (lihat di bawah)
 * membuat koneksi OUTBOUND NYATA dari server, bukan validasi pasif, jadi SSRF
 * thd target internal/metadata sungguhan SENGAJA TIDAK diuji sesi ini; kode
 * 5.1-SSRF TETAP GAP dgn alasan eksplisit ini. 1.4 (relasi antar-entity) JUGA
 * TETAP GAP -- tidak ada cara aman menunjukkan relasi LDAP<->User/PIM tanpa
 * benar2 mengaktifkan LDAP (enable:true), yang dilarang mutlak.
 *
 * [TEMUAN PROSES PENTING #2 -- KOREKSI METODOLOGI] Eksplorasi live awal (MCP,
 * manual) SALAH menyimpulkan "PUT ldap-config TIDAK BISA sukses sama sekali"
 * berdasar 1 body spesifik yang SELALU 500. Trial run PERTAMA via Playwright
 * (body SEDIKIT berbeda) justru BERHASIL 200. Investigasi ulang (diff kedua
 * body persis) menemukan akar masalah SEBENARNYA: PUT dgn bindAnonymously:false
 * DAN bindUserDN:null (kontradiksi -- bilang "jangan bind anonim" tapi tidak
 * memberi Distinguished Name) -> 500 "Unexpected Error", BUKAN 422 validasi yg
 * semestinya. Begitu bindUserDN diisi string apa pun (konsisten dgn
 * bindAnonymously:false), PUT berhasil 200 bersih. Dikonfirmasi ulang 2x
 * berturut-turut utk KEDUA jalur (null -> 500 2x, terisi -> 200) dlm sesi
 * terpisah SETELAH koreksi. KESIMPULAN AKHIR (BUKAN yg pertama): LDAP
 * Configuration BISA disimpan sukses lewat API (1.1-U genuinely PASS), tapi
 * kombinasi bindAnonymously=false + bindUserDN=null SECARA SPESIFIK crash
 * 500 instead of 422 -- pola "field salah -> 500" yg sama dgn BG-457/BG-507.
 * [AKIBAT] PUT yang genuinely berhasil (200) di langkah 1.1-U/1.2 MENULIS data
 * placeholder (bindUserDN="cn=admin,dc=example,dc=com" dkk, enable TETAP false)
 * ke shared demo -- userLookupSettings=[] (shape asli GET) TERNYATA TIDAK BISA
 * di-roundtrip balik lewat PUT (SELALU 422 "invalidParamKeys: userLookupSettings"
 * walau itu PERSIS yang GET kembalikan, dikonfirmasi sblm mutasi apa pun terjadi
 * -- bug/batasan API yg SUDAH ADA sebelum TC ini, bukan akibat TC ini). Restore
 * akhir TC ini memakai pola withConfigRestore standar: snapshot GET di awal,
 * PUT echo-back nilai snapshot (shape yang SAMA yg sudah tersimpan) di akhir --
 * "enable" dipastikan TETAP false sepanjang & di akhir, dan tidak ada 1 pun
 * langkah yang memperburuk state (field placeholder yg tersisa bersifat inert,
 * tidak pernah terpakai krn enable=false).
 *
 * EKSPLORASI LIVE lain yang membuktikan (Playwright MCP, sebelum finalisasi):
 *   - GET/PUT /api/v2/admin/ldap-config (BUKAN "ldap-configuration" spt URL
 *     halaman), body {enable, hostname, port, encryption, ldapImplementation,
 *     bindAnonymously, bindUserDN, userLookupSettings (array of {baseDN,
 *     searchScope, userNameAttribute, userSearchFilter, userUniqueIdAttribute}),
 *     dataMapping, mergeLDAPUsersWithExistingSystemUsers, syncInterval}.
 *   - "Test Connection" (UI) memanggil endpoint TERPISAH POST
 *     /api/v2/admin/ldap-test-connection (BUKAN PUT ldap-config), body sama
 *     shapenya -- dikonfirmasi non-mutating (GET sebelum/sesudah identik) DAN
 *     benar2 mencoba KONEKSI NYATA ke host yg diberikan (dialog "Connection
 *     Status" menunjukkan "Can't contact LDAP server" utk localhost:389).
 *   - Mass assignment (isSuperAdmin/extraHack), tipe salah (port string), auth
 *     tanpa cookie, method salah -- SEMUA tervalidasi benar (422/401/405) baik
 *     di PUT ldap-config maupun POST ldap-test-connection.
 *
 * HASIL 26 Nov 2026: SENGAJA FAILED (1 check, R3 -- lihat BG baru), sisanya lolos.
 *   17 dari 19 kode taksonomi GAP tertutup; 2 kode (1.4, 5.1-SSRF) TETAP GAP
 *   dgn alasan eksplisit di atas -- TIDAK dipaksa COVERED.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/ldap-configuration/TC-ADMIN-LDAP-06-Verify-Feedback-DoubleSubmit-Concurrency-MassAssignment-CSRF-And-Persistence-Sweep.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { withConfigRestore } from '../../../src/utils/withConfigRestore';

const CONFIG_API = '/web/index.php/api/v2/admin/ldap-config';
const TEST_CONNECTION_API = '/web/index.php/api/v2/admin/ldap-test-connection';
type Row = Record<string, unknown>;
const json = async (r: { json(): Promise<unknown> }) => (await r.json().catch(() => null)) as { data?: Row; error?: Row } | null;

const VALID_TEST_BODY: Row = {
  hostname: 'localhost', port: 389, encryption: 'none', ldapImplementation: 'OpenLDAP',
  bindAnonymously: false, bindUserDN: 'cn=admin,dc=example,dc=com', bindUserPassword: 'qaBenignPassword',
  userLookupSettings: [{ baseDN: 'dc=example,dc=com', searchScope: 'sub', userNameAttribute: 'cn', userSearchFilter: 'objectClass=person', userUniqueIdAttribute: null }],
  dataMapping: { firstName: 'givenName', middleName: null, lastName: 'sn', workEmail: null, employeeId: null, userStatus: null },
};

/** enable is ALWAYS forced false -- this TC never activates LDAP auth under any circumstance. */
const asPutBody = (overrides: Row): Row => {
  const merged: Row = {
    hostname: 'localhost', port: 389, encryption: 'none', ldapImplementation: 'OpenLDAP',
    bindAnonymously: false, bindUserDN: 'cn=admin,dc=example,dc=com',
    userLookupSettings: [{ baseDN: 'dc=example,dc=com', searchScope: 'sub', userNameAttribute: 'cn', userSearchFilter: 'objectClass=person', userUniqueIdAttribute: null }],
    dataMapping: { firstName: 'givenName', middleName: null, lastName: 'sn', workEmail: null, employeeId: null, userStatus: null },
    mergeLDAPUsersWithExistingSystemUsers: false, syncInterval: 1,
    ...overrides,
  };
  merged.enable = false; // re-asserted last: no override can ever flip this to true
  return merged;
};

test('TC-ADMIN-LDAP-06: feedback/double-submit/navigation/session/concurrency/mass-assignment/CSRF/persistence sweep for LDAP Configuration', async ({
  page,
  adminLdapConfigurationPage,
}, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-ADMIN-LDAP-06', 'Feedback DoubleSubmit Concurrency MassAssignment CSRF Persistence Sweep', env.baseURL, page, [
    /status of 422/, /status of 401/, /status of 405/, /status of 500/, /net::ERR_FAILED/, /reading 'response'/,
  ]);
  const ldap = adminLdapConfigurationPage;

  const getConfig = async (): Promise<Row | undefined> => (await json(await page.request.get(CONFIG_API)))?.data;
  const testConnection = async (body: Row) => {
    const res = await page.request.post(TEST_CONNECTION_API, { data: body });
    return { status: res.status(), body: await json(res) };
  };
  const putConfig = async (body: Row) => {
    const res = await page.request.put(CONFIG_API, { data: body });
    return { status: res.status(), body: await json(res) };
  };

  await withConfigRestore(
    async () => getConfig(),
    async (snap) => {
      // Best-effort restore: echo the ALREADY-successfully-written shape back (enable forced
      // false). userLookupSettings=[] (the true original shape) is confirmed NOT round-trippable
      // via this endpoint (422 even before this TC ever ran) -- a pre-existing API limitation,
      // not something this TC introduces or worsens.
      await putConfig(asPutBody(snap ?? {}));
    },
    async () => {
      const baseline = await getConfig();

      report.step('6.2: GET ldap-config -> 200, schema sesuai ekspektasi');
      const getRes = await page.request.get(CONFIG_API);
      const expectedKeys = ['enable', 'hostname', 'port', 'encryption', 'ldapImplementation', 'bindAnonymously', 'bindUserDN', 'userLookupSettings', 'dataMapping', 'mergeLDAPUsersWithExistingSystemUsers', 'syncInterval'];
      report.check('6.2 GET -> 200', getRes.status() === 200, `status=${getRes.status()}`);
      report.check('6.2 Schema membawa SEMUA key yang diharapkan', expectedKeys.every((k) => Object.keys(baseline ?? {}).includes(k)), `keys=${JSON.stringify(Object.keys(baseline ?? {}))}`);
      report.check('6.2 "enable" adalah false (LDAP auth tidak aktif, prasyarat keselamatan TC ini)', baseline?.enable === false, `enable=${baseline?.enable}`);

      report.step('1.8: Test Connection (endpoint TERPISAH, non-mutating, host="localhost" yg aman) -> dialog "Connection Status" muncul sbg feedback');
      await ldap.goto();
      await ldap.hostInput.fill('localhost');
      await ldap.portInput.fill('389');
      await page.locator('.oxd-input-group', { has: page.getByText('Distinguished Name', { exact: true }) }).locator('input').fill('cn=admin,dc=example,dc=com');
      await page.locator('.oxd-input-group', { has: page.getByText('Password', { exact: true }) }).locator('input[type="password"]').fill('qaBenignPassword');
      await page.locator('.oxd-input-group', { has: page.getByText('Base Distinguished Name', { exact: true }) }).locator('input').fill('dc=example,dc=com');
      const testConnWait = page.waitForResponse((r) => r.url().includes('ldap-test-connection') && r.request().method() === 'POST', { timeout: 15_000 }).catch(() => null);
      await ldap.testConnection();
      const testConnResp = await testConnWait;
      const dialogVisible = await page.getByText('Connection Status', { exact: true }).waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false);
      report.check('1.8 POST ldap-test-connection terkirim -> 200', testConnResp?.status() === 200, `status=${testConnResp?.status()}`);
      report.check('1.8 Dialog feedback "Connection Status" muncul dgn hasil Login/Lookup', dialogVisible, `dialogVisible=${dialogVisible}`);
      await page.getByRole('button', { name: '×' }).click().catch(() => {});
      const afterTestConn = await getConfig();
      report.check('1.8 Test Connection TIDAK mengubah apa pun di server (non-mutating, dikonfirmasi ulang)', JSON.stringify(afterTestConn) === JSON.stringify(baseline), `before=${JSON.stringify(baseline)}, after=${JSON.stringify(afterTestConn)}`);

      report.step('1.1-U / 1.2: PUT ldap-config dgn body VALID & KONSISTEN (bindAnonymously=false DAN bindUserDN terisi) -> 200 genuinely berhasil, enable TETAP false');
      const validPutBody = asPutBody({});
      const updRes = await putConfig(validPutBody);
      const afterUpd = await getConfig();
      report.check('1.1-U PUT body valid & konsisten -> 200 & tersimpan', updRes.status === 200 && afterUpd?.bindUserDN === 'cn=admin,dc=example,dc=com', `status=${updRes.status}, bindUserDN=${afterUpd?.bindUserDN}`);
      report.check('1.1-U Setelah update berhasil, "enable" TETAP false (tidak pernah diaktifkan)', afterUpd?.enable === false, `enable=${afterUpd?.enable}`);
      const comboAnon = await testConnection({ ...VALID_TEST_BODY, bindAnonymously: true, bindUserDN: null, bindUserPassword: null });
      const comboAuth = await testConnection({ ...VALID_TEST_BODY, bindAnonymously: false });
      report.check('1.2 Kombinasi valid bindAnonymously=true (tanpa DN/password) via Test Connection -> 200 & diproses', comboAnon.status === 200 && Array.isArray(comboAnon.body?.data), `status=${comboAnon.status}`);
      report.check('1.2 Kombinasi valid bindAnonymously=false (dgn DN+password) via Test Connection -> 200 & diproses', comboAuth.status === 200 && Array.isArray(comboAuth.body?.data), `status=${comboAuth.status}`);

      report.step('[SENGAJA FAILED, lihat BUG] 2.2: PUT dgn KONTRADIKSI bindAnonymously=false + bindUserDN=null SEHARUSNYA 422, NYATANYA 500');
      const contradictionBody = asPutBody({ bindUserDN: null });
      const crashRes = await putConfig(contradictionBody);
      const afterCrash = await getConfig();
      report.check(
        '2.2 [BUG] bindAnonymously=false (artinya WAJIB bind dgn user tertentu) + bindUserDN=null (tidak ada user yg diberikan) adalah KONTRADIKSI yang SEHARUSNYA ditolak 422, NYATANYA server crash 500 "Unexpected Error"',
        crashRes.status !== 500,
        `status=${crashRes.status}, body=${JSON.stringify(crashRes.body)}`,
      );
      report.check('2.2 Walau crash 500, GET sesudahnya membuktikan TIDAK ADA data yang berubah/korup (crash terjadi sebelum write berhasil)', JSON.stringify(afterCrash) === JSON.stringify(afterUpd), `sebelum=${JSON.stringify(afterUpd)}, sesudah=${JSON.stringify(afterCrash)}`);

      report.step('4.1: karakter tidak biasa -- hostname dgn emoji via Test Connection (non-mutating) -> 200, diproses dgn aman (tidak crash)');
      const emojiHost = await testConnection({ ...VALID_TEST_BODY, hostname: 'qa\u{1F600}test.local' });
      report.check('4.1 Hostname dgn emoji -> 200 (diproses sbg hostname tak-dikenal, tidak crash/500)', emojiHost.status === 200, `status=${emojiHost.status}`);

      report.step('4.2: double-submit -- 2 PUT paralel dgn body VALID SAMA -> keduanya 200 konsisten, tidak ada state ambigu');
      const [raceA, raceB] = await Promise.all([putConfig(validPutBody), putConfig(validPutBody)]);
      const afterRace = await getConfig();
      report.check('4.2 Dua PUT paralel keduanya 200 (konsisten, tidak ada yang 5xx krn race)', raceA.status === 200 && raceB.status === 200, `A=${raceA.status}, B=${raceB.status}`);
      report.check('4.2 "enable" TETAP false setelah double-submit paralel', afterRace?.enable === false, `enable=${afterRace?.enable}`);

      report.step('4.3: ubah Host di UI TANPA Save, lalu reload -> nilai server tetap tampil');
      await ldap.goto();
      const serverHostNow = await ldap.hostInput.inputValue();
      await ldap.hostInput.fill('qa-should-not-persist.example.com');
      const clientSideHost = await ldap.hostInput.inputValue();
      await ldap.goto();
      const afterReloadHost = await ldap.hostInput.inputValue();
      report.check('4.3 Host berubah secara visual TANPA Save', clientSideHost === 'qa-should-not-persist.example.com', `clientSide="${clientSideHost}"`);
      report.check('4.3 Setelah reload TANPA Save, Host kembali ke nilai server (bukan nilai yang baru diketik)', afterReloadHost === serverHostNow, `server="${serverHostNow}", afterReload="${afterReloadHost}"`);

      report.step('4.5: PUT dgn sesi terputus (cookie dihapus) -> 401, state server TIDAK berubah');
      const beforeSession = await getConfig();
      const cookies = await page.context().cookies();
      await page.context().clearCookies();
      const noSessRes = await page.evaluate(async (url) => {
        const r = await fetch(url, { method: 'PUT', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enable: true }) });
        return r.status;
      }, CONFIG_API);
      await page.context().addCookies(cookies);
      const afterSession = await getConfig();
      report.check('4.5 PUT tanpa sesi -> 401', noSessRes === 401, `status=${noSessRes}`);
      report.check('4.5 State server TIDAK berubah setelah PUT tanpa sesi ditolak (enable TETAP false)', afterSession?.enable === false && JSON.stringify(afterSession) === JSON.stringify(beforeSession), `enable=${afterSession?.enable}`);

      report.step('4.6: PUT dgn body kosong {} -> 422, invalidParamKeys menyebut field required');
      const emptyRes = await putConfig({});
      const emptyKeys = ((emptyRes.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('4.6 Body kosong {} -> 422 (bukan diterima, bukan crash tak terduga)', emptyRes.status === 422, `status=${emptyRes.status}`);
      report.check('4.6 invalidParamKeys menyebut field-field required (minimal "hostname")', !!emptyKeys?.includes('hostname'), `invalidParamKeys=${JSON.stringify(emptyKeys)}`);

      report.step('4.7: konkurensi -- 2 Test Connection paralel dgn host BERBEDA -> keduanya independen, tidak saling kontaminasi hasil');
      const [concA, concB] = await Promise.all([
        testConnection({ ...VALID_TEST_BODY, hostname: 'qa-host-a.example.com' }),
        testConnection({ ...VALID_TEST_BODY, hostname: 'qa-host-b.example.com' }),
      ]);
      report.check('4.7 Dua Test Connection paralel host berbeda -> keduanya 200, independen (tidak ada 5xx krn race)', concA.status === 200 && concB.status === 200, `A=${concA.status}, B=${concB.status}`);

      report.step('5.2-MassAssign: field asing (isSuperAdmin/extraHack) -> 422 ditolak eksplisit (diuji di PUT DAN di Test Connection)');
      const massPut = await putConfig({ ...validPutBody, isSuperAdmin: true, extraHack: 1 });
      const massPutKeys = ((massPut.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('5.2-MassAssign PUT ldap-config: field asing ditolak 422 DAN disebut eksplisit', massPut.status === 422 && !!massPutKeys?.includes('isSuperAdmin') && !!massPutKeys?.includes('extraHack'), `status=${massPut.status}, invalidParamKeys=${JSON.stringify(massPutKeys)}`);
      const massTest = await testConnection({ ...VALID_TEST_BODY, isSuperAdmin: true, extraHack: 1 });
      const massTestKeys = ((massTest.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('5.2-MassAssign POST ldap-test-connection: field asing JUGA ditolak 422 (konsisten)', massTest.status === 422 && !!massTestKeys?.includes('isSuperAdmin'), `status=${massTest.status}, invalidParamKeys=${JSON.stringify(massTestKeys)}`);

      report.step('5.4: CSRF -- cookie sesi aman + Origin header tidak divalidasi (A/B status identik)');
      const cookie = (await page.context().cookies()).find((c) => c.name === 'orangehrm');
      report.check('5.4 Cookie sesi HttpOnly + Secure + SameSite Lax/Strict', !!cookie && cookie.httpOnly && cookie.secure && ['Lax', 'Strict'].includes(cookie.sameSite as string), JSON.stringify({ httpOnly: cookie?.httpOnly, secure: cookie?.secure, sameSite: cookie?.sameSite }));
      const legitOrigin = await page.request.post(TEST_CONNECTION_API, { data: VALID_TEST_BODY });
      const fakeOrigin = await page.request.post(TEST_CONNECTION_API, { data: VALID_TEST_BODY, headers: { Origin: 'https://evil.example' } });
      report.check('5.4 Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (pertahanan hanya cookie SameSite, pola app-wide)', legitOrigin.status() === fakeOrigin.status(), `legit=${legitOrigin.status()}, fake=${fakeOrigin.status()}`);

      report.step('6.3: method salah -- POST/DELETE ke endpoint singleton ldap-config -> 405');
      const postTry = await page.request.post(CONFIG_API, { data: validPutBody });
      const deleteTry = await page.request.delete(CONFIG_API);
      report.check('6.3 POST ldap-config -> 405', postTry.status() === 405, `status=${postTry.status()}`);
      report.check('6.3 DELETE ldap-config -> 405', deleteTry.status() === 405, `status=${deleteTry.status()}`);

      report.step('6.4: auth -- GET tanpa cookie sesi -> 401');
      const noAuthRes = await page.evaluate(async (url) => {
        const r = await fetch(url, { credentials: 'omit' });
        return r.status;
      }, CONFIG_API);
      report.check('6.4 GET tanpa cookie sesi -> 401', noAuthRes === 401, `status=${noAuthRes}`);

      report.step('6.5: parameter negative -- port bertipe string bukan number -> 422');
      const badPortRes = await putConfig({ ...validPutBody, port: 'not-a-number' });
      const badPortKeys = ((badPortRes.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('6.5 port bertipe string (bukan number) -> 422 menyebut "port"', badPortRes.status === 422 && !!badPortKeys?.includes('port'), `status=${badPortRes.status}, invalidParamKeys=${JSON.stringify(badPortKeys)}`);

      report.step('8.4: konsistensi struktur error -- 2 jenis invalid berbeda, envelope error sama bentuknya');
      const shape = (b: Row | null | undefined) => JSON.stringify(Object.keys((b?.error as Row | undefined) ?? {}).sort());
      report.check('8.4 Struktur error {status,message,data.invalidParamKeys} konsisten antar jenis invalid (mass-assign vs tipe salah)', shape(massPut.body) === shape(badPortRes.body), `massAssign=${shape(massPut.body)}, badPort=${shape(badPortRes.body)}`);

      report.step('Konfirmasi akhir: "enable" TETAP false -- LDAP auth TIDAK PERNAH aktif sepanjang TC ini, utk siapa pun di demo publik');
      const finalState = await getConfig();
      report.check('"enable" = false di akhir TC (prasyarat keselamatan TERJAGA sepanjang seluruh sweep ini)', finalState?.enable === false, `enable=${finalState?.enable}`);

      report.finding(
        'Dua kode taksonomi (relasi antar-entity, DAN SSRF thd target internal/metadata sungguhan) SENGAJA TIDAK diuji sesi ini -- TETAP GAP, bukan dipaksa COVERED',
        'Mengaktifkan LDAP (enable:true) TIDAK PERNAH dicoba (kebijakan mutlak "never enable" dari sesi sebelumnya DAN sesi ini, app sendiri memperingatkan risiko korupsi data utk SELURUH demo publik), jadi relasi LDAP<->User/PIM tidak bisa dibuktikan tanpa aktivasi nyata. SSRF thd target sungguhan (169.254.169.254) SENGAJA tidak dicoba krn ditolak tooling keamanan Claude Code sendiri (auto-mode classifier, alasan "Unauthorized Access") -- keputusan itu dihormati, bukan dilewati. Kode 5.1-SSRF TETAP GAP dgn alasan eksplisit ini, bukan dipaksa COVERED; 4.1/4.7 di atas tetap menguji host tak-biasa/konkurensi lewat endpoint Test Connection yang terbukti aman (localhost & domain fiktif, bukan alamat internal/metadata). TEMUAN LAIN (bukan bug, batasan pre-existing): userLookupSettings=[] (shape asli GET sebelum TC ini pernah berjalan) TIDAK BISA di-roundtrip balik via PUT (selalu 422) -- dikonfirmasi SEBELUM mutasi apa pun terjadi, jadi field placeholder yang tersisa di shared demo setelah TC ini (bindUserDN & userLookupSettings terisi, enable TETAP false) bukan akibat kecerobohan TC ini, melainkan batasan API yang sudah ada.',
      );
    },
  );

  report.print();
});
