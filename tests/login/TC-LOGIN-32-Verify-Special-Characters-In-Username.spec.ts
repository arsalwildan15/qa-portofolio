/**
 * ================================================================================
 * TC-LOGIN-32 — Verify Special Characters In Username
 * Modul    : Login
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-32-Verify-Special-Characters-In-Username.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi username yang terdiri penuh dari karakter spesial/
 *   tanda baca tidak membuat server crash dan ditangani dengan wajar.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-32-Verify-Special-Characters-In-Username.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-32: special characters in username do not crash the server', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-32', 'Special Characters In Username', env.baseURL, page);

  report.step('Navigate ke login, fill Username = "Admin@#$%^&*()", Password valid, klik Login');
  await loginPage.goto();
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login('Admin@#$%^&*()', env.password),
  ]);

  report.step('Verify server tidak crash dan login ditolak dengan wajar');
  report.check('Response status < 500', response.status() < 500, `status=${response.status()}`);
  report.check('Error "Invalid credentials" visible', await isVisibleWithWait(loginPage.errorMessage));

  report.print();
});
