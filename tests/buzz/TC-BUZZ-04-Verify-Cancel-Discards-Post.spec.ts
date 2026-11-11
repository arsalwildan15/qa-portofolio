/**
 * ================================================================================
 * TC-BUZZ-04: Verify Cancel Discards Post Without Saving
 * Modul    : Buzz
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-04-Verify-Cancel-Discards-Post.spec.ts
 * Path     : tests/buzz/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menutup composer (klik luar modal / tombol close)
 *   setelah mengisi teks TIDAK membuat post tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/TC-BUZZ-04-Verify-Cancel-Discards-Post.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';
import { uniqueName } from '../../src/data/testData';

test('TC-BUZZ-04: closing the composer after typing does not create a post', async ({ page, buzzPage }, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-BUZZ-04', 'Cancel Discards Post', env.baseURL, page);
  const marker = uniqueName('QaBuzzCancel');

  report.step('Buka composer, isi teks, TUTUP modal (bukan Post), verify tidak ada POST');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.postTextarea.fill(marker);

  let postFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/buzz/posts')) postFired = true;
  });

  const closeButton = page.getByRole('button', { name: /close|cancel|×/i }).last();
  await closeButton.click({ timeout: 5_000 }).catch(() => page.keyboard.press('Escape'));
  await page.waitForTimeout(1500);

  report.check('TIDAK ada POST /api/v2/buzz/posts terkirim setelah close', !postFired);
  await buzzPage.goto();
  await page.waitForTimeout(1500);
  report.check(
    `Post "${marker}" TIDAK muncul di feed`,
    (await buzzPage.cardByText(marker).count()) === 0,
  );

  report.print();
});
