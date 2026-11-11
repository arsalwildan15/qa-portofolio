/**
 * ================================================================================
 * TC-LOGIN-29 — Verify Login With Enter Key
 * Modul    : Login
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-29-Verify-Login-With-Enter-Key.spec.ts
 * Path     : tests/login/edge/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi form login bisa di-submit dengan menekan Enter pada
 *   field password, tanpa klik tombol Login.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/edge/TC-LOGIN-29-Verify-Login-With-Enter-Key.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, urlMatchesWithWait } from '../../../src/utils/testReport';

test('TC-LOGIN-29: login can be submitted via Enter key', async ({ page, loginPage }) => {
  const report = new TestReport('TC-LOGIN-29', 'Login With Enter Key', env.baseURL, page);

  report.step('Navigate ke login, fill credentials valid, tekan Enter di field password');
  await loginPage.goto();
  await loginPage.submitViaEnterKey(env.username, env.password);

  // NOTE 2026-11-12: submitViaEnterKey() only presses Enter and returns immediately -- it does
  // not wait for the resulting navigation. Reading page.url() synchronously right after is a
  // race condition: on a slightly slower response, the check fires before the redirect to
  // /dashboard/index completes, producing a false failure (confirmed flaky: failed 2 of 3 runs
  // with no code change, passed once isolated on a faster response). Fixed by waiting for the
  // URL to match before asserting, same pattern used elsewhere in this suite.
  report.step('Verify login berhasil dan redirect ke dashboard');
  const reachedDashboard = await urlMatchesWithWait(page, /dashboard\/index/);
  report.check('URL mengandung "/dashboard/index"', reachedDashboard, `url=${page.url()}`);

  report.print();
});
