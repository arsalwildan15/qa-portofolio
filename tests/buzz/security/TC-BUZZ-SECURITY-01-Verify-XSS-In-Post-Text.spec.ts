/**
 * ================================================================================
 * TC-BUZZ-SECURITY-01: Verify XSS Payload In Post Text Is Sanitized
 * Modul    : Buzz - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-SECURITY-01-Verify-XSS-In-Post-Text.spec.ts
 * Path     : tests/buzz/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di teks post TIDAK tereksekusi sebagai
 *   script nyata. DAMPAK kalau gagal: stored XSS di Buzz berarti SEMUA
 *   karyawan yang membuka feed terdampak (bukan cuma admin), paling
 *   luas blast radius-nya dibanding modul lain yang sudah diuji.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/security/TC-BUZZ-SECURITY-01-Verify-XSS-In-Post-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-BUZZ-SECURITY-01: an XSS payload in post text does not execute', async ({ page, buzzPage }, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-SECURITY-01', 'XSS In Post Text', env.baseURL, page);
  const payload = '<img src=x onerror=alert(1)>QaBuzzXSS';

  let dialogFired = false;
  page.on('dialog', async (d) => {
    dialogFired = true;
    await d.dismiss();
  });

  report.step('Isi composer dengan payload XSS, submit');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.submitTextPost(payload);
  await page.waitForTimeout(2500);

  report.check('TIDAK ada dialog JS ter-trigger (alert tidak jalan)', !dialogFired);
  const scriptElementCount = await page.locator('img[src="x"]').count();
  report.check(
    'Tidak ada elemen <img src="x"> nyata ter-render dari payload (bukan di-escape jadi teks)',
    scriptElementCount === 0,
    `count=${scriptElementCount}`,
  );

  report.print();
});
