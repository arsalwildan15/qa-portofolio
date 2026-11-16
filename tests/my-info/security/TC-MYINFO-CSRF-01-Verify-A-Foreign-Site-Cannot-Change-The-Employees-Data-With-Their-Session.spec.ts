/**
 * ================================================================================
 * TC-MYINFO-CSRF-01 — Verify A Page On Another Site Cannot Change The Logged-In Employee's My Info Data (CSRF)
 * Modul    : My Info (U006, U108-U111, U115-U117), sesi ESS
 * Kategori : Security (S) 5.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-CSRF-01-Verify-A-Foreign-Site-Cannot-Change-The-Employees-Data-With-Their-Session.spec.ts
 * Path     : tests/my-info/security/
 * ================================================================================
 *
 * LATAR (probe LIVE 17 Nov 2026): API My Info TIDAK memeriksa header Origin dan tidak memakai token
 * CSRF -- PUT contact-details dgn Origin: https://evil.example dari klien API diterima 200. Satu-satunya
 * pertahanan adalah cookie sesi "orangehrm" (HttpOnly, Secure, SameSite=Lax). TC ini membuktikan di
 * browser sungguhan bahwa pertahanan itu bekerja: karyawan yg sedang login membuka halaman penyerang
 * (https://attacker.test, disajikan route.fulfill di context yg sama) yg mencoba mengubah datanya.
 *
 * TUJUAN:
 *   5.4  Cookie sesi: HttpOnly, Secure, SameSite Lax/Strict.
 *   5.4  Kontrol: request yg sama dari origin aplikasi sendiri -> 200 (payload memang berlaku).
 *   5.4  Penyerang: fetch no-cors PUT contact-details (text/plain, tanpa preflight), fetch JSON dgn
 *        credentials (butuh preflight CORS), dan form POST lintas situs ke emergency-contacts ->
 *        cookie sesi TIDAK ikut terkirim & data karyawan TIDAK berubah.
 *   5.4  Sesi karyawan tetap aktif setelah halaman penyerang dibuka (cookie sesi tidak ditimpa).
 *   Finding: server tidak memvalidasi Origin (pertahanan tunggal = SameSite).
 *
 * HASIL 17 Nov 2026: 6/7 lolos -- data karyawan AMAN (cookie tidak ikut, data tidak berubah).
 *   SENGAJA FAILED (R3): form POST lintas situs dijawab 401 + Set-Cookie sesi BARU; karena navigasi
 *   top-level, browser menyimpannya di atas cookie karyawan -> karyawan ter-logout (dibuktikan probe:
 *   cookie berganti, GET berikutnya 401, Dashboard dialihkan ke login) = BUG BG-437 (Medium).
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/security/TC-MYINFO-CSRF-01-Verify-A-Foreign-Site-Cannot-Change-The-Employees-Data-With-Their-Session.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession, openMyInfoFromMenu } from '../../../src/utils/myInfo';

const ATTACKER = 'https://attacker.test';

test('TC-MYINFO-CSRF-01: a page on another site cannot change the employee data with their session', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-CSRF-01', 'Foreign Site Cannot Change Employee Data', env.baseURL);
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaMyInfoCsrf');
  try {
    const emp = await openMyInfoFromMenu(essPage);
    const origin = new URL(env.baseURL).origin;
    const contactApi = `${origin}/web/index.php/api/v2/pim/employee/${emp}/contact-details`;
    const emergencyApi = `${origin}/web/index.php/api/v2/pim/employees/${emp}/emergency-contacts`;
    const s = `${Date.now() % 100000}`;

    report.step('Cookie sesi');
    // The session cookie is scoped to path=/web, so it must be looked up with a URL under /web.
    const appUrl = `${origin}/web/index.php/`;
    const cookie = (await essPage.context().cookies(appUrl)).find((c) => c.name === 'orangehrm');
    const sessionBefore = cookie?.value;
    report.check('5.4 Cookie sesi HttpOnly + Secure + SameSite Lax/Strict', !!cookie && cookie.httpOnly && cookie.secure && ['Lax', 'Strict'].includes(cookie.sameSite), JSON.stringify({ httpOnly: cookie?.httpOnly, secure: cookie?.secure, sameSite: cookie?.sameSite }));

    report.step('Kontrol: origin aplikasi sendiri');
    const original = `QaCsrfOrig${s}`;
    const control = await essPage.evaluate(async ([url, street]) => {
      const r = await fetch(url, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ street1: street }) });
      return r.status;
    }, [contactApi, original] as const);
    report.check('5.4 Kontrol: PUT contact-details dari origin aplikasi -> 200 (payload berlaku bila sesi terkirim)', control === 200, `status=${control}`);
    const foreignHeader = await essPage.request.put(contactApi, { data: { street1: original }, headers: { Origin: 'https://evil.example' } });
    report.finding('5.4 Validasi Origin di server', `PUT dgn Origin: https://evil.example dari klien API -> ${foreignHeader.status()} (${foreignHeader.status() === 200 ? 'tidak divalidasi; pertahanan tunggal = SameSite cookie' : 'ditolak'})`);

    report.step('Halaman penyerang di situs lain');
    const sentWithCookie: string[] = [];
    const attackRequests: string[] = [];
    essPage.context().on('request', async (r) => {
      if (!r.url().startsWith(`${origin}/web/index.php/api/v2/pim/`)) return;
      const h = await r.allHeaders().catch(() => ({} as Record<string, string>));
      if ((h['referer'] ?? '').startsWith(ATTACKER) || (h['origin'] ?? '') === ATTACKER) {
        attackRequests.push(`${r.method()} ${r.url().replace(origin, '')}`);
        if (/orangehrm=/.test(h['cookie'] ?? '')) sentWithCookie.push(`${r.method()} ${r.url().replace(origin, '')}`);
      }
    });
    const pwned = `QaCsrfPwned${s}`;
    await essPage.context().route(`${ATTACKER}/**`, (route) => route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html><body>
        <form id="f" method="POST" action="${emergencyApi}" enctype="text/plain">
          <input name='{"name":"QaCsrfForm${s}","relationship":"x","mobilePhone":"123","ignore":"' value='"}'>
        </form>
        <script>
          window.results = [];
          fetch(${JSON.stringify(contactApi)}, { method: 'PUT', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ street1: ${JSON.stringify(pwned)} }) })
            .then(() => window.results.push('no-cors terkirim'), (e) => window.results.push('no-cors gagal ' + e));
          fetch(${JSON.stringify(contactApi)}, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ street1: ${JSON.stringify(pwned)} }) })
            .then((r) => window.results.push('cors ' + r.status), (e) => window.results.push('cors diblok ' + e.name));
        </script></body></html>`,
    }));
    const attacker = await essPage.context().newPage();
    await attacker.goto(`${ATTACKER}/win-a-prize`);
    await attacker.waitForFunction(() => (window as unknown as { results: string[] }).results?.length >= 2, null, { timeout: 15_000 }).catch(() => {});
    const fetchResults = await attacker.evaluate(() => (window as unknown as { results: string[] }).results).catch(() => [] as string[]);
    await Promise.all([attacker.waitForNavigation({ timeout: 20_000 }).catch(() => null), attacker.evaluate(() => (document.getElementById('f') as HTMLFormElement).submit())]);
    const formLanding = attacker.url();
    await attacker.close();

    report.step('Verifikasi data karyawan (dibaca sesi Admin) & sesi karyawan');
    // Read through the Admin session: the probe showed the employee's own session may no longer be valid.
    const contactNow = ((await (await page.request.get(contactApi)).json()) as { data?: { street1?: string } }).data?.street1;
    const emergencyNow = ((await (await page.request.get(emergencyApi)).json()) as { data?: Array<{ name: string }> }).data ?? [];
    const sessionAfter = (await essPage.context().cookies(appUrl)).find((c) => c.name === 'orangehrm')?.value;
    const stillLoggedIn = (await essPage.request.get(contactApi)).status() === 200;
    // Live 2026-11-17: the cookieless cross-site POST is answered 401 WITH Set-Cookie of a fresh session;
    // being a top-level navigation, the browser stores it over the employee's session -> logged out.
    report.check('5.4 Sesi karyawan tetap aktif setelah membuka halaman penyerang (cookie sesi tidak ditimpa)', stillLoggedIn && sessionAfter === sessionBefore, `masihLogin=${stillLoggedIn}, cookieBerubah=${sessionAfter !== sessionBefore}, landing=${formLanding.replace(origin, '')}`);
    report.check('5.4 Request penyerang terkirim tanpa cookie sesi (SameSite menahan cookie lintas situs)', attackRequests.length > 0 && sentWithCookie.length === 0, `request penyerang=${attackRequests.join(', ') || '(tidak terlihat)'}; dgn cookie=${sentWithCookie.join(', ') || 'tidak ada'}; fetch=${fetchResults.join(' | ')}`);
    report.check('5.4 Contact Details TIDAK berubah oleh fetch dari situs penyerang', contactNow === original, `street1=${contactNow}`);
    report.check('5.4 Emergency Contacts TIDAK bertambah oleh form POST dari situs penyerang', !emergencyNow.some((e) => e.name.startsWith('QaCsrfForm')), `jumlah=${emergencyNow.length}, landing=${formLanding.replace(origin, '')}`);
  } finally {
    await close();
  }
  report.print();
});
