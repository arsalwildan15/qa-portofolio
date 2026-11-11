/**
 * ================================================================================
 * TC-RECRUITMENT-SECURITY-05: Verify Cross-Origin Mutation Request Is Blocked (CSRF)
 * Modul    : Recruitment - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-SECURITY-05-Verify-Cross-Origin-Mutation-Blocked.spec.ts
 * Path     : tests/recruitment/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi endpoint mutasi POST /api/v2/recruitment/vacancies TIDAK
 *   bisa dipicu dari origin lain memakai cookie sesi admin yang sedang
 *   login (CSRF pada endpoint data-mutating, bukan cuma pada login seperti
 *   TC-LOGIN-41). Kalau berhasil, attacker bisa membuat halaman jebakan
 *   yang diam-diam membuat vacancy/data sampah atas nama admin korban
 *   yang sedang login, tanpa korban sadar.
 *
 * PERBEDAAN DENGAN TC-LOGIN-41:
 *   Endpoint ini API-style (menerima JSON body via fetch/XHR dari SPA),
 *   BUKAN <form method="POST"> tradisional seperti /auth/validate. Request
 *   JSON cross-origin dengan `credentials: 'include'` WAJIB melewati CORS
 *   preflight (OPTIONS) — browser modern akan BLOK response-nya di sisi
 *   client kalau server tidak mengirim Access-Control-Allow-Origin yang
 *   mengizinkan origin asing ini secara eksplisit. Ini mekanisme proteksi
 *   yang BERBEDA dari SameSite cookie (yang melindungi endpoint form-based
 *   di Login).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/security/TC-RECRUITMENT-SECURITY-05-Verify-Cross-Origin-Mutation-Blocked.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-RECRUITMENT-SECURITY-05: cross-origin fetch with credentials cannot create a vacancy', async ({
  page,
  context,
}) => {
  const report = new TestReport('TC-RECRUITMENT-SECURITY-05', 'Cross-Origin Mutation Blocked', env.baseURL, page);

  report.step('Pastikan sesi admin aktif (sudah login via authenticatedTest fixture)');
  const cookiesBefore = await context.cookies();
  report.check('Cookie sesi admin ada sebelum percobaan cross-origin', cookiesBefore.some((c) => c.name === 'orangehrm'));

  report.step('Buka tab baru di origin eksternal (https://example.com), simulasi attacker page');
  const attackerPage = await context.newPage();
  await attackerPage.goto('https://example.com');

  report.step('Dari origin eksternal, fetch() POST JSON ke /api/v2/recruitment/vacancies dengan credentials:include');
  const result = await attackerPage.evaluate(async (apiUrl) => {
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'CSRF-Probe-Vacancy-Should-Not-Exist',
          jobTitleId: 1,
          employeeId: 1,
          numOfPositions: 1,
          isPublish: false,
        }),
      });
      return { blocked: false, status: resp.status };
    } catch (err) {
      // A CORS failure surfaces as a generic network-level TypeError in
      // fetch(), never an HTTP response the page can read.
      return { blocked: true, error: String(err) };
    }
  }, `${env.baseURL}/web/index.php/api/v2/recruitment/vacancies`);

  report.check(
    'Fetch cross-origin dengan kredensial GAGAL di level browser (CORS memblokir, bukan request yang diproses server)',
    result.blocked === true,
    JSON.stringify(result),
  );

  await attackerPage.close();
  report.print();
});
