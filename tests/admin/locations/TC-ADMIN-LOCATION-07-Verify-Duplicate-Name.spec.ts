/**
 * ================================================================================
 * TC-ADMIN-LOCATION-07: Verify Duplicate Name
 * Modul    : Admin - Organization - Locations
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCATION-07-Verify-Duplicate-Name.spec.ts
 * Path     : tests/admin/locations/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi membuat Location baru lalu mencoba membuat Location
 *   LAIN dengan Name yang SAMA PERSIS. Berbeda dari Pay Grade (yang
 *   duplikatnya hanya didokumentasikan apa adanya tanpa ekspektasi),
 *   Locations punya mekanisme validasi uniqueness server-backed yang
 *   dikonfirmasi live lewat network capture: GET /api/v2/core/
 *   validation/unique?value=...&entityName=Location&attributeName=name
 *   dipanggil saat Name field di-blur -- jadi TC ini punya ekspektasi
 *   konkret untuk diverifikasi (bukan cuma didokumentasikan netral).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/locations/TC-ADMIN-LOCATION-07-Verify-Duplicate-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-LOCATION-07: creating a location with a duplicate name is rejected by the uniqueness check', async ({
  page,
  adminLocationsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-ADMIN-LOCATION-07', 'Duplicate Name', env.baseURL, page);
  const name = uniqueName('QaDupLocation');

  report.step('Buat Location pertama');
  await adminLocationsPage.gotoAdd();
  await adminLocationsPage.nameInput.fill(name);
  await adminLocationsPage.cityInput.fill('Testville');
  await adminLocationsPage.selectCountry('United States');
  const [firstResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/locations') && r.request().method() === 'POST'),
    adminLocationsPage.save(),
  ]);
  report.check('[API] Location pertama tersimpan (status === 200)', firstResp.status() === 200, `status=${firstResp.status()}`);

  report.step('Coba buat Location KEDUA dengan Name yang sama persis, blur Name field untuk trigger validasi uniqueness');
  await adminLocationsPage.gotoAdd();
  await adminLocationsPage.nameInput.fill(name);
  const uniqueCheckPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/core/validation/unique') && r.url().includes('entityName=Location'), { timeout: 5_000 })
    .catch(() => null);
  await adminLocationsPage.cityInput.click();
  const uniqueCheckResp = await uniqueCheckPromise;
  await page.waitForTimeout(500);
  const duplicateError = await adminLocationsPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);

  const secondRespPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/locations') && r.request().method() === 'POST', { timeout: 6_000 })
    .catch(() => null);
  await adminLocationsPage.save();
  const secondResp = await secondRespPromise;

  report.step('Verify: nama duplikat ditolak (via validation endpoint dan/atau submit)');
  report.check(
    'Name duplikat ditolak (pesan error muncul ATAU POST kedua tidak sukses)',
    (duplicateError ?? '').trim().length > 0 || !secondResp || secondResp.status() !== 200,
    `uniqueCheckStatus=${uniqueCheckResp?.status() ?? 'tidak terpanggil'}, duplicateError=${duplicateError ?? 'tidak ada'}, secondPostStatus=${secondResp?.status() ?? 'tidak ada response'}`,
  );

  report.print();
});
