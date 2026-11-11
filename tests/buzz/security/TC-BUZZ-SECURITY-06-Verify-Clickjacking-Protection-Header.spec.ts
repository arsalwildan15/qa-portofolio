/**
 * ================================================================================
 * TC-BUZZ-SECURITY-06: Verify Clickjacking Protection Header
 * Modul    : Buzz - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-SECURITY-06-Verify-Clickjacking-Protection-Header.spec.ts
 * Path     : tests/buzz/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi header clickjacking protection (X-Frame-Options ATAU
 *   CSP frame-ancestors) ADA pada halaman Buzz dan endpoint API-nya.
 *   Konsisten dengan escalation di Login/Recruitment/PIM/Admin -- ini
 *   konfirmasi KE-5 untuk gap app-wide yang sama kalau reproduce lagi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/security/TC-BUZZ-SECURITY-06-Verify-Clickjacking-Protection-Header.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

function hasClickjackingProtection(headers: Record<string, string>): boolean {
  const xfo = headers['x-frame-options'];
  const csp = headers['content-security-policy'] ?? '';
  return xfo !== undefined || /frame-ancestors/i.test(csp);
}

test('TC-BUZZ-SECURITY-06: Buzz pages send a clickjacking protection header', async ({ page }) => {
  const report = new TestReport('TC-BUZZ-SECURITY-06', 'Clickjacking Protection Header', env.baseURL, page);

  report.step('[API] GET Buzz page, cek header X-Frame-Options dan CSP frame-ancestors');
  const pageResp = await page.request.get(`${env.baseURL}/web/index.php/buzz/viewBuzz`);
  const pageHeaders = pageResp.headers();
  report.check(
    'Buzz page punya proteksi clickjacking (X-Frame-Options atau CSP frame-ancestors)',
    hasClickjackingProtection(pageHeaders),
    `x-frame-options=${pageHeaders['x-frame-options'] ?? '(tidak ada)'}`,
  );

  report.step('[API] GET /api/v2/buzz/posts, cek header yang sama');
  const apiResp = await page.request.get(`${env.baseURL}/web/index.php/api/v2/buzz/posts?limit=1&offset=0`);
  const apiHeaders = apiResp.headers();
  report.check(
    'GET /api/v2/buzz/posts punya proteksi clickjacking (X-Frame-Options atau CSP frame-ancestors)',
    hasClickjackingProtection(apiHeaders),
    `x-frame-options=${apiHeaders['x-frame-options'] ?? '(tidak ada)'}`,
  );

  report.print();
});
