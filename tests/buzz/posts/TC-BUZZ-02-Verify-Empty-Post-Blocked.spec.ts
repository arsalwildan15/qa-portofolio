/**
 * ================================================================================
 * TC-BUZZ-02: Verify Empty Post Is Blocked
 * Modul    : Buzz
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-02-Verify-Empty-Post-Blocked.spec.ts
 * Path     : tests/buzz/posts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi composer TIDAK bisa submit post kosong (tanpa teks,
 *   tanpa foto/video). FUNGSI: mencegah noise/spam post kosong di feed
 *   yang dilihat seluruh karyawan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/posts/TC-BUZZ-02-Verify-Empty-Post-Blocked.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-BUZZ-02: submitting an empty post is blocked', async ({ page, buzzPage }, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-BUZZ-02', 'Empty Post Blocked', env.baseURL, page);

  report.step('Buka composer tanpa isi apa pun, cek state tombol Post / coba klik');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await page.waitForTimeout(500);

  const isDisabled = await buzzPage.submitPostButton.isDisabled().catch(() => false);
  report.step('Kalau tombol enabled, klik dan pastikan TIDAK ada POST terkirim');

  let postFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/buzz/posts')) postFired = true;
  });
  if (!isDisabled) {
    await buzzPage.submitPostButton.click().catch(() => {});
    await page.waitForTimeout(2000);
  }

  report.check(
    'Tombol Post disabled UNTUK post kosong, ATAU submit tidak memicu POST',
    isDisabled || !postFired,
    `buttonDisabled=${isDisabled}, postRequestFired=${postFired}`,
  );

  report.print();
});
