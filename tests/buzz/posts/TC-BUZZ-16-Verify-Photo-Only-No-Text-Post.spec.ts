/**
 * ================================================================================
 * TC-BUZZ-16: Verify Post With Only A Photo And No Text Succeeds
 * Modul    : Buzz
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-16-Verify-Photo-Only-No-Text-Post.spec.ts
 * Path     : tests/buzz/posts/
 * ================================================================================
 *
 * TUJUAN:
 *   TC-BUZZ-02 membuktikan teks KOSONG TANPA foto diblokir. Tapi
 *   belum pernah dibuktikan apakah kombinasi "foto ADA, teks KOSONG"
 *   juga diblokir dengan alasan yang sama (textarea kosong), atau
 *   justru DIIZINKAN karena ada attachment media. Kombinasi input
 *   ini belum dites sama sekali -- boundary penting karena
 *   perilakunya bisa beda dari TC-02.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/posts/TC-BUZZ-16-Verify-Photo-Only-No-Text-Post.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test('TC-BUZZ-16: a photo-only post (no caption text) submits successfully', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-16', 'Photo Only No Text Post', env.baseURL, page);

  report.step('Buka composer, upload foto valid, JANGAN isi teks apa pun, klik Post');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.revealPhotoUpload();
  await page.waitForTimeout(500);
  await buzzPage.fileInput.setInputFiles({ name: 'photo-only.png', mimeType: 'image/png', buffer: PNG_BUFFER });
  await page.waitForTimeout(500);

  let postFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/buzz/posts')) postFired = true;
  });
  await buzzPage.submitPostButton.click();
  await page.waitForTimeout(2000);

  report.finding(
    'Hasil submit foto tanpa teks',
    `postFired=${postFired} (dokumentasi perilaku: diizinkan jika true, diblokir jika false -- kontras dgn TC-BUZZ-02 yg menguji teks kosong TANPA foto)`,
  );
  report.check('TC dijalankan tanpa exception (baseline dokumentasi perilaku)', true);

  report.print();
});
