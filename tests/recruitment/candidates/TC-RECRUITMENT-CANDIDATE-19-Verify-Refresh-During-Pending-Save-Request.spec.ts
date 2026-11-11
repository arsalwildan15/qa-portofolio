/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-19: Verify Refresh During Pending Save Request
 * Modul    : Recruitment - Candidates
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-19-Verify-Refresh-During-Pending-Save-Request.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi apa yang terjadi kalau user me-refresh halaman TEPAT
 *   SAAT request POST create-candidate masih pending. Risiko: candidate
 *   bisa ter-SIMPAN di server padahal UI tidak sempat konfirmasi, dan
 *   kalau user mengulang aksi yang sama, berpotensi membuat candidate
 *   duplikat dengan email persis sama.
 *
 * TEKNIK:
 *   POST /api/v2/recruitment/candidates di-intercept via page.route()
 *   dan DITUNDA 4 detik sebelum diteruskan ke server asli.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-19-Verify-Refresh-During-Pending-Save-Request.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-CANDIDATE-19: refreshing while the create-candidate request is pending does not create a duplicate', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-19', 'Refresh During Pending Save Request', env.baseURL, page);
  const firstName = uniqueName('QaRefreshCand');
  const lastName = 'Doe';
  const email = `${firstName.toLowerCase()}@example.com`;

  report.step('Isi form candidate valid, intercept+tunda POST candidates 4 detik, klik Save TANPA menunggu response');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.emailInput.fill(email);

  await page.route('**/api/v2/recruitment/candidates', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4_000));
    await route.continue().catch(() => {});
  });
  void candidatesPage.save().catch(() => {});
  await page.waitForTimeout(800);

  report.step('Reload halaman SAAT request masih pending (sebelum 4 detik delay selesai)');
  await page.reload().catch((e) => {
    report.finding('Reload menyela navigasi/request yang sedang pending', String(e).slice(0, 150));
  });
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(3000);

  report.step(`Verify candidate "${firstName} ${lastName}" muncul TEPAT 0 atau 1 kali di list (bukan ganda)`);
  await page.unroute('**/api/v2/recruitment/candidates');
  await candidatesPage.goto();
  await candidatesPage.gotoLastPage();
  const count = await candidatesPage.rowByText(firstName).count();
  report.finding(
    'Hasil refresh saat save pending',
    `Candidate muncul ${count}x di list setelah refresh mid-request (0 = request batal total, 1 = ` +
      'tersimpan sukses meski UI tidak sempat konfirmasi -- keduanya wajar; >1 akan jadi BUG nyata).',
  );
  report.check(
    `Candidate "${firstName} ${lastName}" TIDAK muncul lebih dari 1 kali (tidak ada duplikat)`,
    count <= 1,
    `count=${count}`,
  );

  report.print();
});
