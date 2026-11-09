/**
 * ================================================================================
 * TC-ADMIN-LOCATION-04: Verify XSS In Name
 * Modul    : Admin - Organization - Locations
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCATION-04-Verify-XSS-In-Name.spec.ts
 * Path     : tests/admin/locations/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Location Name tidak tereksekusi sebagai
 *   script saat tersimpan dan ditampilkan kembali di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/locations/TC-ADMIN-LOCATION-04-Verify-XSS-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-LOCATION-04: an XSS payload in Location Name does not execute', async ({
  page,
  adminLocationsPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LOCATION-04', 'XSS In Name', env.baseURL, page);
  const payload = `${uniqueName('QaXss')}<script>window.__xss=true</script>`;

  report.step('Isi Location Name dengan payload XSS, City, Country, klik Save');
  await adminLocationsPage.gotoAdd();
  await adminLocationsPage.nameInput.fill(payload);
  await adminLocationsPage.cityInput.fill('Testville');
  await adminLocationsPage.selectCountry('United States');
  await adminLocationsPage.save();
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(1500);

  report.step('Verify: tidak ada eksekusi script (window.__xss tidak ter-set)');
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xss?: boolean }).__xss === true)
    .catch(() => false);
  report.check('Payload XSS TIDAK tereksekusi sebagai script', xssExecuted === false);

  report.print();
});
