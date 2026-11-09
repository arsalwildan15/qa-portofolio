/**
 * ================================================================================
 * TC-ADMIN-SKILL-08: Verify IDOR Edit/Delete By Id
 * Modul    : Admin - Qualifications - Skills
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SKILL-08-Verify-IDOR-Edit-Delete-By-Id.spec.ts
 * Path     : tests/admin/skills/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi akses lintas-record Skill via manipulasi ID (IDOR), dan
 *   bahwa PUT/DELETE dengan id yang TIDAK ADA ditangani bersih (404, bukan
 *   500/stack-trace leak). Demo publik OrangeHRM ini SINGLE ADMIN ROLE
 *   (tidak ada multi-tenant/multi-user scoping di aplikasi aslinya), jadi
 *   "bisa akses skill lain via id" SANGAT MUNGKIN dan itu didokumentasikan
 *   sebagai baseline arsitektur (N/A - single-role, pola sama dengan
 *   TC-RECRUITMENT-SECURITY-01), BUKAN diasumsikan sebagai bug. Endpoint
 *   PUT/DELETE dikonfirmasi live: PUT /api/v2/admin/skills/{id} (body
 *   {name, description}), DELETE /api/v2/admin/skills (bulk, body
 *   {ids: [id]}).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/skills/TC-ADMIN-SKILL-08-Verify-IDOR-Edit-Delete-By-Id.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-SKILL-08: cross-record access and bogus-id handling via ID manipulation (IDOR)', async ({
  page,
  adminSkillsPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-SKILL-08', 'IDOR Edit/Delete By Id', env.baseURL, page);

  report.step('Buat 2 skill berbeda (A dan B) di sesi yang sama');
  await adminSkillsPage.gotoAdd();
  await adminSkillsPage.nameInput.fill(uniqueName('QaIdorSkillA'));
  const [respA] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/skills') && r.request().method() === 'POST'),
    adminSkillsPage.save(),
  ]);
  const idA = (await respA.json().catch(() => null))?.data?.id;

  await adminSkillsPage.gotoAdd();
  await adminSkillsPage.nameInput.fill(uniqueName('QaIdorSkillB'));
  const [respB] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/skills') && r.request().method() === 'POST'),
    adminSkillsPage.save(),
  ]);
  const idB = (await respB.json().catch(() => null))?.data?.id;
  report.check('Skill A dan B berhasil dibuat dengan id berbeda', typeof idA === 'number' && typeof idB === 'number' && idA !== idB, `idA=${idA} idB=${idB}`);

  report.step('[API] GET skill B langsung via id dari sesi admin yang sama (cross-record read)');
  const getBResp = await page.request.get(`${env.baseURL}/web/index.php/api/v2/admin/skills/${idB}`);
  report.finding(
    'GET skill lain via ID manipulasi (cross-record read)',
    `GET /skills/${idB} -> status=${getBResp.status()}. OrangeHRM demo publik ini single admin role: tidak ada ` +
      'boundary multi-tenant untuk ditembus, jadi hasil ini N/A - arsitektur single-role, bukan kerentanan IDOR yang valid untuk dilaporkan.',
  );

  report.step('[API] PUT skill A pakai id milik skill lain yang valid (cross-record write)');
  const putAResp = await page.request.put(`${env.baseURL}/web/index.php/api/v2/admin/skills/${idA}`, {
    data: { name: 'QaIdorMutated', description: null },
  });
  report.finding(
    'PUT skill lain via ID manipulasi (cross-record write)',
    `PUT /skills/${idA} -> status=${putAResp.status()}. Sama seperti di atas: N/A - single-role, tidak ada scoping ` +
      'per-user untuk ditembus.',
  );

  report.step('[API] PUT dengan id yang TIDAK ADA -- harus 404 bersih, bukan 500/error leak');
  const bogusId = 999999999;
  const putBogusResp = await page.request.put(`${env.baseURL}/web/index.php/api/v2/admin/skills/${bogusId}`, {
    data: { name: 'QaIdorBogus', description: null },
  });
  report.check('PUT id tidak ada -> 404 bersih (bukan 500)', putBogusResp.status() === 404, `status=${putBogusResp.status()}`);

  report.step('[API] DELETE dengan id yang TIDAK ADA -- harus 404 bersih, bukan 500/error leak');
  const delBogusResp = await page.request.delete(`${env.baseURL}/web/index.php/api/v2/admin/skills`, {
    data: { ids: [bogusId] },
  });
  report.check('DELETE id tidak ada -> 404 bersih (bukan 500)', delBogusResp.status() === 404, `status=${delBogusResp.status()}`);

  report.step('Bersihkan skill A dan B via API (cleanup)');
  if (typeof idA === 'number' && typeof idB === 'number') {
    const cleanupResp = await page.request.delete(`${env.baseURL}/web/index.php/api/v2/admin/skills`, {
      data: { ids: [idA, idB] },
    });
    report.check('Cleanup skill A + B berhasil', cleanupResp.status() === 200, `status=${cleanupResp.status()}`);
  }

  report.print();
});
