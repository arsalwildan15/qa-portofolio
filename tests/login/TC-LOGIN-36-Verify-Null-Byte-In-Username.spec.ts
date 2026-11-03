/**
 * ================================================================================
 * TC-LOGIN-36 — Verify Null Byte In Username
 * Modul    : Login
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-36-Verify-Null-Byte-In-Username.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi null byte yang disisipkan di username tidak bypass
 *   autentikasi dan tidak membuat server crash (probe null-byte
 *   injection klasik).
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-36-Verify-Null-Byte-In-Username.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

test('TC-LOGIN-36: null byte in username does not bypass auth', async ({ page, loginPage }) => {
  const report = new TestReport('TC-LOGIN-36', 'Null Byte In Username', env.baseURL, page);

  report.step('Navigate ke login, fill Username = "<username>\\u0000", Password valid, klik Login');
  await loginPage.goto();
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login(`${env.username}\u0000`, env.password),
  ]);

  report.step('Verify server tidak crash dan request diredirect kembali ke /auth/login');
  report.check('Response status < 500', response.status() < 500, `status=${response.status()}`);
  const location = response.headers()['location'] ?? '';
  report.check('Header Location mengandung "/auth/login"', location.includes('/auth/login'), `location=${location}`);

  report.print();
});
