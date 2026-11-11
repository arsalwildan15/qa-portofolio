/**
 * ================================================================================
 * TC-RECRUITMENT-SECURITY-02: Verify Security Response Headers
 * Modul    : Recruitment - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-SECURITY-02-Verify-Security-Response-Headers.spec.ts
 * Path     : tests/recruitment/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi header clickjacking protection (X-Frame-Options ATAU CSP
 *   frame-ancestors) ADA pada response GET /api/v2/recruitment/vacancies
 *   dan .../candidates — bukan sekadar mendokumentasikan ada/tidaknya. Per
 *   2026-11-11, TC ini diubah dari report.finding()-only menjadi hard
 *   check, konsisten dengan TC-LOGIN-43: absennya proteksi clickjacking
 *   harus FAIL + tercatat otomatis ke Bug-List selama kondisi ini masih
 *   benar, bukan cuma jadi catatan yang selalu PASS.
 *   [CONFIRMED via discovery run]:
 *     ADA   : x-content-type-options: nosniff, x-xss-protection,
 *             strict-transport-security, content-security-policy,
 *             public-key-pins.
 *     TIDAK ADA : X-Frame-Options -- [BUG] absennya header ini adalah
 *             celah clickjacking nyata (API ini bisa di-embed dalam
 *             iframe lintas origin tanpa pembatasan browser).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/security/TC-RECRUITMENT-SECURITY-02-Verify-Security-Response-Headers.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-RECRUITMENT-SECURITY-02: security response headers on recruitment API endpoints', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-SECURITY-02', 'Security Response Headers', env.baseURL, page);

  const criticalHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'strict-transport-security',
    'content-security-policy',
  ];

  async function checkEndpoint(path: string) {
    const resp = await page.request.get(`${env.baseURL}${path}`);
    const headers = resp.headers();
    const present = criticalHeaders.filter((h) => headers[h] !== undefined);
    const missing = criticalHeaders.filter((h) => headers[h] === undefined);
    return { present, missing, headers };
  }

  function hasClickjackingProtection(result: { headers: Record<string, string | undefined> }): boolean {
    const xfo = result.headers['x-frame-options'];
    const csp = result.headers['content-security-policy'] ?? '';
    return xfo !== undefined || /frame-ancestors/i.test(csp);
  }

  report.step('[API] GET /api/v2/recruitment/vacancies, cek header security');
  const vacancies = await checkEndpoint('/web/index.php/api/v2/recruitment/vacancies');
  report.finding(
    'Header security pada GET /api/v2/recruitment/vacancies',
    `Ada: [${vacancies.present.join(', ')}]. Tidak ada: [${vacancies.missing.join(', ') || 'tidak ada yang hilang'}].`,
  );
  report.check(
    'GET /api/v2/recruitment/vacancies punya proteksi clickjacking (X-Frame-Options atau CSP frame-ancestors)',
    hasClickjackingProtection(vacancies),
    `missing=[${vacancies.missing.join(', ')}]`,
  );

  report.step('[API] GET /api/v2/recruitment/candidates, cek header security');
  const candidates = await checkEndpoint('/web/index.php/api/v2/recruitment/candidates');
  report.finding(
    'Header security pada GET /api/v2/recruitment/candidates',
    `Ada: [${candidates.present.join(', ')}]. Tidak ada: [${candidates.missing.join(', ') || 'tidak ada yang hilang'}].`,
  );
  report.check(
    'GET /api/v2/recruitment/candidates punya proteksi clickjacking (X-Frame-Options atau CSP frame-ancestors)',
    hasClickjackingProtection(candidates),
    `missing=[${candidates.missing.join(', ')}]`,
  );

  report.print();
});
