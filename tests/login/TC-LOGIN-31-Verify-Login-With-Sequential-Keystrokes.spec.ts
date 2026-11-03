/**
 * ================================================================================
 * TC-LOGIN-31 — Verify Login With Sequential Keystrokes
 * Modul    : Login
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-31-Verify-Login-With-Sequential-Keystrokes.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi login berhasil saat kredensial diketik karakter per
 *   karakter (pressSequentially), bukan di-set sekaligus via fill() —
 *   menguji validasi apapun yang berbasis event keyup/input.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-31-Verify-Login-With-Sequential-Keystrokes.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, urlMatchesWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-31: login works with character-by-character input', async ({ page, loginPage }) => {
  const report = new TestReport('TC-LOGIN-31', 'Login With Sequential Keystrokes', env.baseURL, page);

  report.step('Navigate ke login, ketik Username dan Password karakter per karakter');
  await loginPage.goto();
  await loginPage.usernameInput.pressSequentially(env.username);
  await loginPage.passwordInput.pressSequentially(env.password);
  await loginPage.loginButton.click();

  report.step('Verify login berhasil dan redirect ke dashboard');
  report.check(
    'URL mengandung "/dashboard/index"',
    await urlMatchesWithWait(page, /dashboard\/index/),
    `url=${page.url()}`,
  );

  report.print();
});
