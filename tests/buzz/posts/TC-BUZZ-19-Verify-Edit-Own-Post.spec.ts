/**
 * ================================================================================
 * TC-BUZZ-19: Verify Edit Own Post
 * Modul    : Buzz
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-19-Verify-Edit-Own-Post.spec.ts
 * Path     : tests/buzz/posts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi opsi "Edit Post" di kebab menu benar-benar mengubah
 *   teks post tersimpan via PUT /api/v2/buzz/posts/<id>, dan perubahan
 *   itu terlihat di feed setelah reload. Opsi ini ADA di kebab menu
 *   sejak Buzz pertama dibuat (lihat BuzzPage.kebabMenuItem()), tapi
 *   belum pernah diuji sama sekali sebelumnya di seluruh suite ini.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/posts/TC-BUZZ-19-Verify-Edit-Own-Post.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-19: editing an own post via the kebab menu persists the new text', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-19', 'Edit Own Post', env.baseURL, page);
  const marker = uniqueName('QaBuzzEdit');
  const editedMarker = `${marker}_EDITED`;

  report.step('Buat post baru, buka kebab menu, klik "Edit Post"');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.submitTextPost(marker);
  const card = await buzzPage.reloadAndFindCard(marker);

  await buzzPage.kebabMenuButton(card).click();
  await page.waitForTimeout(400);
  await buzzPage.kebabMenuItem('Edit Post').click();
  await page.waitForTimeout(1000);

  report.step(`Ubah teks jadi "${editedMarker}", klik Post (submit edit)`);
  const resp = await buzzPage.submitEditPost(editedMarker);
  report.check('[API] PUT status === 200', resp.status() === 200, `status=${resp.status()}`);
  const body = await resp.json().catch(() => null);
  report.check(
    '[API] Response body berisi teks yang SUDAH diedit (bukan teks asli)',
    body?.data?.text === editedMarker,
    `data.text="${body?.data?.text}"`,
  );

  report.step('Reload, verify teks baru muncul di feed dan teks lama hilang');
  await page.reload();
  await page.waitForTimeout(2500);
  report.check(
    `Post dgn teks baru "${editedMarker}" muncul di feed`,
    (await buzzPage.cardByText(editedMarker).count()) > 0,
  );
  report.check(
    `Teks ASLI "${marker}" (tanpa suffix _EDITED) TIDAK ada lagi sbg post terpisah`,
    (await page.getByText(marker, { exact: true }).count()) === 0,
  );

  report.print();
});
