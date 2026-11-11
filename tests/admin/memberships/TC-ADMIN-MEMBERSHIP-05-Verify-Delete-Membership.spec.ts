/**
 * ================================================================================
 * TC-ADMIN-MEMBERSHIP-05: Verify Delete Membership
 * Modul    : Admin - Qualifications - Memberships
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-MEMBERSHIP-05-Verify-Delete-Membership.spec.ts
 * Path     : tests/admin/memberships/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Membership yang baru dibuat bisa dihapus lewat tombol
 *   aksi pertama di row (trash/delete).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/memberships/TC-ADMIN-MEMBERSHIP-05-Verify-Delete-Membership.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-MEMBERSHIP-05: a newly created Membership can be deleted', async ({
  page,
  adminMembershipsListPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-MEMBERSHIP-05', 'Delete Membership', env.baseURL, page);
  const name = uniqueName('QaDeleteMembership');

  report.step('Buat Membership baru untuk dihapus');
  await adminMembershipsListPage.gotoAdd();
  await adminMembershipsListPage.nameInput.fill(name);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/memberships') && r.request().method() === 'POST'),
    adminMembershipsListPage.save(),
  ]);
  await adminMembershipsListPage.goto();
  await page.waitForTimeout(3000);

  report.step('Hapus Membership yang baru dibuat');
  const row = adminMembershipsListPage.rowByName(name).first();
  report.check('Membership muncul sebelum dihapus', await row.isVisible({ timeout: 10_000 }).catch(() => false));
  await adminMembershipsListPage.deleteRow(row);
  await page.waitForTimeout(3000);

  report.step('Verify: membership tidak lagi muncul di list');
  report.check(
    `Membership "${name}" sudah terhapus`,
    !(await adminMembershipsListPage.rowByName(name).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
