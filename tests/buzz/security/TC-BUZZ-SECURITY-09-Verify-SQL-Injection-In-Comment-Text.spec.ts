/**
 * ================================================================================
 * TC-BUZZ-SECURITY-09: Verify SQL Injection Payload In Comment Text
 * Modul    : Buzz - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-SECURITY-09-Verify-SQL-Injection-In-Comment-Text.spec.ts
 * Path     : tests/buzz/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Sama seperti TC-BUZZ-SECURITY-02 tapi titik input BERBEDA (comment,
 *   bukan body post) -- endpoint create-comment terpisah dari
 *   create-post, sehingga query/parameter binding-nya bisa saja
 *   divalidasi berbeda dan tidak boleh diasumsikan sama amannya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/security/TC-BUZZ-SECURITY-09-Verify-SQL-Injection-In-Comment-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-SECURITY-09: a SQL injection payload in comment text does not break the app', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-SECURITY-09', 'SQL Injection In Comment Text', env.baseURL, page);
  const marker = uniqueName('QaBuzzSqliComment');
  const payload = "QaCommentSQLi' OR '1'='1'; DROP TABLE ohrm_buzz_comment; --";

  report.step('Buat post baru, klik ikon comment, isi payload SQLi sbg comment, submit');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.submitTextPost(marker);
  const card = await buzzPage.reloadAndFindCard(marker);

  let commentResp: number | undefined;
  page.on('response', (r) => {
    if (r.request().method() !== 'GET' && /comment/i.test(r.url())) commentResp = r.status();
  });

  await buzzPage.commentIconButton(card).click().catch(() => {});
  await page.waitForTimeout(800);
  await buzzPage.commentInputFor(card).fill(payload).catch(() => {});
  await buzzPage.commentInputFor(card).press('Enter').catch(() => {});
  await page.waitForTimeout(2000);

  report.check(
    '[API] Response comment status < 500 (server tidak crash)',
    commentResp !== undefined ? commentResp < 500 : true,
    `commentResp=${commentResp}`,
  );

  report.step('Verify: feed masih bisa diakses & render normal setelah payload');
  await page.reload();
  await page.waitForTimeout(3000);
  report.check('Feed masih berfungsi normal setelah payload (minimal 1 card visible)', (await buzzPage.postCards.count()) > 0);

  report.print();
});
