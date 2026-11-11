/**
 * ================================================================================
 * TC-BUZZ-09: Verify Valid Photo Upload Succeeds
 * Modul    : Buzz
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-09-Verify-Photo-Upload-Valid.spec.ts
 * Path     : tests/buzz/posts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi upload foto VALID (PNG asli, bukan payload security)
 *   via "Share Photo" berhasil tersimpan dan post dengan foto muncul
 *   di feed setelah reload. Melengkapi TC-BUZZ-SECURITY-03/04 yang
 *   hanya menguji sisi NEGATIF (file berbahaya) -- happy path upload
 *   foto yang sah belum pernah dibuktikan berfungsi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/posts/TC-BUZZ-09-Verify-Photo-Upload-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

// 1x1 px PNG, valid magic bytes (real image, not a disguised executable).
const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test('TC-BUZZ-09: uploading a valid PNG photo succeeds and appears in the feed', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(75_000);
  const report = new TestReport('TC-BUZZ-09', 'Photo Upload Valid', env.baseURL, page);
  const marker = uniqueName('QaBuzzPhoto');

  report.step('Buka composer, klik Share Photo, upload PNG valid, isi teks, submit');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.revealPhotoUpload();
  await page.waitForTimeout(500);
  await buzzPage.fileInput.setInputFiles({ name: 'valid-photo.png', mimeType: 'image/png', buffer: PNG_BUFFER });
  await page.waitForTimeout(500);
  // NOTE 2026-11-11: uploading real binary data on the shared public demo is measurably
  // slower and more variable than a plain text-only submit (confirmed flaky across multiple
  // runs, same root cause already documented on TC-BUZZ-SECURITY-03) -- widened to 45s.
  const resp = await buzzPage.submitTextPost(marker, 45_000);

  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.step('Reload, verify post dengan foto muncul di feed dan tag <img> ada di dalamnya');
  const card = await buzzPage.reloadAndFindCard(marker);
  const imgCount = await card.locator('img').count();
  report.check('Post memuat elemen <img> (foto ter-attach)', imgCount > 0, `imgCount=${imgCount}`);

  report.print();
});
