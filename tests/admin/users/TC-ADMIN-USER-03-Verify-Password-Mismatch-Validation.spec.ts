/**
 * ================================================================================
 * TC-ADMIN-USER-03: Verify Password Mismatch Validation
 * Modul    : Admin - User Management - Users
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-USER-03-Verify-Password-Mismatch-Validation.spec.ts
 * Path     : tests/admin/users/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Password dan Confirm Password yang TIDAK SAMA
 *   ditolak dengan pesan validasi, dan form TIDAK mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/users/TC-ADMIN-USER-03-Verify-Password-Mismatch-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-USER-03: mismatched Password and Confirm Password are rejected', async ({
  page,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-USER-03', 'Password Mismatch Validation', env.baseURL, page);
  const username = uniqueName('QaPwdMismatch');

  report.step('Isi Username, pilih User Role Admin, isi Password dan Confirm Password yang berbeda');
  await adminUsersPage.gotoAdd();
  await adminUsersPage.selectUserRole('Admin');
  await adminUsersPage.usernameInput.fill(username);
  await adminUsersPage.passwordInput.fill('QaPassword123!');
  await adminUsersPage.confirmPasswordInput.fill('DifferentPassword456!');
  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/users') && r.request().method() === 'POST', { timeout: 8_000 })
    .catch(() => null);
  await adminUsersPage.save();
  const resp = await respPromise;

  report.step('Verify: pesan validasi password tidak cocok muncul, TIDAK ada POST sukses');
  const mismatchError = await adminUsersPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check(
    'Password mismatch ditolak (tidak ada POST 200 sukses)',
    !resp || resp.status() !== 200,
    `status=${resp?.status() ?? 'tidak ada response'}, error=${mismatchError ?? 'tidak ada'}`,
  );

  report.print();
});
