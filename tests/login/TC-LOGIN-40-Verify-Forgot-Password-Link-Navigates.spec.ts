/**
 * ================================================================================
 * TC-LOGIN-40 — Verify Forgot Password Link Navigates
 * Modul    : Login
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-40-Verify-Forgot-Password-Link-Navigates.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi link "Forgot your password?" menavigasi ke halaman
 *   request reset password.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-40-Verify-Forgot-Password-Link-Navigates.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait, urlMatchesWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-40: "Forgot your password?" link is functional', async ({ page, loginPage }) => {
  const report = new TestReport('TC-LOGIN-40', 'Forgot Password Link Navigates', env.baseURL, page);

  report.step('Navigate ke login, klik link "Forgot your password?"');
  await loginPage.goto();
  await loginPage.forgotPasswordLink.click();

  report.step('Verify URL berubah ke requestPasswordResetCode dan heading "Reset Password" tampil');
  report.check(
    'URL mengandung "/auth/requestPasswordResetCode"',
    await urlMatchesWithWait(page, /auth\/requestPasswordResetCode/),
    `url=${page.url()}`,
  );
  report.check(
    'Heading "Reset Password" visible',
    await isVisibleWithWait(page.getByRole('heading', { name: 'Reset Password' })),
  );

  report.print();
});
