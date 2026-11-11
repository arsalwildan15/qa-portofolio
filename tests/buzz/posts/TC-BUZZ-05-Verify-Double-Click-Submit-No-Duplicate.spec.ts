/**
 * ================================================================================
 * TC-BUZZ-05: Verify Double-Click Submit Does Not Duplicate Post
 * Modul    : Buzz
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-05-Verify-Double-Click-Submit-No-Duplicate.spec.ts
 * Path     : tests/buzz/posts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik ganda cepat pada tombol Post TIDAK membuat 2
 *   post identik tersimpan (race condition di sisi client).
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/posts/TC-BUZZ-05-Verify-Double-Click-Submit-No-Duplicate.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-05: rapid double-click on Post does not create duplicate posts', async ({ page, buzzPage }, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-BUZZ-05', 'Double-Click Submit No Duplicate', env.baseURL, page);
  const marker = uniqueName('QaBuzzDouble');

  report.step('Isi composer, klik Post 2x secepat mungkin');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.postTextarea.fill(marker);

  let postCount = 0;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/buzz/posts')) postCount++;
  });
  await Promise.all([buzzPage.submitPostButton.click(), buzzPage.submitPostButton.click({ timeout: 2000 }).catch(() => {})]);
  await page.waitForTimeout(2500);

  report.step('Verify jumlah POST request dan jumlah card di feed');
  report.check('Jumlah POST /api/v2/buzz/posts terkirim === 1 (bukan 2)', postCount === 1, `postCount=${postCount}`);
  await buzzPage.goto();
  await page.waitForTimeout(1500);
  const cardCount = await buzzPage.cardByText(marker).count();
  report.check(`Card dengan teks "${marker}" muncul tepat 1 kali di feed`, cardCount === 1, `cardCount=${cardCount}`);

  report.print();
});
