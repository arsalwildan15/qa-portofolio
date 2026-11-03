/**
 * ================================================================================
 * TC-LOGIN-28 — Verify Leading Trailing Spaces In Username
 * Modul    : Login
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-28-Verify-Leading-Trailing-Spaces-In-Username.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi username dengan spasi di depan/belakang (sekitar nilai
 *   valid) TIDAK di-trim oleh client — dikirim as-is dan ditolak sebagai
 *   invalid (dikonfirmasi lewat inspeksi network payload).
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-28-Verify-Leading-Trailing-Spaces-In-Username.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-28: username with leading/trailing spaces is not trimmed', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-28', 'Leading Trailing Spaces In Username', env.baseURL, page);

  report.step(`Navigate ke login, fill Username = "  ${env.username}  " (spasi depan/belakang), klik Login`);
  await loginPage.goto();
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login(`  ${env.username}  `, env.password),
  ]);

  report.step('Verify response redirect ke /auth/login (ditolak, bukan di-trim lalu login sukses)');
  const location = response.headers()['location'] ?? '';
  report.check('Header Location mengandung "/auth/login"', location.includes('/auth/login'), `location=${location}`);
  report.check('Error "Invalid credentials" visible', await isVisibleWithWait(loginPage.errorMessage));

  report.print();
});
