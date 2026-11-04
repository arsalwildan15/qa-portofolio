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
 *   Mendokumentasikan header security apa saja yang ADA vs TIDAK ADA pada
 *   response GET /api/v2/recruitment/vacancies dan .../candidates.
 *   [CONFIRMED via discovery run]:
 *     ADA   : x-content-type-options: nosniff, x-xss-protection,
 *             strict-transport-security, content-security-policy,
 *             public-key-pins.
 *     TIDAK ADA : X-Frame-Options -- [TEMUAN RISIKO] absennya header ini
 *             adalah celah clickjacking yang valid untuk dilaporkan (API
 *             ini bisa di-embed dalam iframe lintas origin tanpa
 *             pembatasan browser).
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

  report.step('[API] GET /api/v2/recruitment/vacancies, cek header security');
  const vacancies = await checkEndpoint('/web/index.php/api/v2/recruitment/vacancies');
  report.finding(
    'Header security pada GET /api/v2/recruitment/vacancies',
    `Ada: [${vacancies.present.join(', ')}]. Tidak ada: [${vacancies.missing.join(', ') || 'tidak ada yang hilang'}].`,
  );

  report.step('[API] GET /api/v2/recruitment/candidates, cek header security');
  const candidates = await checkEndpoint('/web/index.php/api/v2/recruitment/candidates');
  report.finding(
    'Header security pada GET /api/v2/recruitment/candidates',
    `Ada: [${candidates.present.join(', ')}]. Tidak ada: [${candidates.missing.join(', ') || 'tidak ada yang hilang'}].`,
  );

  report.check('TC dijalankan tanpa exception (baseline dokumentasi, bukan hard fail)', true);

  if (vacancies.missing.includes('x-frame-options') || candidates.missing.includes('x-frame-options')) {
    report.finding(
      '[RISIKO] X-Frame-Options TIDAK ADA pada endpoint recruitment',
      'Absennya X-Frame-Options (atau frame-ancestors di CSP) adalah celah clickjacking yang valid: response ' +
        'API bisa di-embed dalam iframe lintas origin tanpa pembatasan browser. Worth melaporkan meski demo ' +
        'publik ini kemungkinan tidak strict di sisi ini.',
    );
  }

  report.print();
});
