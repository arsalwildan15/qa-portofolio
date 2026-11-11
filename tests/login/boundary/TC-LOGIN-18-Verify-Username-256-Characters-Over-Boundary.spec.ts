/**
 * ================================================================================
 * TC-LOGIN-18 — Verify Username 256 Characters Over Boundary
 * Modul    : Login
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-18-Verify-Username-256-Characters-Over-Boundary.spec.ts
 * Path     : tests/login/boundary/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi username 256 karakter (satu di atas boundary TC-LOGIN-17)
 *   tetap ditangani dengan baik — input tidak punya maxlength client-side,
 *   sehingga ini menguji server, bukan browser.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/boundary/TC-LOGIN-18-Verify-Username-256-Characters-Over-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test, expect } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-LOGIN-18: username with 256 characters does not crash the server', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-18', 'Username 256 Characters Over Boundary', env.baseURL, page);

  report.step('Navigate ke login, verify input username tidak punya atribut maxlength');
  await loginPage.goto();
  await expect(loginPage.usernameInput).not.toHaveAttribute('maxlength', /.+/);

  report.step('Fill Username = 256x "a", Password valid, klik Login');
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login('a'.repeat(256), env.password),
  ]);

  report.step('Verify server tidak crash dan login ditolak dengan wajar');
  report.check('Response status < 500', response.status() < 500, `status=${response.status()}`);
  report.check('Error "Invalid credentials" visible', await isVisibleWithWait(loginPage.errorMessage));

  report.print();
});
