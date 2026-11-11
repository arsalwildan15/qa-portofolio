/**
 * ================================================================================
 * TC-BUZZ-08: Verify Empty Comment Is Blocked
 * Modul    : Buzz
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-08-Verify-Empty-Comment-Blocked.spec.ts
 * Path     : tests/buzz/engagement/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menekan Enter pada comment box yang kosong TIDAK
 *   membuat comment kosong tersimpan / counter tidak bertambah.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/engagement/TC-BUZZ-08-Verify-Empty-Comment-Blocked.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-08: pressing Enter on an empty comment box does not add a comment', async ({ page, buzzPage }, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-08', 'Empty Comment Blocked', env.baseURL, page);
  const marker = uniqueName('QaBuzzEmptyComment');

  report.step('Buat post baru, klik ikon comment, LANGSUNG tekan Enter tanpa isi apa pun');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.submitTextPost(marker);
  const card = await buzzPage.reloadAndFindCard(marker);
  const statsBefore = await buzzPage.statsText(card).nth(1).innerText().catch(() => '?');

  let commentCallFired = false;
  page.on('request', (req) => {
    if (req.method() !== 'GET' && req.url().includes('/api/') && /comment/i.test(req.url())) commentCallFired = true;
  });

  await buzzPage.commentIconButton(card).click().catch(() => {});
  await page.waitForTimeout(800);
  const commentInput = buzzPage.commentInputFor(card);
  await commentInput.press('Enter').catch(() => {});
  await page.waitForTimeout(1500);

  const statsAfter = await buzzPage.statsText(card).nth(1).innerText().catch(() => '?');
  report.check(
    'Comment kosong TIDAK terkirim (stats tidak berubah, tidak ada API call comment)',
    statsBefore === statsAfter && !commentCallFired,
    `before="${statsBefore}" after="${statsAfter}" commentApiCallDetected=${commentCallFired}`,
  );

  report.print();
});
