/**
 * ================================================================================
 * TC-LOGIN-38 — Verify Back Button After Login
 * Modul    : Login
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-38-Verify-Back-Button-After-Login.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi penggunaan tombol Back browser setelah login tidak
 *   memunculkan state halaman login yang stale atau merusak session —
 *   perilaku harus tetap konsisten (dashboard tetap, atau redirect
 *   bersih ke login).
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-38-Verify-Back-Button-After-Login.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-38: browser back button after login stays consistent', async ({ page }) => {
  const report = new TestReport('TC-LOGIN-38', 'Back Button After Login', env.baseURL);

  report.step('Dari session yang sudah authenticated di dashboard, tekan tombol Back browser');
  await page.goBack();

  report.step('Verify halaman berakhir di dashboard ATAU login, dan body tetap render');
  const url = page.url();
  const onDashboard = /dashboard\/index/.test(url);
  const onLogin = /auth\/login/.test(url);
  report.check('URL adalah dashboard atau login', onDashboard || onLogin, `url=${url}`);
  report.check('Body halaman tetap visible', await isVisibleWithWait(page.locator('body')));

  report.print();
});
