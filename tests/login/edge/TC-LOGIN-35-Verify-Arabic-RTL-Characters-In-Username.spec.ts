/**
 * ================================================================================
 * TC-LOGIN-35 — Verify Arabic RTL Characters In Username
 * Modul    : Login
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-35-Verify-Arabic-RTL-Characters-In-Username.spec.ts
 * Path     : tests/login/edge/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi karakter RTL (Arab) pada username di-encode dan
 *   dikirim dengan benar (UTF-8) tanpa membuat server crash.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/edge/TC-LOGIN-35-Verify-Arabic-RTL-Characters-In-Username.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-LOGIN-35: RTL Arabic characters in username do not crash the server', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-35', 'Arabic RTL Characters In Username', env.baseURL, page);

  report.step('Navigate ke login, fill Username = "مستخدم" (Arabic), Password valid, klik Login');
  await loginPage.goto();
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login('مستخدم', env.password),
  ]);

  report.step('Verify server tidak crash dan login ditolak dengan wajar');
  report.check('Response status < 500', response.status() < 500, `status=${response.status()}`);
  report.check('Error "Invalid credentials" visible', await isVisibleWithWait(loginPage.errorMessage));

  report.print();
});
