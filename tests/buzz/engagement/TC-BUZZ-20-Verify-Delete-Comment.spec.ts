/**
 * ================================================================================
 * TC-BUZZ-20: Verify Delete Comment
 * Modul    : Buzz
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-20-Verify-Delete-Comment.spec.ts
 * Path     : tests/buzz/engagement/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi link "Delete" pada comment benar-benar menghapusnya
 *   via DELETE /api/v2/buzz/shares/<postId>/comments/<commentId> (bukan
 *   /posts/<id>/comments seperti diduga -- "shares" adalah nama internal
 *   endpoint utk post, dikonfirmasi live), dan counter "N Comments"
 *   kembali berkurang. Comment punya link aksi "Like"/"Edit"/"Delete"
 *   SENDIRI, terpisah dari kebab menu post -- belum pernah diuji sama
 *   sekali sebelumnya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/engagement/TC-BUZZ-20-Verify-Delete-Comment.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-20: deleting a comment removes it and decrements the comment counter', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-20', 'Delete Comment', env.baseURL, page);
  const marker = uniqueName('QaDeleteCommentTC');
  const commentText = uniqueName('QaCommentWillBeDeleted');

  report.step('Buat post baru, tambah comment, catat stats sebelum delete');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.submitTextPost(marker);
  const card = await buzzPage.reloadAndFindCard(marker);

  await buzzPage.commentIconButton(card).click();
  await page.waitForTimeout(800);
  await buzzPage.commentInputFor(card).fill(commentText);
  await buzzPage.commentInputFor(card).press('Enter');
  await page.waitForTimeout(1500);
  report.check(
    `Comment "${commentText}" terlihat sebelum delete`,
    await page.getByText(commentText).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );
  const statsBefore = await buzzPage.statsText(card).nth(1).innerText().catch(() => '?');

  report.step('Klik "Delete" pada comment, konfirmasi dialog "Yes, Delete"');
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => /\/comments\/\d+/.test(r.url()) && r.request().method() === 'DELETE',
      { timeout: 10_000 },
    ),
    buzzPage.confirmDeleteComment(card),
  ]);
  report.check('[API] DELETE comment status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.step('Verify comment hilang dan counter berkurang');
  await page.waitForTimeout(1500);
  report.check(`Comment "${commentText}" TIDAK terlihat lagi`, (await page.getByText(commentText).count()) === 0);
  const statsAfter = await buzzPage.statsText(card).nth(1).innerText().catch(() => '?');
  report.check(
    'Counter Comments berkurang setelah delete (statsBefore !== statsAfter)',
    statsBefore !== statsAfter,
    `before="${statsBefore}" after="${statsAfter}"`,
  );

  report.print();
});
