/**
 * ================================================================================
 * TC-ADMIN-SECURITY-02: Verify Cross-Origin Mutation Request (CSRF) Blocked
 * Modul    : Admin - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SECURITY-02-Verify-Cross-Origin-Mutation-Blocked.spec.ts
 * Path     : tests/admin/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi endpoint mutasi POST /api/v2/admin/pay-grades TIDAK
 *   bisa dipicu dari origin lain memakai cookie sesi admin yang sedang
 *   login (CSRF pada endpoint data-mutating Admin). Pola sama persis
 *   dengan TC-RECRUITMENT-SECURITY-05: endpoint ini API-style (JSON
 *   body dari SPA), sehingga mekanisme proteksinya diharapkan CORS
 *   preflight, bukan SameSite cookie (yang melindungi endpoint
 *   form-based di Login).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/security/TC-ADMIN-SECURITY-02-Verify-Cross-Origin-Mutation-Blocked.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-SECURITY-02: cross-origin fetch with credentials cannot create a pay grade', async ({
  page,
  context,
}) => {
  const report = new TestReport('TC-ADMIN-SECURITY-02', 'Cross-Origin Mutation Blocked', env.baseURL, page);

  report.step('Pastikan sesi admin aktif (sudah login via authenticatedTest fixture)');
  const cookiesBefore = await context.cookies();
  report.check('Cookie sesi admin ada sebelum percobaan cross-origin', cookiesBefore.some((c) => c.name === 'orangehrm'));

  report.step('Buka tab baru di origin eksternal (https://example.com), simulasi attacker page');
  const attackerPage = await context.newPage();
  await attackerPage.goto('https://example.com');

  report.step('Dari origin eksternal, fetch() POST JSON ke /api/v2/admin/pay-grades dengan credentials:include');
  const result = await attackerPage.evaluate(async (apiUrl) => {
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'CSRF-Probe-PayGrade-Should-Not-Exist' }),
      });
      return { blocked: false, status: resp.status };
    } catch (err) {
      return { blocked: true, error: String(err) };
    }
  }, `${env.baseURL}/web/index.php/api/v2/admin/pay-grades`);

  report.check(
    'Fetch cross-origin dengan kredensial GAGAL di level browser (CORS memblokir, bukan request yang diproses server)',
    result.blocked === true,
    JSON.stringify(result),
  );

  await attackerPage.close();
  report.print();
});
