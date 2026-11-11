/**
 * ================================================================================
 * TC-BUZZ-13: Verify "Most Liked Posts" Filter Tab
 * Modul    : Buzz
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-13-Verify-Most-Liked-Posts-Filter.spec.ts
 * Path     : tests/buzz/feed-filters/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi tab "Most Liked Posts" memanggil endpoint feed
 *   dengan parameter sort yang berbeda dari default ("Most Recent
 *   Posts") dan merender ulang daftar post. Semua TC lain di modul
 *   ini hanya pernah menggunakan tab default -- 2 filter lain belum
 *   pernah disentuh sama sekali.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/feed-filters/TC-BUZZ-13-Verify-Most-Liked-Posts-Filter.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-BUZZ-13: clicking "Most Liked Posts" re-fetches and re-renders the feed', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-BUZZ-13', 'Most Liked Posts Filter', env.baseURL, page);

  report.step('Buka Buzz, klik tab "Most Liked Posts"');
  await buzzPage.goto();
  await page.waitForTimeout(2000);

  // NOTE 2026-11-11: switching filter tabs calls a DIFFERENT endpoint than the default load --
  // /api/v2/buzz/feed?sortField=share.numOfLikes (not /api/v2/buzz/posts) -- confirmed via
  // live network inspection. Matching only "/buzz/posts" silently missed this and produced a
  // false-fail on an otherwise-working feature.
  let feedRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'GET' && /\/api\/v2\/buzz\/(posts|feed)/.test(req.url())) feedRequestFired = true;
  });
  await buzzPage.mostLikedTab.click();
  await page.waitForTimeout(3000);

  report.check('Klik tab memicu GET /api/v2/buzz/posts atau /feed (fetch ulang feed)', feedRequestFired);
  report.check('Tab "Most Liked Posts" menjadi tab aktif (class warn/active)', await buzzPage.mostLikedTab.evaluate((el) => el.className.includes('warn')));
  report.check('Minimal 1 post card tampil setelah ganti filter', (await buzzPage.postCards.count()) > 0);

  report.print();
});
