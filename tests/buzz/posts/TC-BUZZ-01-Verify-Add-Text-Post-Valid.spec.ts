/**
 * ================================================================================
 * TC-BUZZ-01: Verify Add Text Post Valid
 * Modul    : Buzz
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-01-Verify-Add-Text-Post-Valid.spec.ts
 * Path     : tests/buzz/posts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menulis post teks di Buzz berhasil tersimpan via POST
 *   /api/v2/buzz/posts dan muncul di feed. FUNGSI: Buzz adalah social
 *   feed internal, broadcast ke SELURUH karyawan (bukan tim/role
 *   tertentu) -- post yang berhasil di sini langsung terlihat semua
 *   orang yang login, berbeda dari data master Admin/PIM yang terbatas
 *   HR/admin.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/posts/TC-BUZZ-01-Verify-Add-Text-Post-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-BUZZ-01: posting valid text succeeds and appears in the feed', async ({ page, buzzPage }, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-01', 'Add Text Post Valid', env.baseURL, page);
  const marker = uniqueName('QaBuzzPost');

  report.step('Klik composer, isi teks, klik Post');
  await buzzPage.goto();
  await buzzPage.openComposer();
  const resp = await buzzPage.submitTextPost(marker);

  report.step('Verify response POST dan post muncul di feed');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  report.step('NOTE: post baru tidak muncul via client-side update -- perlu reload utk melihatnya (UX finding, bukan bug script)');
  const found = await buzzPage
    .reloadAndFindCard(marker)
    .then(() => true)
    .catch(() => false);
  report.check(`Post "${marker}" muncul di feed setelah reload`, found);

  report.print();
});
