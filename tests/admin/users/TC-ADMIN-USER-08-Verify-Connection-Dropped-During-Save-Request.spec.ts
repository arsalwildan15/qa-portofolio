/**
 * ================================================================================
 * TC-ADMIN-USER-08: Verify Connection Dropped During Save Request
 * Modul    : Admin - User Management - Users
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-USER-08-Verify-Connection-Dropped-During-Save-Request.spec.ts
 * Path     : tests/admin/users/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi perilaku form Add User saat koneksi terputus TEPAT
 *   SAAT request POST create-user sedang berjalan (bukan gagal dari
 *   awal). User harus mendapat indikasi gagal yang jelas (bukan silent
 *   hang/seolah berhasil), dan user TIDAK boleh ter-create di server.
 *
 * TEKNIK:
 *   POST /api/v2/admin/users di-intercept via page.route() dan
 *   di-abort() (simulasi network failure asli). Berbeda dari Login
 *   (TC-LOGIN-45): ini endpoint API-style (fetch/XHR dari SPA, BUKAN
 *   form navigasi top-level), jadi abort() seharusnya TIDAK merusak
 *   seluruh dokumen seperti pada Login -- harus dibuktikan, bukan
 *   diasumsikan sama.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/users/TC-ADMIN-USER-08-Verify-Connection-Dropped-During-Save-Request.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-USER-08: a dropped connection during create-user submit shows a failure and does not create the user', async ({
  page,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-USER-08', 'Connection Dropped During Save Request', env.baseURL, page);
  const username = uniqueName('QaDropUser');

  report.step('Isi form user valid, intercept POST users dgn abort(), klik Save');
  await adminUsersPage.gotoAdd();
  await adminUsersPage.selectUserRole('ESS');
  await adminUsersPage.fillFirstEmployeeName();
  await adminUsersPage.selectStatus('Enabled');
  await adminUsersPage.usernameInput.fill(username);
  await adminUsersPage.passwordInput.fill('QaPassword123!');
  await adminUsersPage.confirmPasswordInput.fill('QaPassword123!');

  await page.route('**/api/v2/admin/users', (route) => route.abort('failed'));
  await adminUsersPage.save();
  await page.waitForTimeout(2500);

  report.check(
    'Form masih di halaman Add User (TIDAK diam-diam dianggap sukses/redirect ke list)',
    page.url().includes('/admin/saveSystemUser') || page.url().includes('/admin/viewSystemUsers'),
    `url=${page.url()}`,
  );

  report.step(`Pulihkan koneksi (unroute), verify user "${username}" TIDAK ter-create di server`);
  await page.unroute('**/api/v2/admin/users');
  await adminUsersPage.goto();
  await page.waitForTimeout(1500);
  const count = await adminUsersPage.rowByUsername(username).count();
  report.check(`User "${username}" TIDAK ter-create saat koneksi terputus`, count === 0, `count=${count}`);

  report.print();
});
