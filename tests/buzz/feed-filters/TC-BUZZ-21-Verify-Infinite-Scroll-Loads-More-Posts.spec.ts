/**
 * ================================================================================
 * TC-BUZZ-21: Verify Infinite Scroll Loads More Posts
 * Modul    : Buzz
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-21-Verify-Infinite-Scroll-Loads-More-Posts.spec.ts
 * Path     : tests/buzz/feed-filters/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi feed Buzz memuat lebih banyak post saat di-scroll ke
 *   bawah (infinite scroll, bukan "Load More" button -- dikonfirmasi
 *   TIDAK ADA tombol seperti itu di UI ini). Awalnya feed memuat 10
 *   post (limit=10&offset=0); scroll ke bawah memicu
 *   GET /api/v2/buzz/feed?limit=10&offset=10 dan menambah jumlah
 *   card yang ter-render. Belum pernah diuji sama sekali sebelumnya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/feed-filters/TC-BUZZ-21-Verify-Infinite-Scroll-Loads-More-Posts.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-BUZZ-21: scrolling down the Buzz feed loads more posts via offset-based pagination', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-BUZZ-21', 'Infinite Scroll Loads More Posts', env.baseURL, page);

  report.step('Buka Buzz, catat jumlah post awal yg ter-render');
  await buzzPage.goto();
  await page.waitForTimeout(2500);
  const initialCount = await buzzPage.postCards.count();

  let nextPageRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'GET' && /\/api\/v2\/buzz\/feed\?.*offset=(?!0\b)\d+/.test(req.url())) {
      nextPageRequestFired = true;
    }
  });

  report.step('Scroll ke bawah feed, verify request halaman berikutnya terpicu dan jumlah post bertambah');
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(2500);
  const afterScrollCount = await buzzPage.postCards.count();

  report.check('Scroll memicu GET /api/v2/buzz/feed dgn offset > 0 (bukan offset=0 lagi)', nextPageRequestFired);
  report.check(
    'Jumlah post card bertambah setelah scroll (infinite scroll berfungsi)',
    afterScrollCount > initialCount,
    `initialCount=${initialCount} afterScrollCount=${afterScrollCount}`,
  );

  report.print();
});
