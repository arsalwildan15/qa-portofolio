/**
 * ================================================================================
 * TC-ADMIN-USER-11: Verify Bulk Delete
 * Modul    : Admin - User Management - Users
 * Kategori : Positive (+) [API VERIFICATION]
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-USER-11-Verify-Bulk-Delete.spec.ts
 * Path     : tests/admin/users/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi bulk delete di list System Users: centang checkbox
 *   >=2 row memunculkan tombol "Delete Selected", klik + confirm "Yes,
 *   Delete" mengirim SATU DELETE /api/v2/admin/users dgn body
 *   {"ids":[...]} berisi SEMUA id yg dicentang sekaligus (BUKAN 1
 *   DELETE per row) -- pola sama persis dgn bulk delete di Languages/
 *   Nationalities/Qualifications (lihat docs/TC-Admin.txt). Belum
 *   pernah diuji sama sekali sebelumnya utk modul Users spesifik.
 *
 *   [SAFETY] Sengaja membuat 2 user BARU via createTestUser() lebih
 *   dulu dan HANYA mencentang kedua user baru itu utk dihapus --
 *   TIDAK menyentuh user lain yg sudah ada di demo publik ini (termasuk
 *   akun "Admin" dan user dari TC/sesi lain), utk menghindari merusak
 *   data yg mungkin dipakai TC lain.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/users/TC-ADMIN-USER-11-Verify-Bulk-Delete.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestUser } from '../../../src/utils/createTestUser';

test('TC-ADMIN-USER-11: bulk-deleting 2 checked users sends one DELETE with both ids', async ({
  page,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-ADMIN-USER-11', 'Verify Bulk Delete', env.baseURL, page);

  report.step('Buat 2 user baru khusus utk test ini (tidak menyentuh user lain)');
  const userA = await createTestUser(page, adminUsersPage, 'QaBulkDelA');
  const userB = await createTestUser(page, adminUsersPage, 'QaBulkDelB');

  report.step('Centang checkbox kedua user baru, verify tombol "Delete Selected" muncul');
  await adminUsersPage.goto();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);
  await adminUsersPage.checkRow(userA.username);
  await adminUsersPage.checkRow(userB.username);
  report.check(
    'Tombol "Delete Selected" terlihat setelah >=2 row dicentang',
    await adminUsersPage.deleteSelectedButton.isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.step('Klik "Delete Selected", confirm "Yes, Delete", intercept request DELETE');
  const resp = await adminUsersPage.bulkDeleteSelected();

  report.step('Verify SATU DELETE request membawa KEDUA id, dan kedua user hilang dari list');
  report.check('[API] DELETE /api/v2/admin/users status === 200', resp.status() === 200, `status=${resp.status()}`);
  const requestBody = JSON.parse(resp.request().postData() ?? '{}');
  report.check(
    '[API] Body DELETE berisi TEPAT 2 id (1 request utk 2 row, bukan 1 DELETE per row)',
    Array.isArray(requestBody.ids) && requestBody.ids.length === 2,
    `ids=${JSON.stringify(requestBody.ids)}`,
  );

  await page.waitForTimeout(1000);
  const countA = await adminUsersPage.rowByUsername(userA.username).count();
  const countB = await adminUsersPage.rowByUsername(userB.username).count();
  report.check(`User "${userA.username}" TIDAK ada lagi di list`, countA === 0);
  report.check(`User "${userB.username}" TIDAK ada lagi di list`, countB === 0);

  report.print();
});
