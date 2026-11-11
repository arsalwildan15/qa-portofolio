/**
 * ================================================================================
 * TC-LOGIN-30 — Verify Double-Click Login Button
 * Modul    : Login
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-30-Verify-Double-Click-Login-Button.spec.ts
 * Path     : tests/login/edge/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi double-click pada tombol Login tidak men-submit form
 *   dua kali (tidak ada duplicate POST /auth/validate).
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/edge/TC-LOGIN-30-Verify-Double-Click-Login-Button.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-LOGIN-30: double click on Login button does not submit twice', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-30', 'Double-Click Login Button', env.baseURL, page);

  report.step('Navigate ke login, fill Username dan Password valid');
  await loginPage.goto();
  await loginPage.usernameInput.fill(env.username);
  await loginPage.passwordInput.fill(env.password);

  let submitCount = 0;
  page.on('request', (req) => {
    if (req.url().includes('/auth/validate') && req.method() === 'POST') {
      submitCount += 1;
    }
  });

  report.step('Double-click tombol Login');
  await loginPage.loginButton.dblclick();
  await page.waitForURL(/dashboard\/index/);

  report.step('Verify hanya ADA 1 POST /auth/validate yang terkirim');
  report.check('submitCount === 1', submitCount === 1, `submitCount=${submitCount}`);

  report.print();
});
