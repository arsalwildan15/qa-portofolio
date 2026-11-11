/**
 * ================================================================================
 * TC-BUZZ-11: Verify Delete Own Post
 * Modul    : Buzz
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-11-Verify-Delete-Own-Post.spec.ts
 * Path     : tests/buzz/posts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi kebab-menu "Delete Post" pada post milik sendiri
 *   benar-benar menghapus post tsb dari feed. FUNGSI: ini satu-satunya
 *   cara karyawan menarik kembali post yang sudah ter-broadcast ke
 *   seluruh perusahaan -- kalau tidak berfungsi, konten yang sudah
 *   diposting (termasuk yang keliru/sensitif) tidak bisa ditarik.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/posts/TC-BUZZ-11-Verify-Delete-Own-Post.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-11: "Delete Post" from the kebab menu removes the post from the feed', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-11', 'Delete Own Post', env.baseURL, page);
  const marker = uniqueName('QaBuzzDelete');

  report.step('Buat post baru, buka kebab menu, klik "Delete Post"');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.submitTextPost(marker);
  const card = await buzzPage.reloadAndFindCard(marker);

  await buzzPage.kebabMenuButton(card).click();
  await page.waitForTimeout(400);
  await buzzPage.kebabMenuItem('Delete Post').click();

  // Same "Yes, Delete" confirm dialog pattern used by every other delete flow in this app
  // (AdminJobTitlesPage, AdminEmailSubscriptionsPage, etc.) -- unanchored regex, not an exact
  // match, since the button's accessible name can carry extra whitespace/icon text.
  const confirmButton = page.getByRole('button', { name: /Yes, Delete/i });
  await confirmButton.click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  report.step('Reload dan verify post sudah TIDAK ada lagi di feed');
  await page.reload();
  await page.waitForTimeout(2500);
  const countAfter = await buzzPage.cardByText(marker).count();
  report.check('Post TIDAK muncul lagi di feed setelah Delete Post', countAfter === 0, `countAfter=${countAfter}`);

  report.print();
});
