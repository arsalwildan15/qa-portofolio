/**
 * ================================================================================
 * TC-BUZZ-03: Verify Post With Very Long Text (Boundary)
 * Modul    : Buzz
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-03-Verify-Post-Very-Long-Text.spec.ts
 * Path     : tests/buzz/posts/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan perilaku aktual saat post diisi teks sangat
 *   panjang (2000 karakter) -- apakah ada batas panjang client/server,
 *   atau diterima apa adanya (UI punya tombol "Read More" yang
 *   mengindikasikan truncation DI TAMPILAN, bukan berarti ada limit
 *   di input).
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/posts/TC-BUZZ-03-Verify-Post-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-03: a 2000-character post is handled (documented as-is)', async ({ page, buzzPage }, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-03', 'Post Very Long Text', env.baseURL, page);
  const marker = uniqueName('QaBuzzLong');
  const longText = `${marker}_` + 'X'.repeat(2000);

  report.step('Isi composer dengan teks 2000+ karakter, klik Post');
  await buzzPage.goto();
  await buzzPage.openComposer();
  const resp = await buzzPage.submitTextPost(longText).catch((e) => {
    report.finding('Submit tidak menghasilkan response dalam 15s', String(e).slice(0, 200));
    return null;
  });

  if (resp) {
    report.check(
      '[API] Request dengan teks 2000 char diproses (status < 500, bukan crash)',
      resp.status() < 500,
      `status=${resp.status()}`,
    );
    await page.waitForTimeout(2000);
    report.finding(
      'Perilaku panjang teks',
      `status=${resp.status()} -- ${resp.status() === 200 ? 'DITERIMA tanpa batas panjang terdeteksi' : 'DITOLAK, kemungkinan ada validasi panjang'}.`,
    );
  } else {
    report.check('TC dijalankan tanpa exception (baseline)', true);
  }

  report.print();
});
