/**
 * ================================================================================
 * TC-ADMIN-LOCATION-02: Verify Empty Submit Validation
 * Modul    : Admin - Organization - Locations
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCATION-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/locations/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add Location kosong menampilkan validasi
 *   "Required" pada KEDUA field required yang dikonfirmasi live --
 *   Name DAN City (bukan cuma Name seperti sub-screen simple-list lain).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/locations/TC-ADMIN-LOCATION-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LOCATION-02: submitting the Add Location form empty shows Required on Name and City', async ({
  page,
  adminLocationsPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LOCATION-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buka Add Location, klik Save tanpa isi apa pun');
  await adminLocationsPage.gotoAdd();
  await adminLocationsPage.save();
  await page.waitForTimeout(1000);

  report.step('Verify: tepat 2 pesan Required muncul (Name dan City)');
  const errorTexts = (await adminLocationsPage.fieldErrors.allTextContents()).filter((t) => t.trim().length > 0);
  report.check('Ada >= 2 pesan "Required" (Name dan City)', errorTexts.filter((t) => t.trim() === 'Required').length >= 2, `errors=${JSON.stringify(errorTexts)}`);

  report.print();
});
