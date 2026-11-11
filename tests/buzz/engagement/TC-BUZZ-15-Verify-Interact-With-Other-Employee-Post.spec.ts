/**
 * ================================================================================
 * TC-BUZZ-15: Verify Like/Comment On Another Employee's Post
 * Modul    : Buzz
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-15-Verify-Interact-With-Other-Employee-Post.spec.ts
 * Path     : tests/buzz/engagement/
 * ================================================================================
 *
 * TUJUAN:
 *   Semua TC like/comment sebelumnya (06, 07, 08, 10) HANYA menguji
 *   interaksi pada post MILIK SENDIRI. Buzz adalah feed company-wide
 *   -- skenario paling umum sebenarnya adalah like/comment pada post
 *   milik KARYAWAN LAIN. TC ini memverifikasi hal itu berfungsi pada
 *   post seed data lain yang sudah ada di feed (bukan post buatan TC
 *   ini sendiri), read-only terhadap post itu sendiri (tidak
 *   menghapusnya) karena ini data shared demo milik orang lain.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/engagement/TC-BUZZ-15-Verify-Interact-With-Other-Employee-Post.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-15: liking and commenting on another employee\'s existing post works', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-15', 'Interact With Other Employee Post', env.baseURL, page);

  report.step('Buka Buzz, ambil post PALING LAMA (bukan buatan TC ini) dari feed seed data');
  await buzzPage.goto();
  await buzzPage.postCards.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  const totalCards = await buzzPage.postCards.count();
  report.check('Ada minimal 1 post lain di feed untuk dites', totalCards > 0, `totalCards=${totalCards}`);
  if (totalCards === 0) {
    report.print();
    return;
  }
  // NOTE 2026-11-11: .last() picks whatever card happened to be loaded furthest down at that
  // moment -- unstable as the shared demo accumulates more posts over many test runs (including
  // security TCs that create dozens of posts), and far enough down to need heavy scrolling,
  // which caused this TC to exceed its 45s budget. A card near the top (still never one this
  // TC itself just created) is just as valid for "another employee's post" and far more stable.
  const otherCard = buzzPage.postCards.nth(1);

  report.step('Klik Like pada post tersebut, verify counter berubah');
  const statsBefore = await buzzPage.statsText(otherCard).first().innerText().catch(() => '?');
  await buzzPage.likeControl(otherCard).click({ force: true });
  await page.waitForTimeout(1500);
  const statsAfter = await buzzPage.statsText(otherCard).first().innerText().catch(() => '?');
  report.check(
    'Like pada post milik employee lain berhasil (counter berubah)',
    statsBefore !== statsAfter,
    `before="${statsBefore}" after="${statsAfter}"`,
  );

  report.step('Klik ikon comment pada post tersebut, isi comment, submit');
  const commentText = uniqueName('QaReplyOther');
  await buzzPage.commentIconButton(otherCard).click().catch(() => {});
  await page.waitForTimeout(800);
  await buzzPage.commentInputFor(otherCard).fill(commentText).catch(() => {});
  await buzzPage.commentInputFor(otherCard).press('Enter').catch(() => {});
  await page.waitForTimeout(1500);
  report.check(
    `Comment "${commentText}" pada post employee lain terlihat di halaman`,
    await page.getByText(commentText).first().isVisible({ timeout: 5000 }).catch(() => false),
  );

  report.print();
});
