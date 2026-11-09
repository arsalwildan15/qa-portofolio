/**
 * ================================================================================
 * TC-ADMIN-NATIONALITY-01: Verify Add Nationality Valid
 * Modul    : Admin - Nationalities
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-NATIONALITY-01-Verify-Add-Nationality-Valid.spec.ts
 * Path     : tests/admin/nationalities/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Nationality baru (Name) berhasil tersimpan
 *   via POST /api/v2/admin/nationalities.
 *
 *   [TEMUAN] Nationalities berisi ~196 record REAL (dikonfirmasi live
 *   lewat API meta.total=196 -- hampir semua negara di dunia), BUKAN
 *   cuma ~4-20 seperti Licenses/Languages/Memberships/Skills/Education.
 *   List-nya TIDAK punya search/filter box maupun kontrol pagination
 *   yang kelihatan (dikonfirmasi live), jadi row baru TIDAK bisa
 *   diandalkan muncul di 50 row pertama yang di-render (API list
 *   default limit=50). Karena itu verifikasi "muncul di list" di TC ini
 *   memakai GET /api/v2/admin/nationalities/{id} langsung (deterministic,
 *   tidak bergantung pagination), bukan scan baris UI seperti
 *   sub-screen Qualifications lain.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/nationalities/TC-ADMIN-NATIONALITY-01-Verify-Add-Nationality-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-NATIONALITY-01: adding a nationality with valid data succeeds', async ({
  page,
  adminNationalitiesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-NATIONALITY-01', 'Add Nationality Valid', env.baseURL, page);
  const name = uniqueName('QaNationality');

  report.step('Isi Name, klik Save');
  await adminNationalitiesPage.gotoAdd();
  await adminNationalitiesPage.nameInput.fill(name);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/nationalities') && r.request().method() === 'POST'),
    adminNationalitiesPage.save(),
  ]);

  report.step('Verify response POST nationalities, dan record benar-benar ada via GET by id (list ~196 row, tidak ada search box, lihat TUJUAN)');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  const body = await resp.json().catch(() => null);
  const newId = body?.data?.id;
  report.check('[API] response menyertakan id baru', typeof newId === 'number', `body=${JSON.stringify(body)}`);

  const getResp = await page.request.get(`${env.baseURL}/web/index.php/api/v2/admin/nationalities/${newId}`);
  const getBody = await getResp.json().catch(() => null);
  report.check(
    `Nationality "${name}" benar-benar tersimpan (GET by id mengembalikan nama yang sama)`,
    getResp.status() === 200 && getBody?.data?.name === name,
    `status=${getResp.status()} body=${JSON.stringify(getBody)}`,
  );

  report.print();
});
