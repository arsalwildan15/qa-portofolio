/**
 * ================================================================================
 * TC-PIM-SECURITY-02: Verify Clickjacking Protection Header on PIM Pages
 * Modul    : PIM - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-SECURITY-02-Verify-Clickjacking-Protection-Header.spec.ts
 * Path     : tests/pim/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi header clickjacking protection (X-Frame-Options ATAU
 *   CSP frame-ancestors) ADA pada halaman Employee List dan endpoint API
 *   personal-details. Hard check (bukan finding-only), konsisten dengan
 *   escalation yang sudah dilakukan di TC-LOGIN-43 dan
 *   TC-RECRUITMENT-SECURITY-02 — gap ini TERBUKTI sama di kedua modul
 *   lain, jadi diduga gap konfigurasi level aplikasi/web-server yang
 *   berlaku di seluruh app, bukan kasus terisolasi per modul.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/security/TC-PIM-SECURITY-02-Verify-Clickjacking-Protection-Header.spec.ts --project=chromium --headed
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

test('TC-PIM-SECURITY-02: PIM pages send a clickjacking protection header', async ({ page }) => {
  const report = new TestReport('TC-PIM-SECURITY-02', 'Clickjacking Protection Header', env.baseURL, page);

  report.step('[API] GET Employee List page, cek header X-Frame-Options dan CSP frame-ancestors');
  const listResp = await page.request.get(`${env.baseURL}/web/index.php/pim/viewEmployeeList`);
  const listHeaders = listResp.headers();
  report.check(
    'Employee List punya proteksi clickjacking (X-Frame-Options atau CSP frame-ancestors)',
    hasClickjackingProtection(listHeaders),
    `x-frame-options=${listHeaders['x-frame-options'] ?? '(tidak ada)'}`,
  );

  report.step('[API] GET /api/v2/pim/employees, cek header yang sama');
  const apiResp = await page.request.get(`${env.baseURL}/web/index.php/api/v2/pim/employees?limit=1&offset=0`);
  const apiHeaders = apiResp.headers();
  report.check(
    'GET /api/v2/pim/employees punya proteksi clickjacking (X-Frame-Options atau CSP frame-ancestors)',
    hasClickjackingProtection(apiHeaders),
    `x-frame-options=${apiHeaders['x-frame-options'] ?? '(tidak ada)'}`,
  );

  report.print();
});
