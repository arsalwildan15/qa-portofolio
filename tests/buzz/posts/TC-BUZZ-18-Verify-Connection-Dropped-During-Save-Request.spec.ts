/**
 * ================================================================================
 * TC-BUZZ-18: Verify Connection Dropped During Save Request
 * Modul    : Buzz
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-18-Verify-Connection-Dropped-During-Save-Request.spec.ts
 * Path     : tests/buzz/posts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi perilaku composer Buzz saat koneksi terputus TEPAT
 *   SAAT request POST create-post sedang berjalan. Post TIDAK boleh
 *   ter-create, dan user harus mendapat indikasi gagal yang jelas --
 *   lihat preseden TC-ADMIN-USER-08/TC-PIM-ADD-33/
 *   TC-RECRUITMENT-CANDIDATE-20 yang SEMUANYA mengonfirmasi bug
 *   identik ("Uncaught exception: fe") di 3 modul lain; TC ini
 *   melengkapi bukti apakah ini benar2 bug app-wide.
 *
 * TEKNIK:
 *   POST /api/v2/buzz/posts di-intercept via page.route() dan
 *   di-abort() (simulasi network failure asli).
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/posts/TC-BUZZ-18-Verify-Connection-Dropped-During-Save-Request.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-18: a dropped connection during create-post submit shows a failure and does not broadcast the post', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-18', 'Connection Dropped During Save Request', env.baseURL, page);
  const marker = uniqueName('QaDropBuzz');

  report.step('Isi composer, intercept POST posts dgn abort(), klik Post');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.postTextarea.fill(marker);

  await page.route('**/api/v2/buzz/posts', (route) => route.abort('failed'));
  await buzzPage.submitPostButton.click().catch(() => {});
  await page.waitForTimeout(2500);

  report.step(`Pulihkan koneksi (unroute), verify post "${marker}" TIDAK ter-broadcast ke feed`);
  await page.unroute('**/api/v2/buzz/posts');
  await page.reload();
  await page.waitForTimeout(2500);
  const count = await buzzPage.cardByText(marker).count();
  report.check(`Post "${marker}" TIDAK ter-create saat koneksi terputus`, count === 0, `count=${count}`);

  report.print();
});
