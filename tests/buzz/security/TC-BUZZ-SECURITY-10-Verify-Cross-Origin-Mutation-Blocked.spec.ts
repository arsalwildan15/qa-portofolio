/**
 * ================================================================================
 * TC-BUZZ-SECURITY-10: Verify Cross-Origin Mutation Request (CSRF) Blocked
 * Modul    : Buzz - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-SECURITY-10-Verify-Cross-Origin-Mutation-Blocked.spec.ts
 * Path     : tests/buzz/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi endpoint mutasi POST /api/v2/buzz/posts TIDAK bisa
 *   dipicu dari origin lain memakai cookie sesi yang sedang login
 *   (CSRF). Pola sama persis dengan TC-RECRUITMENT-SECURITY-05 /
 *   TC-ADMIN-SECURITY-02: endpoint ini API-style (JSON body dari SPA),
 *   proteksi yang diharapkan adalah CORS preflight. Buzz BELUM PERNAH
 *   diuji CSRF sama sekali sebelumnya di modul ini.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/security/TC-BUZZ-SECURITY-10-Verify-Cross-Origin-Mutation-Blocked.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-BUZZ-SECURITY-10: cross-origin fetch with credentials cannot create a Buzz post', async ({
  page,
  context,
}) => {
  const report = new TestReport('TC-BUZZ-SECURITY-10', 'Cross-Origin Mutation Blocked', env.baseURL, page);

  report.step('Pastikan sesi aktif (sudah login via authenticatedTest fixture)');
  const cookiesBefore = await context.cookies();
  report.check('Cookie sesi ada sebelum percobaan cross-origin', cookiesBefore.some((c) => c.name === 'orangehrm'));

  report.step('Buka tab baru di origin eksternal (https://example.com), simulasi attacker page');
  const attackerPage = await context.newPage();
  await attackerPage.goto('https://example.com');

  report.step('Dari origin eksternal, fetch() POST JSON ke /api/v2/buzz/posts dengan credentials:include');
  const result = await attackerPage.evaluate(async (apiUrl) => {
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'CSRF-Probe-BuzzPost-Should-Not-Exist', type: 'text' }),
      });
      return { blocked: false, status: resp.status };
    } catch (err) {
      return { blocked: true, error: String(err) };
    }
  }, `${env.baseURL}/web/index.php/api/v2/buzz/posts`);

  report.check(
    'Fetch cross-origin dengan kredensial GAGAL di level browser (CORS memblokir, bukan request yang diproses server)',
    result.blocked === true,
    JSON.stringify(result),
  );

  await attackerPage.close();
  report.print();
});
