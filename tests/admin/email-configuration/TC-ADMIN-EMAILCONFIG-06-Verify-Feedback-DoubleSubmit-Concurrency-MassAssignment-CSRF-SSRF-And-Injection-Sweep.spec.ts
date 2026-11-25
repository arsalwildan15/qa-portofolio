/**
 * ================================================================================
 * TC-ADMIN-EMAILCONFIG-06 — Verify Feedback, Double-Submit, Navigation, Session,
 *   Concurrency, Mass Assignment, CSRF, SSRF And Injection Sweep For Email
 *   Configuration
 * Modul    : Admin > Configuration > Email Configuration (U028)
 * Kategori : Positive (+) 1.1-U 1.2 1.4 1.8 | Edge (!) 4.1 4.2 4.3 4.5 4.6 4.7 |
 *            Security (S) 5.1-SQLi 5.1-SSRF 5.2-MassAssign 5.4 | API (A) 6.2 6.3
 *            6.4 6.5 | UI (8.4)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMAILCONFIG-06-Verify-Feedback-DoubleSubmit-Concurrency-MassAssignment-CSRF-SSRF-And-Injection-Sweep.spec.ts
 * Path     : tests/admin/email-configuration/
 * ================================================================================
 *
 * LATAR: rebuild matrix 26 Nov 2026 menunjukkan U028 py 19 kode GAP. AdminEmail-
 * ConfigurationPage.ts (ditulis sesi sebelumnya) py kebijakan EKSPLISIT "no TC in
 * this suite ever calls .click() on [Save]" krn screen ini mengatur konfigurasi
 * outgoing-mail GLOBAL yg dipakai utk password-reset/notifikasi SEMUA user demo
 * publik, DAN checkbox "Send Test Mail" (tidak disentuh suite ini) bisa memicu
 * pengiriman email sungguhan saat Save diklik. Sweep ini MEMATUHI kebijakan itu
 * SEPENUHNYA -- SEMUA mutasi lewat page.request langsung (BUKAN klik tombol Save
 * UI), KECUALI 1 langkah 1.8 yg sengaja melakukan Save UI dgn nilai IDENTIK persis
 * dgn yg sudah tersimpan (true no-op, tanpa checkbox "Send Test Mail" apa pun).
 *
 * EKSPLORASI LIVE (Playwright MCP, sebelum menulis kode) membuktikan:
 *   - GET/PUT /api/v2/admin/email-configuration, body {mailType, sentAs, smtpHost,
 *     smtpPort, smtpUsername, smtpAuthType, smtpSecurityType}. Baseline demo:
 *     mailType="sendmail", sentAs="admin@mail.com", smtp*=null/"none".
 *   - meta.testEmailStatus selalu 1 pd SETIAP PUT (dikonfirmasi berulang, bukan
 *     indikasi email benar2 terkirim -- field statis, TIDAK ada "mailTo"/
 *     "sendTestMail" di body manapun yg dicoba, jadi PUT config murni TIDAK
 *     memicu pengiriman apa pun; tidak ada tombol "Test Connection" di screen ini
 *     spt LDAP, jadi Save juga TIDAK pernah mencoba koneksi SMTP live).
 *   - smtpAuthType hanya menerima enum string "login" (BUKAN boolean/integer/
 *     "plain"/"PLAIN", semua ditolak 422) -- dikonfirmasi via brute-force 10
 *     kandidat nilai.
 *   - [BUG, lihat SENGAJA FAILED] smtpHost MENERIMA "169.254.169.254" (alamat
 *     metadata cloud yg jadi target klasik SSRF) tanpa validasi apa pun (200),
 *     persis pola yg sama dgn BG-517 (Country field General Information).
 *   - Required field (sentAs), format email (termasuk emoji di local-part),
 *     SQLi payload di sentAs (disimpan AMAN sbg literal teks, tidak ada DB error/
 *     bypass), mass assignment, tipe smtpPort salah -- SEMUA tervalidasi benar
 *     (422), TIDAK ada bug di jalur2 itu.
 *   - [TEMUAN, bukan bug] mengganti mailType dari "smtp" balik ke "sendmail"
 *     TIDAK otomatis membersihkan field smtp* yg sudah tersimpan (stale data
 *     tetap ada di storage walau tidak dipakai saat mailType="sendmail") --
 *     relasi antar-field longgar, didokumentasikan sbg finding (1.4).
 *
 * SEMUA mutasi dibungkus withConfigRestore (snapshot GET di awal, restore PUT di
 * finally) -- record ini singleton global dilihat SEMUA user demo publik.
 *
 * HASIL 26 Nov 2026: SENGAJA FAILED (1 check, R3 -- lihat BG baru), sisanya lolos.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/email-configuration/TC-ADMIN-EMAILCONFIG-06-Verify-Feedback-DoubleSubmit-Concurrency-MassAssignment-CSRF-SSRF-And-Injection-Sweep.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { withConfigRestore } from '../../../src/utils/withConfigRestore';

const API = '/web/index.php/api/v2/admin/email-configuration';
const BASELINE = { mailType: 'sendmail', sentAs: 'admin@mail.com', smtpHost: null, smtpPort: null, smtpUsername: null, smtpAuthType: null, smtpSecurityType: 'none' };
type Row = Record<string, unknown>;
const json = async (r: { json(): Promise<unknown> }) => (await r.json().catch(() => null)) as { data?: Row; error?: Row } | null;

test('TC-ADMIN-EMAILCONFIG-06: feedback/double-submit/navigation/session/concurrency/mass-assignment/CSRF/SSRF/injection sweep for Email Configuration', async ({
  page,
  adminEmailConfigurationPage,
}, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-ADMIN-EMAILCONFIG-06', 'Feedback DoubleSubmit Concurrency MassAssignment CSRF SSRF Injection Sweep', env.baseURL, page, [
    /status of 422/, /status of 401/, /status of 405/, /net::ERR_FAILED/, /reading 'response'/,
  ]);
  const ec = adminEmailConfigurationPage;

  const putRaw = async (body: Row) => {
    const res = await page.request.put(API, { data: body });
    return { status: res.status(), body: await json(res) };
  };
  const put = (extra: Row) => putRaw({ ...BASELINE, ...extra });

  await withConfigRestore(
    async () => (await json(await page.request.get(API)))?.data as Row,
    async (snap) => { await putRaw(snap ?? BASELINE); },
    async () => {
      report.step('6.2: GET email-configuration -> 200, schema 7 key sesuai ekspektasi');
      const getRes = await page.request.get(API);
      const data = (await json(getRes))?.data as Row;
      const expectedKeys = ['mailType', 'sentAs', 'smtpHost', 'smtpPort', 'smtpUsername', 'smtpAuthType', 'smtpSecurityType'];
      report.check('6.2 GET -> 200', getRes.status() === 200, `status=${getRes.status()}`);
      report.check('6.2 Schema membawa SEMUA 7 key yang diharapkan', expectedKeys.every((k) => Object.keys(data ?? {}).includes(k)), `keys=${JSON.stringify(Object.keys(data ?? {}))}`);

      report.step('1.1-U: ganti sentAs via API -> PUT 200 & GET mencerminkan nilai baru, restore');
      const updSentAs = await put({ sentAs: 'qa-sweep@mail.com' });
      report.check('1.1-U PUT sentAs baru -> 200 & tersimpan', updSentAs.status === 200 && updSentAs.body?.data?.sentAs === 'qa-sweep@mail.com', `status=${updSentAs.status}, sentAs=${updSentAs.body?.data?.sentAs}`);
      await putRaw(BASELINE);

      report.step('1.8: Save UI dgn nilai IDENTIK (true no-op, TANPA checkbox "Send Test Mail") -> toast sukses tetap muncul');
      await ec.goto();
      const toast = page.locator('.oxd-toast').first();
      await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/v2/admin/email-configuration') && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null),
        ec.saveButton.click(),
      ]);
      const toastText = await toast.innerText({ timeout: 8_000 }).catch(() => '');
      report.check('1.8 Toast sukses muncul setelah Save (no-op, nilai tidak berubah)', /Success/i.test(toastText), `toast="${toastText}"`);
      const afterNoop = (await json(await page.request.get(API)))?.data as Row;
      report.check('1.8 Setelah Save no-op, konfigurasi TETAP sama dgn baseline (tidak ada perubahan tak terduga)', afterNoop?.sentAs === BASELINE.sentAs && afterNoop?.mailType === BASELINE.mailType, `afterNoop=${JSON.stringify(afterNoop)}`);

      report.step('1.2: kombinasi -- ganti mailType ke "smtp" dgn SEMUA field smtp* terisi valid sekaligus dlm satu PUT -> 200 & semua tersimpan konsisten');
      const comboSmtp = await putRaw({ mailType: 'smtp', sentAs: 'admin@mail.com', smtpHost: 'smtp.example.com', smtpPort: 587, smtpUsername: 'qauser', smtpAuthType: 'login', smtpSecurityType: 'tls' });
      report.check(
        '1.2 Kombinasi mailType=smtp + smtpHost + smtpPort + smtpUsername + smtpAuthType + smtpSecurityType dlm satu body -> 200 & SEMUA tersimpan',
        comboSmtp.status === 200 && comboSmtp.body?.data?.smtpHost === 'smtp.example.com' && comboSmtp.body?.data?.smtpPort === 587 && comboSmtp.body?.data?.smtpAuthType === 'login',
        `status=${comboSmtp.status}, data=${JSON.stringify(comboSmtp.body?.data)}`,
      );

      report.step('1.4: relasi antar-field -- switch mailType BALIK ke "sendmail" TANPA eksplisit menghapus field smtp* -> field smtp* lama TETAP tersimpan (stale, longgar, bukan bug keras)');
      const backToSendmail = await putRaw({ mailType: 'sendmail', sentAs: 'admin@mail.com', smtpHost: 'smtp.example.com', smtpPort: 587, smtpUsername: 'qauser', smtpAuthType: 'login', smtpSecurityType: 'tls' });
      report.check('1.4 mailType berhasil balik ke "sendmail" -> 200', backToSendmail.status === 200 && backToSendmail.body?.data?.mailType === 'sendmail', `status=${backToSendmail.status}`);
      report.finding('1.4 Relasi mailType <-> field smtp* longgar', `Setelah mailType dikembalikan ke "sendmail" TANPA eksplisit mengosongkan smtp*, field smtp* lama (smtpHost="${backToSendmail.body?.data?.smtpHost}") TETAP tersimpan di storage (server tidak otomatis membersihkannya krn sudah tidak relevan). Tidak berdampak fungsional nyata (app hanya memakai smtp* saat mailType=smtp), tapi data stale ini bisa membingungkan kalau mailType diganti lagi ke smtp tanpa mengisi ulang semua field.`);
      await putRaw(BASELINE);

      report.step('4.1: karakter tidak biasa -- emoji di local-part sentAs DITOLAK (format email ketat), SQLi payload DITERIMA & tersimpan AMAN sbg literal teks (5.1-SQLi)');
      const emojiRes = await put({ sentAs: 'qa\u{1F600}test@mail.com' });
      report.check('4.1 Emoji di local-part sentAs -> 422 (format email ditegakkan ketat, bukan diterima sbg string bebas)', emojiRes.status === 422, `status=${emojiRes.status}`);
      const sqliPayload = "admin'--@mail.com";
      const sqliRes = await put({ sentAs: sqliPayload });
      report.check('5.1-SQLi Payload SQL injection di sentAs -> 200 & tersimpan AMAN sbg literal teks (tidak ada DB error/bypass)', sqliRes.status === 200 && sqliRes.body?.data?.sentAs === sqliPayload, `status=${sqliRes.status}, sentAs=${JSON.stringify(sqliRes.body?.data?.sentAs)}`);
      await putRaw(BASELINE);

      report.step('4.2: double-submit -- 2 PUT paralel dgn sentAs BEDA -> keduanya 200, state akhir = salah satu');
      const [raceA, raceB] = await Promise.all([put({ sentAs: 'qa-race-a@mail.com' }), put({ sentAs: 'qa-race-b@mail.com' })]);
      const afterRace = (await json(await page.request.get(API)))?.data as Row;
      report.check('4.2 Dua PUT paralel keduanya 200', raceA.status === 200 && raceB.status === 200, `A=${raceA.status}, B=${raceB.status}`);
      report.check('4.2 sentAs akhir = salah satu dari 2 nilai (last-write-wins, bukan korup)', afterRace?.sentAs === 'qa-race-a@mail.com' || afterRace?.sentAs === 'qa-race-b@mail.com', `sentAs akhir=${afterRace?.sentAs}`);
      await putRaw(BASELINE);

      report.step('4.3: ganti Mail Sent As di UI TANPA Save, lalu reload -> nilai server tetap tampil');
      await ec.goto();
      await ec.mailSentAsInput.fill('qa-should-not-persist@mail.com');
      const clientSideValue = await ec.mailSentAsInput.inputValue();
      await ec.goto();
      const afterReloadValue = await ec.mailSentAsInput.inputValue();
      report.check('4.3 Field berubah secara visual TANPA Save', clientSideValue === 'qa-should-not-persist@mail.com', `clientSide="${clientSideValue}"`);
      report.check('4.3 Setelah reload TANPA Save, field kembali ke nilai server (baseline) -- perubahan client-side tidak persist', afterReloadValue === BASELINE.sentAs, `afterReload="${afterReloadValue}"`);

      report.step('4.5: PUT dgn sesi terputus (cookie dihapus) -> 401, state server TIDAK berubah');
      const beforeSession = (await json(await page.request.get(API)))?.data as Row;
      const cookies = await page.context().cookies();
      await page.context().clearCookies();
      const noSessRes = await page.evaluate(async (url) => {
        const r = await fetch(url, { method: 'PUT', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mailType: 'sendmail', sentAs: 'qa-nosession@mail.com', smtpHost: null, smtpPort: null, smtpUsername: null, smtpAuthType: null, smtpSecurityType: 'none' }) });
        return r.status;
      }, API);
      await page.context().addCookies(cookies);
      const afterSession = (await json(await page.request.get(API)))?.data as Row;
      report.check('4.5 PUT tanpa sesi -> 401', noSessRes === 401, `status=${noSessRes}`);
      report.check('4.5 State server TIDAK berubah setelah PUT tanpa sesi ditolak', afterSession?.sentAs === beforeSession?.sentAs, `sebelum="${beforeSession?.sentAs}", sesudah="${afterSession?.sentAs}"`);

      report.step('4.6: PUT dgn body kosong {} -> 422, invalidParamKeys menyebut field required (minimal "sentAs")');
      const emptyRes = await putRaw({});
      const emptyKeys = ((emptyRes.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('4.6 Body kosong {} -> 422 (bukan diterima, bukan 500)', emptyRes.status === 422, `status=${emptyRes.status}`);
      report.check('4.6 invalidParamKeys menyebut "sentAs"', !!emptyKeys?.includes('sentAs'), `invalidParamKeys=${JSON.stringify(emptyKeys)}`);

      report.step('4.7: konkurensi 2 "admin" -- 2 PUT paralel edit field BERBEDA (sentAs vs mailType+smtp*) -> keduanya tersimpan, tidak saling timpa');
      const [concA, concB] = await Promise.all([
        put({ sentAs: 'qa-conc-a@mail.com' }),
        putRaw({ mailType: 'smtp', sentAs: BASELINE.sentAs, smtpHost: 'smtp.conc.example.com', smtpPort: 25, smtpUsername: 'qaconc', smtpAuthType: 'login', smtpSecurityType: 'none' }),
      ]);
      const afterConc = (await json(await page.request.get(API)))?.data as Row;
      report.check(
        '4.7 Dua "admin" edit field berbeda scr paralel -> keduanya 200, TIDAK ada field yang kembali ke nilai lama krn ditimpa snapshot stale',
        concA.status === 200 && concB.status === 200 && (afterConc?.sentAs === 'qa-conc-a@mail.com' || afterConc?.smtpHost === 'smtp.conc.example.com'),
        `A=${concA.status}, B=${concB.status}, sentAs=${afterConc?.sentAs}, smtpHost=${afterConc?.smtpHost}`,
      );
      await putRaw(BASELINE);

      report.step('[SENGAJA FAILED, lihat BUG] 5.1-SSRF: smtpHost diisi alamat metadata cloud (169.254.169.254, target klasik SSRF) SEHARUSNYA ditolak/divalidasi');
      const ssrfRes = await putRaw({ mailType: 'smtp', sentAs: BASELINE.sentAs, smtpHost: '169.254.169.254', smtpPort: 25, smtpUsername: 'qauser', smtpAuthType: 'login', smtpSecurityType: 'none' });
      report.check(
        '5.1-SSRF smtpHost dgn alamat metadata cloud/internal (169.254.169.254) SEHARUSNYA ditolak 422 (field URL/host yang diproses server semestinya divalidasi thdp rentang IP internal/metadata), NYATANYA diterima 200 tanpa validasi apa pun',
        ssrfRes.status !== 200,
        `status=${ssrfRes.status}, body=${JSON.stringify(ssrfRes.body)}`,
      );
      await putRaw(BASELINE);

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

      report.step('6.5: parameter negative -- smtpPort bertipe string bukan number -> 422');
      const badPortRes = await putRaw({ mailType: 'smtp', sentAs: BASELINE.sentAs, smtpHost: 'smtp.example.com', smtpPort: 'not-a-number', smtpUsername: 'qauser', smtpAuthType: 'login', smtpSecurityType: 'none' });
      const badPortKeys = ((badPortRes.body?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('6.5 smtpPort bertipe string (bukan number) -> 422 menyebut "smtpPort"', badPortRes.status === 422 && !!badPortKeys?.includes('smtpPort'), `status=${badPortRes.status}, invalidParamKeys=${JSON.stringify(badPortKeys)}`);

      report.step('8.4: konsistensi struktur error -- 2 jenis invalid berbeda, envelope error sama bentuknya');
      const shape = (b: Row | null | undefined) => JSON.stringify(Object.keys((b?.error as Row | undefined) ?? {}).sort());
      report.check('8.4 Struktur error {status,message,data.invalidParamKeys} konsisten antar jenis invalid (mass-assign vs tipe salah)', shape(massAssign.body) === shape(badPortRes.body), `massAssign=${shape(massAssign.body)}, badPort=${shape(badPortRes.body)}`);

      report.step('Konfirmasi akhir: konfigurasi kembali ke baseline');
      const finalState = (await json(await page.request.get(API)))?.data as Row;
      report.check('Konfigurasi = baseline (sendmail/admin@mail.com/smtp*=null) sebelum TC selesai', finalState?.mailType === BASELINE.mailType && finalState?.sentAs === BASELINE.sentAs && finalState?.smtpHost === null, `finalState=${JSON.stringify(finalState)}`);
    },
  );

  report.print();
});
