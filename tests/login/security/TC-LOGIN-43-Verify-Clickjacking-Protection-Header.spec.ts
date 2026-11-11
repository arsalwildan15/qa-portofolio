/**
 * ================================================================================
 * TC-LOGIN-43 — Verify Clickjacking Protection Header on Login Page
 * Modul    : Login
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-43-Verify-Clickjacking-Protection-Header.spec.ts
 * Path     : tests/login/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi halaman login punya header yang mencegah clickjacking:
 *   X-Frame-Options (DENY/SAMEORIGIN) ATAU Content-Security-Policy dengan
 *   directive frame-ancestors. Tanpa salah satunya, halaman login bisa
 *   di-embed dalam <iframe> di situs attacker dan korban dikelabui
 *   mengklik tombol/field yang sebenarnya overlay dari halaman asli
 *   (UI redress attack) — risiko nyata karena ini halaman AUTENTIKASI,
 *   titik paling sensitif di seluruh aplikasi.
 *
 * [CONFIRMED via curl, 2026-11-11]:
 *   GET /web/index.php/auth/login TIDAK mengirim X-Frame-Options, dan
 *   Content-Security-Policy yang ada TIDAK punya directive
 *   frame-ancestors. Konsisten dengan temuan serupa di
 *   tests/recruitment/security/TC-RECRUITMENT-SECURITY-02 (API endpoint
 *   recruitment juga tidak punya X-Frame-Options) — mengindikasikan ini
 *   gap konfigurasi di level aplikasi/web-server, bukan kasus terisolasi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/security/TC-LOGIN-43-Verify-Clickjacking-Protection-Header.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-LOGIN-43: login page sends a clickjacking protection header', async ({ page }) => {
  const report = new TestReport('TC-LOGIN-43', 'Clickjacking Protection Header', env.baseURL, page);

  report.step('[API] GET /auth/login, cek header X-Frame-Options dan CSP frame-ancestors');
  const response = await page.request.get(`${env.baseURL}/web/index.php/auth/login`);
  const headers = response.headers();
  const xfo = headers['x-frame-options'];
  const csp = headers['content-security-policy'] ?? '';
  const hasFrameAncestors = /frame-ancestors/i.test(csp);

  report.check(
    'Halaman login punya X-Frame-Options ATAU CSP frame-ancestors (proteksi clickjacking)',
    xfo !== undefined || hasFrameAncestors,
    `x-frame-options=${xfo ?? '(tidak ada)'} | csp frame-ancestors=${hasFrameAncestors}`,
  );

  report.print();
});
