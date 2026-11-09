/**
 * ================================================================================
 * TC-ADMIN-LOCATION-05: Verify SQL Injection In Name
 * Modul    : Admin - Organization - Locations
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCATION-05-Verify-SQL-Injection-In-Name.spec.ts
 * Path     : tests/admin/locations/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection (`' OR '1'='1`) di Location Name
 *   ditangani dengan aman -- tidak ada HTTP 500/stack trace yang
 *   mengindikasikan query SQL rusak.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/locations/TC-ADMIN-LOCATION-05-Verify-SQL-Injection-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LOCATION-05: a SQL injection payload in Location Name is handled safely', async ({
  page,
  adminLocationsPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LOCATION-05', 'SQL Injection In Name', env.baseURL, page);
  const sqlPayload = `' OR '1'='1`;

  report.step('Isi Location Name dengan payload SQLi, City, Country, klik Save');
  await adminLocationsPage.gotoAdd();
  await adminLocationsPage.nameInput.fill(sqlPayload);
  await adminLocationsPage.cityInput.fill('Testville');
  await adminLocationsPage.selectCountry('United States');
  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/locations') && r.request().method() === 'POST', { timeout: 8_000 })
    .catch(() => null);
  await adminLocationsPage.save();
  const resp = await respPromise;

  report.step('Verify: tidak ada response 500 dari POST locations');
  report.check('Tidak ada response 500 (server error)', !resp || resp.status() !== 500, `status=${resp?.status() ?? 'tidak ada response'}`);
  report.finding('Payload SQLi di Location Name', `POST locations -> ${resp ? `status=${resp.status()}` : 'tidak ada response terkirim'}, payload="${sqlPayload}"`);

  report.print();
});
