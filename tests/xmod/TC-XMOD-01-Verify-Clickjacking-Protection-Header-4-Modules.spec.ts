/**
 * ================================================================================
 * TC-XMOD-01 — Verify Leave, Claim, Performance And Time Send A Clickjacking Protection Header
 * Modul    : Lintas modul (Leave / Claim / Performance / Time) - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-XMOD-01-Verify-Clickjacking-Protection-Header-4-Modules.spec.ts
 * Path     : tests/xmod/
 * ================================================================================
 *
 * TUJUAN:
 *   Halaman & API keempat modul Fase 2 harus mengirim X-Frame-Options ATAU CSP frame-ancestors.
 *   Hard check, konsisten dgn TC-LOGIN-43 / RECRUITMENT-SECURITY-02 / PIM-SECURITY-02 /
 *   ADMIN-SECURITY-01 / BUZZ-SECURITY-06 (gap yg sama sudah tercatat BG-030/066/096/145/175).
 *   Confirmed live 15 Nov 2026: keempat modul mengirim CSP (default-src ...), nosniff & HSTS,
 *   TETAPI tanpa X-Frame-Options dan tanpa frame-ancestors -> halaman bisa di-iframe.
 *   TC sengaja FAILED sampai header ditambahkan (gap level web-server/aplikasi).
 *
 * RUN COMMAND:
 *   npx playwright test tests/xmod/TC-XMOD-01-Verify-Clickjacking-Protection-Header-4-Modules.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

const TARGETS: Array<[string, string, string]> = [
  ['Leave', '/web/index.php/leave/viewLeaveList', '/web/index.php/api/v2/leave/leave-types?limit=1'],
  ['Claim', '/web/index.php/claim/viewAssignClaim', '/web/index.php/api/v2/claim/events?limit=1'],
  ['Performance', '/web/index.php/performance/searchKpi', '/web/index.php/api/v2/performance/kpis?limit=1'],
  ['Time', '/web/index.php/time/viewEmployeeTimesheet', '/web/index.php/api/v2/time/projects?limit=1'],
];

const protectedAgainstFraming = (h: Record<string, string>) =>
  h['x-frame-options'] !== undefined || /frame-ancestors/i.test(h['content-security-policy'] ?? '');

test('TC-XMOD-01: Leave, Claim, Performance and Time send a clickjacking protection header', async ({ page }) => {
  const report = new TestReport('TC-XMOD-01', 'Clickjacking Protection Header 4 Modules', env.baseURL, page);

  for (const [module, pagePath, apiPath] of TARGETS) {
    report.step(`[${module}] GET halaman & API, cek X-Frame-Options / CSP frame-ancestors`);
    const pageHeaders = (await page.request.get(pagePath)).headers();
    report.check(`[${module}] Halaman punya proteksi clickjacking`, protectedAgainstFraming(pageHeaders), `x-frame-options=${pageHeaders['x-frame-options'] ?? '(tidak ada)'}, frame-ancestors=${/frame-ancestors/i.test(pageHeaders['content-security-policy'] ?? '')}`);
    const apiHeaders = (await page.request.get(apiPath)).headers();
    report.check(`[${module}] API punya proteksi clickjacking`, protectedAgainstFraming(apiHeaders), `x-frame-options=${apiHeaders['x-frame-options'] ?? '(tidak ada)'}`);
    report.check(`[${module}] Header lain tetap ada: nosniff + HSTS (kontrol)`, pageHeaders['x-content-type-options'] === 'nosniff' && !!pageHeaders['strict-transport-security'], `xcto=${pageHeaders['x-content-type-options']}, hsts=${pageHeaders['strict-transport-security']}`);
  }

  report.print();
});
