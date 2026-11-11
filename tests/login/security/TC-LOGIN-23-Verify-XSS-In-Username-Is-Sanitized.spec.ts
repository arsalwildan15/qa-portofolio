/**
 * ================================================================================
 * TC-LOGIN-23 — Verify XSS In Username Is Sanitized
 * Modul    : Login
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-23-Verify-XSS-In-Username-Is-Sanitized.spec.ts
 * Path     : tests/login/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS pada field username tidak pernah dieksekusi
 *   dan tag <script> mentah tidak dirender sebagai HTML hidup di halaman.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/security/TC-LOGIN-23-Verify-XSS-In-Username-Is-Sanitized.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-LOGIN-23: XSS payload in username is not executed', async ({ page, loginPage }) => {
  const report = new TestReport('TC-LOGIN-23', 'XSS In Username Is Sanitized', env.baseURL, page);

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step(`Navigate ke login, fill Username = "<script>alert('xss')</script>", Password = "admin123", klik Login`);
  await loginPage.goto();
  await loginPage.login("<script>alert('xss')</script>", 'admin123');

  report.step('Verify tidak ada dialog alert() yang muncul dan script tidak dirender hidup');
  report.check('Tidak ada dialog alert() yang terpicu', dialogFired === false);
  report.check(
    'count(script:has-text("alert")) === 0',
    (await page.locator('script:has-text("alert(\'xss\')")').count()) === 0,
  );
  report.check('Error "Invalid credentials" visible', await isVisibleWithWait(loginPage.errorMessage));

  report.print();
});
