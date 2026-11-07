/**
 * ================================================================================
 * TC-ADMIN-USER-04: Verify XSS In Username
 * Modul    : Admin - User Management - Users
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-USER-04-Verify-XSS-In-Username.spec.ts
 * Path     : tests/admin/users/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Username tidak tereksekusi sebagai
 *   script, baik ditolak validasi (karakter khusus) maupun tersimpan
 *   sebagai string literal.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/users/TC-ADMIN-USER-04-Verify-XSS-In-Username.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-USER-04: an XSS payload in Username does not execute', async ({
  page,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-USER-04', 'XSS In Username', env.baseURL, page);
  const payload = `${uniqueName('QaXss')}<script>window.__xss=true</script>`;

  report.step('Isi Username dengan payload XSS, role Admin, password valid, klik Save');
  await adminUsersPage.gotoAdd();
  await adminUsersPage.selectUserRole('Admin');
  await adminUsersPage.usernameInput.fill(payload);
  await adminUsersPage.passwordInput.fill('QaPassword123!');
  await adminUsersPage.confirmPasswordInput.fill('QaPassword123!');
  await adminUsersPage.save();
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(1500);

  report.step('Verify: tidak ada eksekusi script (window.__xss tidak ter-set)');
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xss?: boolean }).__xss === true)
    .catch(() => false);
  report.check('Payload XSS TIDAK tereksekusi sebagai script', xssExecuted === false);

  report.print();
});
