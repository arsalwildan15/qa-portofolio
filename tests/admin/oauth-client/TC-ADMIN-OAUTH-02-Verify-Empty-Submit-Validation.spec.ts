/**
 * ================================================================================
 * TC-ADMIN-OAUTH-02: Verify Empty Submit Validation
 * Modul    : Admin - Configuration - OAuth Client
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-OAUTH-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/oauth-client/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Save tanpa isi Name/Redirect URI memunculkan
 *   validasi Required dan tidak ada POST terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/oauth-client/TC-ADMIN-OAUTH-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-OAUTH-02: submitting empty Name/Redirect URI shows Required, nothing saved', async ({
  page,
  adminOAuthClientPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-OAUTH-02', 'Verify Empty Submit Validation', env.baseURL, page);
  const oc = adminOAuthClientPage;

  const postRequests: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('oauth')) postRequests.push(r.url());
  });

  report.step('Buka OAuth Client, klik Add, klik Save TANPA isi apa pun');
  await oc.goto();
  await oc.addButton.click();
  await page.waitForTimeout(800);
  await oc.save();
  await page.waitForTimeout(1000);

  report.step('Verify pesan Required muncul dan tidak ada POST terkirim');
  const errorCount = await oc.fieldErrors.count();
  report.check('Minimal 2 pesan error Required muncul (Name + Redirect URI)', errorCount >= 2, `actual=${errorCount}`);
  report.check('TIDAK ADA POST terkirim', postRequests.length === 0, `requests=${JSON.stringify(postRequests)}`);

  report.print();
});
