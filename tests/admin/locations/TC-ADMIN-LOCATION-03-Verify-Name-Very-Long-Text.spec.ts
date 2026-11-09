/**
 * ================================================================================
 * TC-ADMIN-LOCATION-03: Verify Name Very Long Text
 * Modul    : Admin - Organization - Locations
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCATION-03-Verify-Name-Very-Long-Text.spec.ts
 * Path     : tests/admin/locations/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan perilaku saat Name diisi 300 karakter (sama pola
 *   boundary dengan TC-ADMIN-JOBTITLE-03). Hasil dicatat via finding(),
 *   bukan hard check, karena belum ada ekspektasi batas panjang yang
 *   dikonfirmasi untuk field ini.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/locations/TC-ADMIN-LOCATION-03-Verify-Name-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LOCATION-03: a 300-character Name is documented as-is', async ({
  page,
  adminLocationsPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-LOCATION-03', 'Name Very Long Text', env.baseURL, page);
  const longName = 'L'.repeat(300);

  report.step('Isi Name 300 char, City, Country, klik Save');
  await adminLocationsPage.gotoAdd();
  await adminLocationsPage.nameInput.fill(longName);
  await adminLocationsPage.cityInput.fill('Testville');
  await adminLocationsPage.selectCountry('United States');

  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/locations') && r.request().method() === 'POST', { timeout: 8_000 })
    .catch(() => null);
  await adminLocationsPage.save();
  const resp = await respPromise;
  await page.waitForTimeout(1000);
  const errorText = await adminLocationsPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);

  report.step('Catat hasil apa adanya (diterima / ditolak / terpotong)');
  report.finding(
    'Location Name 300 karakter',
    resp
      ? `POST terkirim -> status=${resp.status()} (${resp.status() === 200 ? 'DITERIMA' : 'ditolak server-side'}), errorClientSide=${errorText ?? 'tidak ada'}`
      : `TIDAK ADA POST terkirim (ditolak client-side), errorClientSide=${errorText ?? 'tidak ada'}`,
  );
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
