/**
 * ================================================================================
 * TC-BUZZ-12: Verify Sharing A Post Increments The Shares Counter
 * Modul    : Buzz
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-12-Verify-Share-Post-Increments-Counter.spec.ts
 * Path     : tests/buzz/engagement/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik ikon Share membuka dialog "Share Post" dan
 *   mengkonfirmasi share benar-benar menambah counter "N Shares" pada
 *   post asli. FUNGSI: share adalah mekanisme amplifikasi konten di
 *   feed company-wide -- kalau counter tidak bertambah, metrik
 *   engagement yang dilihat seluruh karyawan jadi tidak akurat.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/engagement/TC-BUZZ-12-Verify-Share-Post-Increments-Counter.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-12: sharing a post increments its Shares counter', async ({ page, buzzPage }, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-12', 'Share Post Increments Counter', env.baseURL, page);
  const marker = uniqueName('QaBuzzShare');

  report.step('Buat post baru, catat stats Shares, klik ikon Share, submit dialog Share Post');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.submitTextPost(marker);
  const card = await buzzPage.reloadAndFindCard(marker);

  const statsBefore = await buzzPage.statsText(card).nth(1).innerText().catch(() => '?');
  await buzzPage.shareButton(card).click();
  await page.waitForTimeout(600);
  await buzzPage.submitShare();
  await page.waitForTimeout(2000);

  report.step('Reload dan verify counter Shares pada post asli bertambah');
  const cardAfter = await buzzPage.reloadAndFindCard(marker);
  const statsAfter = await buzzPage.statsText(cardAfter).nth(1).innerText().catch(() => '?');
  report.check(
    'Counter Shares bertambah setelah share (statsBefore !== statsAfter)',
    statsBefore !== statsAfter,
    `before="${statsBefore}" after="${statsAfter}"`,
  );

  report.print();
});
