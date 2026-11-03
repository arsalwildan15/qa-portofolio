/**
 * ================================================================================
 * TC-LOGIN-33 — Verify Very Long Password
 * Modul    : Login
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-33-Verify-Very-Long-Password.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi password sangat panjang (1000 karakter) diterima
 *   dalam waktu wajar dan tidak membuat server crash atau hang.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-33-Verify-Very-Long-Password.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-33: extremely long password does not freeze or crash', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-33', 'Very Long Password', env.baseURL, page);

  report.step('Navigate ke login, fill Password = 1000x "a", klik Login');
  await loginPage.goto();
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate'), { timeout: 10000 }),
    loginPage.login(env.username, 'a'.repeat(1000)),
  ]);

  report.step('Verify server tidak crash/hang dan login ditolak dengan wajar');
  report.check('Response status < 500', response.status() < 500, `status=${response.status()}`);
  report.check('Error "Invalid credentials" visible', await isVisibleWithWait(loginPage.errorMessage));

  report.print();
});
