/**
 * ================================================================================
 * TC-ADMIN-MEMBERSHIP-01: Verify Add Membership Valid
 * Modul    : Admin - Qualifications - Memberships
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-MEMBERSHIP-01-Verify-Add-Membership-Valid.spec.ts
 * Path     : tests/admin/memberships/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Membership baru (Name) berhasil tersimpan via
 *   POST /api/v2/admin/memberships dan muncul di list. [CATATAN] Ini
 *   adalah master-data list Admin > Qualifications > Memberships, BUKAN
 *   tab Memberships PIM level-karyawan (sudah dites terpisah di
 *   tests/pim/).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/memberships/TC-ADMIN-MEMBERSHIP-01-Verify-Add-Membership-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-MEMBERSHIP-01: adding a membership with valid data succeeds', async ({
  page,
  adminMembershipsListPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-MEMBERSHIP-01', 'Add Membership Valid', env.baseURL, page);
  const name = uniqueName('QaMembership');

  report.step('Isi Name, klik Save');
  await adminMembershipsListPage.gotoAdd();
  await adminMembershipsListPage.nameInput.fill(name);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/memberships') && r.request().method() === 'POST'),
    adminMembershipsListPage.save(),
  ]);

  report.step('Verify response POST memberships, dan membership muncul di list');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await adminMembershipsListPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `Membership "${name}" muncul di list`,
    await adminMembershipsListPage.rowByName(name).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.print();
});
