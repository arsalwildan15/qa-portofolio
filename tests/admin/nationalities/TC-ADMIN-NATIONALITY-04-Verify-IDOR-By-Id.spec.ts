/**
 * ================================================================================
 * TC-ADMIN-NATIONALITY-04: Verify IDOR By Id
 * Modul    : Admin - Nationalities
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-NATIONALITY-04-Verify-IDOR-By-Id.spec.ts
 * Path     : tests/admin/nationalities/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi akses lintas-record Nationality via manipulasi ID
 *   (IDOR), dan bahwa PUT/DELETE dengan id yang TIDAK ADA ditangani
 *   bersih (404, bukan 500/stack-trace leak).
 *
 *   [SAFETY CONSTRAINT] Nationalities berisi 50 record SEED REAL yang
 *   dipakai bersama semua sesi demo publik (cth id=1 "Afghan", id=2
 *   "Albanian" -- dikonfirmasi live). TC ini SENGAJA hanya melakukan GET
 *   terhadap record seed asli (read-only, tidak merusak apa pun) untuk
 *   mendemonstrasikan akses lintas-record, dan HANYA memakai PUT/DELETE
 *   terhadap id yang TIDAK ADA (bogus) untuk menguji penanganan error --
 *   TIDAK PERNAH memodifikasi/menghapus record seed asli, demi keamanan
 *   demo bersama (pola constraint yang sama dengan Corporate Branding).
 *
 *   Demo publik ini SINGLE ADMIN ROLE (tidak ada multi-tenant/multi-user
 *   scoping), jadi "bisa GET record lain via id" SANGAT MUNGKIN dan itu
 *   didokumentasikan sebagai baseline arsitektur (N/A - single-role, pola
 *   sama dengan TC-RECRUITMENT-SECURITY-01), BUKAN diasumsikan sebagai
 *   bug.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/nationalities/TC-ADMIN-NATIONALITY-04-Verify-IDOR-By-Id.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-NATIONALITY-04: cross-record read and bogus-id handling via ID manipulation (IDOR)', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-NATIONALITY-04', 'IDOR By Id', env.baseURL, page);

  report.step('[API] GET list nationalities untuk ambil 2 id record seed REAL (read-only)');
  const listResp = await page.request.get(`${env.baseURL}/web/index.php/api/v2/admin/nationalities?limit=2&offset=0`);
  const listBody = await listResp.json().catch(() => null);
  const firstId = listBody?.data?.[0]?.id;
  const secondId = listBody?.data?.[1]?.id;
  report.check('[API] List nationalities berhasil diambil, minimal 2 record', typeof firstId === 'number' && typeof secondId === 'number', `ids=${JSON.stringify(listBody?.data)}`);

  report.step('[API] GET record kedua langsung via id (cross-record read, read-only, tidak memodifikasi apa pun)');
  const getSecondResp = await page.request.get(`${env.baseURL}/web/index.php/api/v2/admin/nationalities/${secondId}`);
  report.finding(
    'GET nationality lain via ID manipulasi (cross-record read, read-only)',
    `GET /nationalities/${secondId} -> status=${getSecondResp.status()}. OrangeHRM demo publik ini single admin ` +
      'role: tidak ada boundary multi-tenant untuk ditembus, jadi hasil ini N/A - arsitektur single-role, bukan ' +
      'kerentanan IDOR yang valid untuk dilaporkan. TC ini TIDAK memodifikasi record seed asli (lihat SAFETY ' +
      'CONSTRAINT di header file).',
  );

  report.step('[API] PUT dengan id yang TIDAK ADA -- harus 404 bersih, bukan 500/error leak (TIDAK menyentuh record seed asli)');
  const bogusId = 999999999;
  const putBogusResp = await page.request.put(`${env.baseURL}/web/index.php/api/v2/admin/nationalities/${bogusId}`, {
    data: { name: 'QaIdorBogus' },
  });
  report.check('PUT id tidak ada -> 404 bersih (bukan 500)', putBogusResp.status() === 404, `status=${putBogusResp.status()}`);

  report.step('[API] DELETE dengan id yang TIDAK ADA -- harus 404 bersih, bukan 500/error leak (TIDAK menyentuh record seed asli)');
  const delBogusResp = await page.request.delete(`${env.baseURL}/web/index.php/api/v2/admin/nationalities`, {
    data: { ids: [bogusId] },
  });
  report.check('DELETE id tidak ada -> 404 bersih (bukan 500)', delBogusResp.status() === 404, `status=${delBogusResp.status()}`);

  report.print();
});
