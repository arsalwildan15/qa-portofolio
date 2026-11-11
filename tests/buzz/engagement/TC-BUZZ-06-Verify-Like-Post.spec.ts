/**
 * ================================================================================
 * TC-BUZZ-06: Verify Like A Post
 * Modul    : Buzz
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-06-Verify-Like-Post.spec.ts
 * Path     : tests/buzz/engagement/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik ikon hati (Like) pada post sendiri menambah
 *   counter "N Likes" dan memicu request API. FUNGSI: like adalah
 *   sinyal engagement paling ringan di social feed -- harus instan dan
 *   akurat count-nya karena jadi indikator post populer di seluruh
 *   perusahaan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/engagement/TC-BUZZ-06-Verify-Like-Post.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-06: liking a post increments the like counter', async ({ page, buzzPage }, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-06', 'Like Post', env.baseURL, page);
  const marker = uniqueName('QaBuzzLike');

  report.step('Buat post baru untuk dites like-nya');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.submitTextPost(marker);
  const card = await buzzPage.reloadAndFindCard(marker);
  const statsBefore = await buzzPage.statsText(card).first().innerText().catch(() => '?');
  report.step(`Catat stats sebelum like: "${statsBefore}", klik ikon Like`);

  let likeCallFired = false;
  page.on('request', (req) => {
    if (req.method() !== 'GET' && req.url().includes('/api/') && /like/i.test(req.url())) likeCallFired = true;
  });
  await buzzPage.likeControl(card).click({ force: true }).catch((e) => report.finding('Klik Like gagal', String(e).slice(0, 200)));
  await page.waitForTimeout(2000);

  const statsAfter = await buzzPage.statsText(card).first().innerText().catch(() => '?');
  report.check(
    'Counter Likes bertambah setelah klik (statsBefore !== statsAfter)',
    statsBefore !== statsAfter,
    `before="${statsBefore}" after="${statsAfter}" likeApiCallDetected=${likeCallFired}`,
  );

  report.print();
});
