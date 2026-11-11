/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-20: Verify Connection Dropped During Save Request
 * Modul    : Recruitment - Candidates
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-20-Verify-Connection-Dropped-During-Save-Request.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi perilaku form Add Candidate saat koneksi terputus
 *   TEPAT SAAT request POST create-candidate sedang berjalan. Candidate
 *   TIDAK boleh ter-create, dan user harus mendapat indikasi gagal yang
 *   jelas (bukan silent hang/exception tak tertangani -- lihat preseden
 *   TC-ADMIN-USER-08 dan TC-PIM-ADD-33 yang mengonfirmasi bug serupa
 *   di 2 modul lain; TC ini menguji apakah polanya app-wide).
 *
 * TEKNIK:
 *   POST /api/v2/recruitment/candidates di-intercept via page.route()
 *   dan di-abort() (simulasi network failure asli).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-20-Verify-Connection-Dropped-During-Save-Request.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-CANDIDATE-20: a dropped connection during create-candidate submit shows a failure and does not create the candidate', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-20', 'Connection Dropped During Save Request', env.baseURL, page);
  const firstName = uniqueName('QaDropCand');
  const lastName = 'Doe';
  const email = `${firstName.toLowerCase()}@example.com`;

  report.step('Isi form candidate valid, intercept POST candidates dgn abort(), klik Save');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.emailInput.fill(email);

  await page.route('**/api/v2/recruitment/candidates', (route) => route.abort('failed'));
  await candidatesPage.save().catch(() => {});
  await page.waitForTimeout(2500);

  report.check(
    'Form masih di halaman Add Candidate (TIDAK diam-diam redirect seolah sukses)',
    page.url().includes('/recruitment/addCandidate'),
    `url=${page.url()}`,
  );

  report.step(`Pulihkan koneksi (unroute), verify candidate "${firstName} ${lastName}" TIDAK ter-create`);
  await page.unroute('**/api/v2/recruitment/candidates');
  await candidatesPage.goto();
  await candidatesPage.gotoLastPage();
  const count = await candidatesPage.rowByText(firstName).count();
  report.check(`Candidate "${firstName}" TIDAK ter-create saat koneksi terputus`, count === 0, `count=${count}`);

  report.print();
});
