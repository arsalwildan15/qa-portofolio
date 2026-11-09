/**
 * ================================================================================
 * TC-ADMIN-NATIONALITY-06: Verify Delete Nationality
 * Modul    : Admin - Nationalities
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-NATIONALITY-06-Verify-Delete-Nationality.spec.ts
 * Path     : tests/admin/nationalities/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Nationality yang baru dibuat (bukan record seed asli)
 *   bisa dihapus via DELETE /api/v2/admin/nationalities.
 *
 *   [TEMUAN] Sama seperti TC-ADMIN-NATIONALITY-01: list Nationalities
 *   berisi ~196 record REAL tanpa search/filter box maupun kontrol
 *   pagination yang kelihatan (dikonfirmasi live). Row yang baru dibuat
 *   TIDAK bisa diandalkan muncul/di-klik di 50 row pertama yang
 *   di-render UI -- percobaan live pertama untuk TC ini gagal timeout
 *   karena row tidak ketemu di halaman yang sedang tampil. Delete di TC
 *   ini sengaja dilakukan via API langsung (endpoint sudah dikonfirmasi
 *   live: DELETE /api/v2/admin/nationalities, body {ids: [id]}) supaya
 *   deterministic, bukan via klik UI seperti sub-screen Qualifications
 *   lain yang row-count-nya kecil.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/nationalities/TC-ADMIN-NATIONALITY-06-Verify-Delete-Nationality.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-NATIONALITY-06: a newly created Nationality can be deleted', async ({
  page,
  adminNationalitiesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-NATIONALITY-06', 'Delete Nationality', env.baseURL, page);
  const name = uniqueName('QaDeleteNationality');

  report.step('Buat Nationality baru untuk dihapus');
  await adminNationalitiesPage.gotoAdd();
  await adminNationalitiesPage.nameInput.fill(name);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/nationalities') && r.request().method() === 'POST'),
    adminNationalitiesPage.save(),
  ]);
  const addBody = await addResp.json().catch(() => null);
  const newId = addBody?.data?.id;
  report.check('Nationality baru berhasil dibuat (id didapat dari response)', typeof newId === 'number', `body=${JSON.stringify(addBody)}`);

  report.step('Verify record ada sebelum dihapus (GET by id)');
  const getBeforeResp = await page.request.get(`${env.baseURL}/web/index.php/api/v2/admin/nationalities/${newId}`);
  report.check('Nationality ada sebelum dihapus (GET by id === 200)', getBeforeResp.status() === 200, `status=${getBeforeResp.status()}`);

  report.step('[API] Hapus Nationality via DELETE /api/v2/admin/nationalities');
  const delResp = await page.request.delete(`${env.baseURL}/web/index.php/api/v2/admin/nationalities`, {
    data: { ids: [newId] },
  });
  report.check('[API] DELETE status === 200', delResp.status() === 200, `status=${delResp.status()}`);

  report.step('Verify: record tidak lagi ada (GET by id === 404)');
  const getAfterResp = await page.request.get(`${env.baseURL}/web/index.php/api/v2/admin/nationalities/${newId}`);
  report.check(`Nationality "${name}" sudah terhapus (GET by id === 404)`, getAfterResp.status() === 404, `status=${getAfterResp.status()}`);

  report.print();
});
