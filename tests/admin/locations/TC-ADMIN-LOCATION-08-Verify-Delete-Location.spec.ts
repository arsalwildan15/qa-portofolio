/**
 * ================================================================================
 * TC-ADMIN-LOCATION-08: Verify Delete Location
 * Modul    : Admin - Organization - Locations
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCATION-08-Verify-Delete-Location.spec.ts
 * Path     : tests/admin/locations/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menghapus Location yang baru dibuat berhasil via
 *   konfirmasi "Yes, Delete" dan DELETE /api/v2/admin/locations, lalu
 *   row-nya tidak lagi muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/locations/TC-ADMIN-LOCATION-08-Verify-Delete-Location.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-LOCATION-08: deleting a freshly-created location removes it from the list', async ({
  page,
  adminLocationsPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-LOCATION-08', 'Delete Location', env.baseURL, page);
  const locationName = uniqueName('QaDeleteLocation');

  report.step('Buat Location baru');
  await adminLocationsPage.gotoAdd();
  await adminLocationsPage.nameInput.fill(locationName);
  await adminLocationsPage.cityInput.fill('Testville');
  await adminLocationsPage.selectCountry('United States');
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/locations') && r.request().method() === 'POST'),
    adminLocationsPage.save(),
  ]);
  await adminLocationsPage.goto();
  await page.waitForTimeout(1200);

  report.step('Hapus location yang baru dibuat');
  const row = adminLocationsPage.rowByName(locationName).first();
  await row.waitFor({ state: 'visible', timeout: 5_000 });
  const [delResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/locations') && r.request().method() === 'DELETE'),
    adminLocationsPage.deleteRow(row),
  ]);

  report.step('Verify: DELETE sukses, row tidak lagi muncul di list');
  report.check('[API] DELETE status === 200', delResp.status() === 200, `status=${delResp.status()}`);
  await page.waitForTimeout(1000);
  report.check(
    `Location "${locationName}" TIDAK lagi muncul di list`,
    !(await adminLocationsPage.rowByName(locationName).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
