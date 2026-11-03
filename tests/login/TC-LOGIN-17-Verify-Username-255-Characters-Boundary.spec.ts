/**
 * ================================================================================
 * TC-LOGIN-17 — Verify Username 255 Characters Boundary
 * Modul    : Login
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-17-Verify-Username-255-Characters-Boundary.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi username 255 karakter (upper boundary) diterima oleh
 *   form dan ditangani dengan baik oleh server (tidak crash, tidak 5xx).
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-17-Verify-Username-255-Characters-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-17: username with 255 characters does not crash the server', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-17', 'Username 255 Characters Boundary', env.baseURL, page);

  report.step('Navigate ke login, fill Username = 255x "a", Password valid, klik Login');
  await loginPage.goto();
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login('a'.repeat(255), env.password),
  ]);

  report.step('Verify server tidak crash dan login ditolak dengan wajar');
  report.check('Response status < 500', response.status() < 500, `status=${response.status()}`);
  report.check('Error "Invalid credentials" visible', await isVisibleWithWait(loginPage.errorMessage));

  report.print();
});
