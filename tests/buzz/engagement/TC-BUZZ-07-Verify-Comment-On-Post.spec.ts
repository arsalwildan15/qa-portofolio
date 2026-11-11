/**
 * ================================================================================
 * TC-BUZZ-07: Verify Comment On A Post
 * Modul    : Buzz
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-07-Verify-Comment-On-Post.spec.ts
 * Path     : tests/buzz/engagement/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah comment pada post sendiri berhasil tersimpan
 *   dan counter "N Comments" bertambah.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/engagement/TC-BUZZ-07-Verify-Comment-On-Post.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-07: commenting on a post increments the comment counter', async ({ page, buzzPage }, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-07', 'Comment On Post', env.baseURL, page);
  const marker = uniqueName('QaBuzzComment');
  const commentText = uniqueName('QaComment');

  report.step('Buat post baru, klik ikon comment, isi komentar, submit');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.submitTextPost(marker);
  const card = await buzzPage.reloadAndFindCard(marker);
  const statsBefore = await buzzPage.statsText(card).nth(1).innerText().catch(() => '?');

  let commentCallFired = false;
  page.on('request', (req) => {
    if (req.method() !== 'GET' && req.url().includes('/api/') && /comment/i.test(req.url())) commentCallFired = true;
  });

  await buzzPage.commentIconButton(card).click().catch((e) => report.finding('Klik ikon Comment gagal', String(e).slice(0, 200)));
  await page.waitForTimeout(800);
  const commentInput = buzzPage.commentInputFor(card);
  await commentInput.fill(commentText).catch((e) => report.finding('Isi comment input gagal', String(e).slice(0, 200)));
  await commentInput.press('Enter').catch(() => {});
  await page.waitForTimeout(2000);

  const statsAfter = await buzzPage.statsText(card).nth(1).innerText().catch(() => '?');
  report.check(
    'Counter Comments bertambah setelah submit comment',
    statsBefore !== statsAfter,
    `before="${statsBefore}" after="${statsAfter}" commentApiCallDetected=${commentCallFired}`,
  );
  report.check(
    `Teks comment "${commentText}" terlihat di halaman`,
    await page.getByText(commentText).first().isVisible({ timeout: 5000 }).catch(() => false),
  );

  report.print();
});
