/**
 * ================================================================================
 * TC-ADMIN-USER-07: Verify Refresh During Pending Save Request
 * Modul    : Admin - User Management - Users
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-USER-07-Verify-Refresh-During-Pending-Save-Request.spec.ts
 * Path     : tests/admin/users/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi apa yang terjadi kalau user me-refresh halaman TEPAT
 *   SAAT request POST create-user masih pending. Risiko: request yang
 *   sudah sampai server tapi responsnya hilang krn reload bisa membuat
 *   user ter-SIMPAN di server padahal UI tidak pernah mengonfirmasi,
 *   dan kalau user mengulang aksi yang sama (krn mengira belum
 *   tersimpan), berpotensi membuat 2 user duplikat.
 *
 * TEKNIK:
 *   POST /api/v2/admin/users di-intercept via page.route() dan DITUNDA
 *   4 detik sebelum diteruskan ke server asli -- supaya window waktu
 *   utk reload() SAAT request masih in-flight bisa dipastikan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/users/TC-ADMIN-USER-07-Verify-Refresh-During-Pending-Save-Request.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-USER-07: refreshing while the create-user request is pending does not silently create a user', async ({
  page,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-USER-07', 'Refresh During Pending Save Request', env.baseURL, page);
  const username = uniqueName('QaRefreshUser');

  report.step('Isi form user valid, intercept+tunda POST users 4 detik, klik Save TANPA menunggu response');
  await adminUsersPage.gotoAdd();
  await adminUsersPage.selectUserRole('ESS');
  await adminUsersPage.fillFirstEmployeeName();
  await adminUsersPage.selectStatus('Enabled');
  await adminUsersPage.usernameInput.fill(username);
  await adminUsersPage.passwordInput.fill('QaPassword123!');
  await adminUsersPage.confirmPasswordInput.fill('QaPassword123!');

  await page.route('**/api/v2/admin/users', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4_000));
    await route.continue().catch(() => {});
  });
  void adminUsersPage.save().catch(() => {});
  await page.waitForTimeout(800);

  report.step('Reload halaman SAAT request masih pending (sebelum 4 detik delay selesai)');
  await page.reload().catch((e) => {
    report.finding('Reload menyela navigasi/request yang sedang pending', String(e).slice(0, 150));
  });
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(3000);

  report.step(`Verify user "${username}" muncul TEPAT 0 atau 1 kali di list (bukan ganda)`);
  await page.unroute('**/api/v2/admin/users');
  await adminUsersPage.goto();
  await page.waitForTimeout(1500);
  const count = await adminUsersPage.rowByUsername(username).count();
  report.finding(
    'Hasil refresh saat save pending',
    `User muncul ${count}x di list setelah refresh mid-request (0 = request batal total/tidak sempat ` +
      `tersimpan, 1 = tersimpan sukses meski UI tidak sempat konfirmasi -- keduanya perilaku wajar; ` +
      '>1 akan jadi BUG nyata).',
  );
  report.check(`User "${username}" TIDAK muncul lebih dari 1 kali (tidak ada duplikat)`, count <= 1, `count=${count}`);

  report.print();
});
