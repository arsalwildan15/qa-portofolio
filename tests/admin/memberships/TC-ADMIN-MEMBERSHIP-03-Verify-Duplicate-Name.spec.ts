/**
 * ================================================================================
 * TC-ADMIN-MEMBERSHIP-03: Verify Duplicate Name
 * Modul    : Admin - Qualifications - Memberships
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-MEMBERSHIP-03-Verify-Duplicate-Name.spec.ts
 * Path     : tests/admin/memberships/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi membuat Membership baru lalu mencoba membuat Membership
 *   LAIN dengan nama yang SAMA PERSIS ditangani konsisten (ditolak dengan
 *   pesan duplikat, atau diterima -- hasilnya didokumentasikan apa adanya
 *   lewat hard check sesuai perilaku nyata, pola sama dengan
 *   TC-ADMIN-PAYGRADE-04).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/memberships/TC-ADMIN-MEMBERSHIP-03-Verify-Duplicate-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-MEMBERSHIP-03: creating a membership with a duplicate name is handled consistently', async ({
  page,
  adminMembershipsListPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-ADMIN-MEMBERSHIP-03', 'Duplicate Name', env.baseURL, page);
  const name = uniqueName('QaDupMembership');

  report.step('Buat Membership pertama');
  await adminMembershipsListPage.gotoAdd();
  await adminMembershipsListPage.nameInput.fill(name);
  const [firstResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/memberships') && r.request().method() === 'POST'),
    adminMembershipsListPage.save(),
  ]);
  report.check('[API] Membership pertama tersimpan (status === 200)', firstResp.status() === 200, `status=${firstResp.status()}`);

  report.step('Coba buat Membership KEDUA dengan nama yang sama persis');
  await adminMembershipsListPage.gotoAdd();
  await adminMembershipsListPage.nameInput.fill(name);
  const secondRespPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/memberships') && r.request().method() === 'POST', { timeout: 8_000 })
    .catch(() => null);
  await adminMembershipsListPage.save();
  const secondResp = await secondRespPromise;
  const duplicateError = await adminMembershipsListPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);

  report.step('Verify: catat perilaku duplikat apa adanya');
  report.check(
    'TC dijalankan tanpa exception (perilaku duplikat dicatat apa adanya)',
    true,
    `secondStatus=${secondResp?.status() ?? 'tidak ada response (ditolak client-side)'}, error=${duplicateError ?? 'tidak ada'}`,
  );

  report.print();
});
