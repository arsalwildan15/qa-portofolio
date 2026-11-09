/**
 * ================================================================================
 * TC-ADMIN-LOCATION-09: Verify IDOR Edit/Delete By Id
 * Modul    : Admin - Organization - Locations
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCATION-09-Verify-IDOR-Edit-Delete-By-Id.spec.ts
 * Path     : tests/admin/locations/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi akses lintas-record Location via manipulasi ID (IDOR
 *   -- form edit di UI sendiri sudah menaruh id langsung di URL,
 *   /admin/saveLocation/{id}, jadi ini target natural), dan bahwa
 *   PUT/DELETE dengan id yang TIDAK ADA ditangani bersih (404, bukan
 *   500/stack-trace leak). Demo publik OrangeHRM ini SINGLE ADMIN ROLE
 *   (tidak ada multi-tenant/multi-user scoping di aplikasi aslinya), jadi
 *   "bisa akses location lain via id" SANGAT MUNGKIN dan itu
 *   didokumentasikan sebagai baseline arsitektur (N/A - single-role,
 *   pola sama dengan TC-RECRUITMENT-SECURITY-01 dan TC-ADMIN-SKILL-08),
 *   BUKAN diasumsikan sebagai bug. Endpoint dikonfirmasi live: PUT
 *   /api/v2/admin/locations/{id}, DELETE /api/v2/admin/locations (bulk,
 *   body {ids: [...]}).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/locations/TC-ADMIN-LOCATION-09-Verify-IDOR-Edit-Delete-By-Id.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-LOCATION-09: cross-record access and bogus-id handling via ID manipulation (IDOR)', async ({
  page,
  adminLocationsPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-LOCATION-09', 'IDOR Edit/Delete By Id', env.baseURL, page);

  report.step('Buat 2 location berbeda (A dan B) di sesi yang sama');
  await adminLocationsPage.gotoAdd();
  await adminLocationsPage.nameInput.fill(uniqueName('QaIdorLocA'));
  await adminLocationsPage.cityInput.fill('Testville');
  await adminLocationsPage.selectCountry('United States');
  const [respA] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/locations') && r.request().method() === 'POST'),
    adminLocationsPage.save(),
  ]);
  const idA = (await respA.json().catch(() => null))?.data?.id;

  await adminLocationsPage.gotoAdd();
  await adminLocationsPage.nameInput.fill(uniqueName('QaIdorLocB'));
  await adminLocationsPage.cityInput.fill('Testville');
  await adminLocationsPage.selectCountry('United States');
  const [respB] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/locations') && r.request().method() === 'POST'),
    adminLocationsPage.save(),
  ]);
  const idB = (await respB.json().catch(() => null))?.data?.id;
  report.check('Location A dan B berhasil dibuat dengan id berbeda', typeof idA === 'number' && typeof idB === 'number' && idA !== idB, `idA=${idA} idB=${idB}`);

  report.step('[API] GET location B langsung via id dari sesi admin yang sama (cross-record read)');
  const getBResp = await page.request.get(`${env.baseURL}/web/index.php/api/v2/admin/locations/${idB}`);
  report.finding(
    'GET location lain via ID manipulasi (cross-record read)',
    `GET /locations/${idB} -> status=${getBResp.status()}. OrangeHRM demo publik ini single admin role: tidak ada ` +
      'boundary multi-tenant untuk ditembus, jadi hasil ini N/A - arsitektur single-role, bukan kerentanan IDOR yang valid untuk dilaporkan.',
  );

  report.step('[API] PUT location A pakai payload berbeda lewat id yang valid tapi bukan hasil navigasi UI (cross-record write)');
  const putAResp = await page.request.put(`${env.baseURL}/web/index.php/api/v2/admin/locations/${idA}`, {
    data: { name: 'QaIdorMutated', city: 'Mutated City', countryCode: 'US' },
  });
  report.finding(
    'PUT location lain via ID manipulasi (cross-record write)',
    `PUT /locations/${idA} -> status=${putAResp.status()}. Sama seperti di atas: N/A - single-role, tidak ada scoping ` +
      'per-user untuk ditembus.',
  );

  report.step('[API] PUT dengan id yang TIDAK ADA -- harus 404 bersih, bukan 500/error leak');
  const bogusId = 999999999;
  const putBogusResp = await page.request.put(`${env.baseURL}/web/index.php/api/v2/admin/locations/${bogusId}`, {
    data: { name: 'QaIdorBogus', city: 'Bogus', countryCode: 'US' },
  });
  report.check('PUT id tidak ada -> 404 bersih (bukan 500)', putBogusResp.status() === 404, `status=${putBogusResp.status()}`);

  report.step('[API] DELETE dengan id yang TIDAK ADA -- harus 404 bersih, bukan 500/error leak');
  const delBogusResp = await page.request.delete(`${env.baseURL}/web/index.php/api/v2/admin/locations`, {
    data: { ids: [bogusId] },
  });
  report.check('DELETE id tidak ada -> 404 bersih (bukan 500)', delBogusResp.status() === 404, `status=${delBogusResp.status()}`);

  report.step('Bersihkan location A dan B via API (cleanup)');
  if (typeof idA === 'number' && typeof idB === 'number') {
    const cleanupResp = await page.request.delete(`${env.baseURL}/web/index.php/api/v2/admin/locations`, {
      data: { ids: [idA, idB] },
    });
    report.check('Cleanup location A + B berhasil', cleanupResp.status() === 200, `status=${cleanupResp.status()}`);
  }

  report.print();
});
