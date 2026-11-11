/**
 * ================================================================================
 * TC-ADMIN-SECURITY-01: Verify Clickjacking Protection Header on Admin Pages
 * Modul    : Admin - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SECURITY-01-Verify-Clickjacking-Protection-Header.spec.ts
 * Path     : tests/admin/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi header clickjacking protection (X-Frame-Options ATAU
 *   CSP frame-ancestors) ADA pada halaman Admin Users dan endpoint API
 *   terkait. Hard check (bukan finding-only), konsisten dengan
 *   escalation yang sudah dilakukan di Login (TC-LOGIN-43), Recruitment
 *   (TC-RECRUITMENT-SECURITY-02), dan PIM (TC-PIM-SECURITY-02) -- gap
 *   yang SAMA sudah dikonfirmasi di ketiga modul itu, jadi ini
 *   konfirmasi ke-4 untuk gap level aplikasi/web-server yang sama.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/security/TC-ADMIN-SECURITY-01-Verify-Clickjacking-Protection-Header.spec.ts --project=chromium --headed
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

test('TC-ADMIN-SECURITY-01: Admin pages send a clickjacking protection header', async ({ page }) => {
  const report = new TestReport('TC-ADMIN-SECURITY-01', 'Clickjacking Protection Header', env.baseURL, page);

  report.step('[API] GET Admin Users page, cek header X-Frame-Options dan CSP frame-ancestors');
  const listResp = await page.request.get(`${env.baseURL}/web/index.php/admin/viewSystemUsers`);
  const listHeaders = listResp.headers();
  report.check(
    'Admin Users page punya proteksi clickjacking (X-Frame-Options atau CSP frame-ancestors)',
    hasClickjackingProtection(listHeaders),
    `x-frame-options=${listHeaders['x-frame-options'] ?? '(tidak ada)'}`,
  );

  report.step('[API] GET /api/v2/admin/users, cek header yang sama');
  const apiResp = await page.request.get(`${env.baseURL}/web/index.php/api/v2/admin/users?limit=1&offset=0`);
  const apiHeaders = apiResp.headers();
  report.check(
    'GET /api/v2/admin/users punya proteksi clickjacking (X-Frame-Options atau CSP frame-ancestors)',
    hasClickjackingProtection(apiHeaders),
    `x-frame-options=${apiHeaders['x-frame-options'] ?? '(tidak ada)'}`,
  );

  report.print();
});
