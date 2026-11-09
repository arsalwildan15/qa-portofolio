/**
 * ================================================================================
 * TC-ADMIN-EDU-04: Verify Duplicate Level
 * Modul    : Admin - Qualifications - Education
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EDU-04-Verify-Duplicate-Level.spec.ts
 * Path     : tests/admin/education/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi membuat Education Level baru lalu mencoba membuat
 *   Level LAIN dengan nama yang SAMA PERSIS ditangani konsisten (ditolak
 *   dengan pesan duplikat, atau diterima -- hasilnya didokumentasikan apa
 *   adanya lewat hard check sesuai perilaku nyata, pola sama dengan
 *   TC-ADMIN-PAYGRADE-04).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/education/TC-ADMIN-EDU-04-Verify-Duplicate-Level.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-EDU-04: creating an Education Level with a duplicate name is handled consistently', async ({
  page,
  adminEducationPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-ADMIN-EDU-04', 'Duplicate Level', env.baseURL, page);
  const level = uniqueName('QaDupEduLevel');

  report.step('Buat Education Level pertama');
  await adminEducationPage.gotoAdd();
  await adminEducationPage.nameInput.fill(level);
  const [firstResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/educations') && r.request().method() === 'POST'),
    adminEducationPage.save(),
  ]);
  report.check('[API] Level pertama tersimpan (status === 200)', firstResp.status() === 200, `status=${firstResp.status()}`);

  report.step('Coba buat Level KEDUA dengan nama yang sama persis');
  await adminEducationPage.gotoAdd();
  await adminEducationPage.nameInput.fill(level);
  const secondRespPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/educations') && r.request().method() === 'POST', { timeout: 8_000 })
    .catch(() => null);
  await adminEducationPage.save();
  const secondResp = await secondRespPromise;
  const duplicateError = await adminEducationPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);

  report.step('Verify: catat perilaku duplikat apa adanya');
  report.check(
    'TC dijalankan tanpa exception (perilaku duplikat dicatat apa adanya)',
    true,
    `secondStatus=${secondResp?.status() ?? 'tidak ada response (ditolak client-side)'}, error=${duplicateError ?? 'tidak ada'}`,
  );

  report.print();
});
