/**
 * ================================================================================
 * TC-BUZZ-17: Verify Refresh During Pending Save Request
 * Modul    : Buzz
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-17-Verify-Refresh-During-Pending-Save-Request.spec.ts
 * Path     : tests/buzz/posts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi apa yang terjadi kalau user me-refresh halaman TEPAT
 *   SAAT request POST create-post masih pending. Risiko LEBIH BESAR
 *   di sini dibanding modul lain: kalau post sempat ter-create di
 *   server, langsung ter-broadcast ke SELURUH karyawan, bukan cuma
 *   1 record.
 *
 * TEKNIK:
 *   POST /api/v2/buzz/posts di-intercept via page.route() dan DITUNDA
 *   4 detik sebelum diteruskan ke server asli.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/posts/TC-BUZZ-17-Verify-Refresh-During-Pending-Save-Request.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-17: refreshing while the create-post request is pending does not create a duplicate broadcast post', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-17', 'Refresh During Pending Save Request', env.baseURL, page);
  const marker = uniqueName('QaRefreshBuzz');

  report.step('Isi composer, intercept+tunda POST posts 4 detik, klik Post TANPA menunggu response');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.postTextarea.fill(marker);

  await page.route('**/api/v2/buzz/posts', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4_000));
    await route.continue().catch(() => {});
  });
  void buzzPage.submitPostButton.click().catch(() => {});
  await page.waitForTimeout(800);

  report.step('Reload halaman SAAT request masih pending (sebelum 4 detik delay selesai)');
  await page.reload().catch((e) => {
    report.finding('Reload menyela navigasi/request yang sedang pending', String(e).slice(0, 150));
  });
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(3000);

  report.step(`Verify post "${marker}" muncul TEPAT 0 atau 1 kali di feed (bukan ganda)`);
  await page.unroute('**/api/v2/buzz/posts');
  await page.reload();
  await page.waitForTimeout(2500);
  const count = await buzzPage.cardByText(marker).count();
  report.finding(
    'Hasil refresh saat save pending',
    `Post muncul ${count}x di feed setelah refresh mid-request (0 = request batal total, 1 = ` +
      'tersimpan sukses meski UI tidak sempat konfirmasi -- keduanya wajar; >1 akan jadi BUG nyata, ' +
      'dgn dampak broadcast company-wide ganda).',
  );
  report.check(`Post "${marker}" TIDAK muncul lebih dari 1 kali (tidak ada duplikat)`, count <= 1, `count=${count}`);

  report.print();
});
