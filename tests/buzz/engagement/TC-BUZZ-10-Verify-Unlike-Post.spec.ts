/**
 * ================================================================================
 * TC-BUZZ-10: Verify Unlike A Post (Toggle Like Off)
 * Modul    : Buzz
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-10-Verify-Unlike-Post.spec.ts
 * Path     : tests/buzz/engagement/
 * ================================================================================
 *
 * TUJUAN:
 *   Melengkapi TC-BUZZ-06 (yang hanya menguji like dari 0 -> 1): klik
 *   ikon like SEKALI LAGI pada post yang sudah di-like harus meng-
 *   HAPUS like (toggle off), bukan menambah lagi. Kalau counter malah
 *   bertambah terus menerus, itu bug.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/engagement/TC-BUZZ-10-Verify-Unlike-Post.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-10: clicking Like a second time removes the like (toggle off)', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-10', 'Unlike Post', env.baseURL, page);
  const marker = uniqueName('QaBuzzUnlike');

  report.step('Buat post baru, klik Like (0->1), lalu klik Like lagi (1->0)');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.submitTextPost(marker);
  const card = await buzzPage.reloadAndFindCard(marker);

  const statsInitial = await buzzPage.statsText(card).first().innerText().catch(() => '?');
  await buzzPage.likeControl(card).click({ force: true });
  await page.waitForTimeout(1500);
  const statsAfterLike = await buzzPage.statsText(card).first().innerText().catch(() => '?');
  report.check(
    'Like pertama menambah counter (0 Likes -> 1 Like)',
    statsInitial !== statsAfterLike,
    `initial="${statsInitial}" afterLike="${statsAfterLike}"`,
  );

  await buzzPage.likeControl(card).click({ force: true });
  await page.waitForTimeout(1500);
  const statsAfterUnlike = await buzzPage.statsText(card).first().innerText().catch(() => '?');
  report.check(
    'Like kedua (unlike) mengembalikan counter ke nilai semula (bukan bertambah lagi)',
    statsAfterUnlike === statsInitial,
    `afterLike="${statsAfterLike}" afterUnlike="${statsAfterUnlike}" initial="${statsInitial}"`,
  );

  report.print();
});
