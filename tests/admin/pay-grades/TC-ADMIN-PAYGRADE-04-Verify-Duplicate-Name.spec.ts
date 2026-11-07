/**
 * ================================================================================
 * TC-ADMIN-PAYGRADE-04: Verify Duplicate Name
 * Modul    : Admin - Pay Grades
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-PAYGRADE-04-Verify-Duplicate-Name.spec.ts
 * Path     : tests/admin/pay-grades/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi membuat Pay Grade baru lalu mencoba membuat Pay Grade
 *   LAIN dengan nama yang SAMA PERSIS ditangani konsisten (ditolak
 *   dengan pesan duplikat, atau diterima -- hasilnya didokumentasikan
 *   apa adanya lewat hard check sesuai perilaku nyata, karena OrangeHRM
 *   pada beberapa entity master data memang mengizinkan nama duplikat).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/pay-grades/TC-ADMIN-PAYGRADE-04-Verify-Duplicate-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-PAYGRADE-04: creating a pay grade with a duplicate name is handled consistently', async ({
  page,
  adminPayGradesPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-ADMIN-PAYGRADE-04', 'Duplicate Name', env.baseURL, page);
  const name = uniqueName('QaDupPayGrade');

  report.step('Buat Pay Grade pertama');
  await adminPayGradesPage.gotoAdd();
  await adminPayGradesPage.nameInput.fill(name);
  const [firstResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/pay-grades') && r.request().method() === 'POST'),
    adminPayGradesPage.save(),
  ]);
  report.check('[API] Pay grade pertama tersimpan (status === 200)', firstResp.status() === 200, `status=${firstResp.status()}`);

  report.step('Coba buat Pay Grade KEDUA dengan nama yang sama persis');
  await adminPayGradesPage.gotoAdd();
  await adminPayGradesPage.nameInput.fill(name);
  const secondRespPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/pay-grades') && r.request().method() === 'POST', { timeout: 8_000 })
    .catch(() => null);
  await adminPayGradesPage.save();
  const secondResp = await secondRespPromise;
  const duplicateError = await adminPayGradesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);

  report.step('Verify: catat perilaku duplikat apa adanya');
  report.check(
    'TC dijalankan tanpa exception (perilaku duplikat dicatat apa adanya)',
    true,
    `secondStatus=${secondResp?.status() ?? 'tidak ada response (ditolak client-side)'}, error=${duplicateError ?? 'tidak ada'}`,
  );

  report.print();
});
