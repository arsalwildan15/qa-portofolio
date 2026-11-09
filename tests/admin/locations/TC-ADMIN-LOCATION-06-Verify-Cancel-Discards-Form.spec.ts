/**
 * ================================================================================
 * TC-ADMIN-LOCATION-06: Verify Cancel Discards Form
 * Modul    : Admin - Organization - Locations
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCATION-06-Verify-Cancel-Discards-Form.spec.ts
 * Path     : tests/admin/locations/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel pada form Add Location membatalkan isian
 *   dan kembali ke list tanpa menyimpan apa pun.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/locations/TC-ADMIN-LOCATION-06-Verify-Cancel-Discards-Form.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-LOCATION-06: clicking Cancel discards the Add Location form', async ({
  page,
  adminLocationsPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LOCATION-06', 'Cancel Discards Form', env.baseURL, page);
  const locationName = uniqueName('QaCancelledLoc');

  report.step('Isi Name dan City, klik Cancel');
  await adminLocationsPage.gotoAdd();
  await adminLocationsPage.nameInput.fill(locationName);
  await adminLocationsPage.cityInput.fill('Testville');
  await adminLocationsPage.cancelButton.click();
  await page.waitForTimeout(1200);

  report.step('Verify: kembali ke list, location TIDAK tersimpan');
  report.check('Kembali ke list Locations', page.url().includes('viewLocations'));
  report.check(
    `Location "${locationName}" TIDAK muncul di list`,
    !(await adminLocationsPage.rowByName(locationName).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
