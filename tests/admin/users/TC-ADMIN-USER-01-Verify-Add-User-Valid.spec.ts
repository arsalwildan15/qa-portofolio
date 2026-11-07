/**
 * ================================================================================
 * TC-ADMIN-USER-01: Verify Add User Valid
 * Modul    : Admin - User Management - Users
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-USER-01-Verify-Add-User-Valid.spec.ts
 * Path     : tests/admin/users/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah System User baru dengan role ESS (Username,
 *   User Role, Employee Name, Status, Password, Confirm Password)
 *   berhasil tersimpan dan muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/users/TC-ADMIN-USER-01-Verify-Add-User-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-USER-01: adding a system user with valid data succeeds', async ({
  page,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-ADMIN-USER-01', 'Add User Valid', env.baseURL, page);
  const username = uniqueName('QaUser');

  report.step('Isi Username, pilih User Role ESS, pilih Employee Name, Status Enabled, isi Password');
  await adminUsersPage.gotoAdd();
  await adminUsersPage.selectUserRole('ESS');
  await adminUsersPage.fillFirstEmployeeName();
  await adminUsersPage.selectStatus('Enabled');
  await adminUsersPage.usernameInput.fill(username);
  await adminUsersPage.passwordInput.fill('QaPassword123!');
  await adminUsersPage.confirmPasswordInput.fill('QaPassword123!');

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/users') && r.request().method() === 'POST', { timeout: 15_000 }),
    adminUsersPage.save(),
  ]);

  report.step('Verify response POST users, dan user muncul di list');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await adminUsersPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `User "${username}" muncul di list`,
    await adminUsersPage.rowByUsername(username).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.print();
});
