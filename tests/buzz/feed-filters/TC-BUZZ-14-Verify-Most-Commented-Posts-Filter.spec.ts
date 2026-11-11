/**
 * ================================================================================
 * TC-BUZZ-14: Verify "Most Commented Posts" Filter Tab
 * Modul    : Buzz
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-14-Verify-Most-Commented-Posts-Filter.spec.ts
 * Path     : tests/buzz/feed-filters/
 * ================================================================================
 *
 * TUJUAN:
 *   Sama seperti TC-BUZZ-13 tapi untuk tab "Most Commented Posts" --
 *   titik filter TERPISAH, tidak boleh diasumsikan berperilaku sama
 *   hanya karena "Most Liked Posts" sudah terbukti berfungsi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/feed-filters/TC-BUZZ-14-Verify-Most-Commented-Posts-Filter.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-BUZZ-14: clicking "Most Commented Posts" re-fetches and re-renders the feed', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-BUZZ-14', 'Most Commented Posts Filter', env.baseURL, page);

  report.step('Buka Buzz, klik tab "Most Commented Posts"');
  await buzzPage.goto();
  await page.waitForTimeout(2000);

  // NOTE 2026-11-11: switching filter tabs calls a DIFFERENT endpoint than the default load --
  // /api/v2/buzz/feed?sortField=... (not /api/v2/buzz/posts) -- confirmed via live network
  // inspection on TC-BUZZ-13. Matching only "/buzz/posts" silently missed this.
  let feedRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'GET' && /\/api\/v2\/buzz\/(posts|feed)/.test(req.url())) feedRequestFired = true;
  });
  await buzzPage.mostCommentedTab.click();
  await page.waitForTimeout(3000);

  report.check('Klik tab memicu GET /api/v2/buzz/posts atau /feed (fetch ulang feed)', feedRequestFired);
  report.check('Tab "Most Commented Posts" menjadi tab aktif (class warn/active)', await buzzPage.mostCommentedTab.evaluate((el) => el.className.includes('warn')));
  report.check('Minimal 1 post card tampil setelah ganti filter', (await buzzPage.postCards.count()) > 0);

  report.print();
});
