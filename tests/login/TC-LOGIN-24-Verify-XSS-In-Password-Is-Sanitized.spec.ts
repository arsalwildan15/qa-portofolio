/**
 * ================================================================================
 * TC-LOGIN-24 — Verify XSS In Password Is Sanitized
 * Modul    : Login
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-24-Verify-XSS-In-Password-Is-Sanitized.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS (img onerror variant) pada field password
 *   tidak pernah dieksekusi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-24-Verify-XSS-In-Password-Is-Sanitized.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-24: XSS payload in password is not executed', async ({ page, loginPage }) => {
  const report = new TestReport('TC-LOGIN-24', 'XSS In Password Is Sanitized', env.baseURL, page);

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step('Navigate ke login, fill Password = "<img src=x onerror=alert(1)>", klik Login');
  await loginPage.goto();
  await loginPage.login(env.username, '<img src=x onerror=alert(1)>');

  report.step('Verify tidak ada dialog alert() yang muncul dan halaman tetap utuh');
  report.check('Tidak ada dialog alert() yang terpicu', dialogFired === false);
  report.check('Body halaman tetap visible', await isVisibleWithWait(page.locator('body')));

  report.print();
});
