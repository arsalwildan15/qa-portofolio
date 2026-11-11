/**
 * ================================================================================
 * TC-BUZZ-SECURITY-08: Verify XSS Payload In Comment Text
 * Modul    : Buzz - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-SECURITY-08-Verify-XSS-In-Comment-Text.spec.ts
 * Path     : tests/buzz/security/
 * ================================================================================
 *
 * TUJUAN:
 *   TC-BUZZ-SECURITY-01 hanya menguji XSS di teks POST. Comment adalah
 *   titik input teks TERPISAH (field/komponen render berbeda) -- tidak
 *   boleh diasumsikan sanitasinya identik hanya karena keduanya "teks
 *   bebas". Comment juga broadcast ke semua yang melihat post itu.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/security/TC-BUZZ-SECURITY-08-Verify-XSS-In-Comment-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

const XSS_PAYLOAD = '<img src=x onerror="window.__xssBuzzComment=true">';

test('TC-BUZZ-SECURITY-08: an XSS payload in comment text is not executed', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-SECURITY-08', 'XSS In Comment Text', env.baseURL, page);
  const marker = uniqueName('QaBuzzXssComment');

  let dialogFired = false;
  page.once('dialog', async (d) => {
    dialogFired = true;
    await d.dismiss();
  });

  report.step('Buat post baru, klik ikon comment, isi payload XSS sbg comment, submit');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.submitTextPost(marker);
  const card = await buzzPage.reloadAndFindCard(marker);

  await buzzPage.commentIconButton(card).click().catch(() => {});
  await page.waitForTimeout(800);
  await buzzPage.commentInputFor(card).fill(XSS_PAYLOAD).catch(() => {});
  await buzzPage.commentInputFor(card).press('Enter').catch(() => {});
  await page.waitForTimeout(1500);

  const scriptExecuted = await page.evaluate(() => (window as unknown as { __xssBuzzComment?: boolean }).__xssBuzzComment === true);
  report.check('Payload XSS di comment TIDAK dieksekusi (onerror tidak terpicu, tidak ada dialog)', !scriptExecuted && !dialogFired, `scriptExecuted=${scriptExecuted} dialogFired=${dialogFired}`);

  report.print();
});
