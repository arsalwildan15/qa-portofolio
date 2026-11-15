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
 *   post milik karyawan lain.
 *
 *   PRASYARAT DIBANGUN SENDIRI (2026-11-15): versi lama memakai post seed
 *   di feed; demo sempat dikosongkan total (GET buzz/feed meta.total=0,
 *   confirmed live) sehingga TC gagal "totalCards=0". Kini akun ESS
 *   sungguhan dibuat & login di sesi terpisah, membuat post, lalu Admin
 *   like + comment pada post tsb -> lintas user yg sebenarnya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/engagement/TC-BUZZ-15-Verify-Interact-With-Other-Employee-Post.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';
import { BuzzPage } from '../../../src/pages';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';

test('TC-BUZZ-15: liking and commenting on another employee\'s existing post works', async ({
  page,
  browser,
  buzzPage,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-BUZZ-15', 'Interact With Other Employee Post', env.baseURL, page);

  report.step('Setup: akun ESS (karyawan lain) membuat post teks di Buzz');
  const marker = uniqueName('QaOtherEmpPost');
  const ess = await createEssAccount(page, addEmployeePage, 'QaBuzzOther');
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);
  const essBuzz = new BuzzPage(essPage);
  await essBuzz.goto();
  const created = await essBuzz.submitTextPost(marker);
  report.check('[API] Post milik ESS tersimpan (200)', created?.status() === 200, `status=${created?.status()}`);

  report.step('Admin membuka Buzz dan menemukan post milik ESS tsb');
  await buzzPage.goto();
  const otherCard = buzzPage.cardByText(marker).first();
  report.check('Post karyawan lain tampil di feed Admin', await isVisibleWithWait(otherCard, 15_000));

  report.step('Klik Like pada post tersebut, verify counter berubah');
  const statsBefore = await buzzPage.statsText(otherCard).first().innerText().catch(() => '?');
  await buzzPage.likeControl(otherCard).click({ force: true });
  await page.waitForTimeout(1500);
  const statsAfter = await buzzPage.statsText(otherCard).first().innerText().catch(() => '?');
  report.check(
    'Like pada post milik employee lain berhasil (counter berubah)',
    statsBefore !== statsAfter && /\d/.test(statsAfter) && (parseInt(statsAfter, 10) || 0) > (parseInt(statsBefore, 10) || 0),
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
    await isVisibleWithWait(page.getByText(commentText).first(), 5000),
  );

  await close();
  report.print();
});
