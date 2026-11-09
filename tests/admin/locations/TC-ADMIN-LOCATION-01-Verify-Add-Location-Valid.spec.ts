/**
 * ================================================================================
 * TC-ADMIN-LOCATION-01: Verify Add Location Valid
 * Modul    : Admin - Organization - Locations
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCATION-01-Verify-Add-Location-Valid.spec.ts
 * Path     : tests/admin/locations/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Location baru (Name, City, Country) berhasil
 *   tersimpan via POST /api/v2/admin/locations dan muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/locations/TC-ADMIN-LOCATION-01-Verify-Add-Location-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-LOCATION-01: adding a location with valid data succeeds', async ({
  page,
  adminLocationsPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-LOCATION-01', 'Add Location Valid', env.baseURL, page);
  const locationName = uniqueName('QaLocation');

  report.step('Isi Name, City, pilih Country, klik Save');
  await adminLocationsPage.gotoAdd();
  await adminLocationsPage.nameInput.fill(locationName);
  await adminLocationsPage.cityInput.fill('Testville');
  await adminLocationsPage.selectCountry('United States');

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/locations') && r.request().method() === 'POST'),
    adminLocationsPage.save(),
  ]);

  report.step('Verify response POST locations, dan location muncul di list');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await adminLocationsPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `Location "${locationName}" muncul di list`,
    await adminLocationsPage.rowByName(locationName).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.print();
});
