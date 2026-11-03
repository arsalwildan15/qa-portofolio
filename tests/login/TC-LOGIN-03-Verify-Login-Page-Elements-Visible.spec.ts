/**
 * ================================================================================
 * TC-LOGIN-03 — Verify Login Page Elements Visible
 * Modul    : Login
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-03-Verify-Login-Page-Elements-Visible.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi halaman login men-serve dokumen HTML yang valid
 *   (GET /auth/login -> 200, Content-Type text/html) dan seluruh elemen
 *   form (username, password, tombol Login, forgot-password, kredensial
 *   demo) tampil dan siap dipakai (enabled).
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-03-Verify-Login-Page-Elements-Visible.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-03: login page renders all required elements', async ({ page, loginPage }) => {
  const report = new TestReport('TC-LOGIN-03', 'Login Page Elements Visible', env.baseURL, page);

  report.step('Navigate ke /auth/login');
  const response = await page.goto('/web/index.php/auth/login');

  report.step('Verify response GET /auth/login (status, Content-Type)');
  report.check('response.status() === 200', response?.status() === 200, `status=${response?.status()}`);
  const contentType = response?.headers()['content-type'] ?? '';
  report.check(
    'Content-Type mengandung "text/html"',
    contentType.includes('text/html'),
    `content-type="${contentType}"`,
  );

  report.step('Verify elemen form login satu per satu');
  report.check(
    'Heading "Login" visible',
    await isVisibleWithWait(page.getByRole('heading', { name: 'Login' })),
  );
  report.check('Input Username visible', await isVisibleWithWait(loginPage.usernameInput));
  report.check('Input Username enabled', await loginPage.usernameInput.isEnabled());
  report.check('Input Password visible', await isVisibleWithWait(loginPage.passwordInput));
  report.check('Input Password enabled', await loginPage.passwordInput.isEnabled());
  report.check('Button "Login" visible', await isVisibleWithWait(loginPage.loginButton));
  report.check('Button "Login" enabled', await loginPage.loginButton.isEnabled());
  report.check('"Forgot your password?" visible', await isVisibleWithWait(loginPage.forgotPasswordLink));
  report.check('Kotak kredensial demo visible', await isVisibleWithWait(loginPage.credentialHintBox));

  report.print();
});
