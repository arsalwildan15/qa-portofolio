/**
 * ================================================================================
 * TC-ADMIN-SOCIALAUTH-02: Verify Empty Submit Validation
 * Modul    : Admin - Configuration - Social Media Authentication
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SOCIALAUTH-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/social-media-authentication/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Save pada form Add Provider tanpa mengisi apa pun
 *   memunculkan validasi Required pada ke-4 field (Name, Provider URL,
 *   Client ID, Client Secret) dan tidak ada POST terkirim.
 *
 *   [SAFETY] Klik Save di sini dengan data KOSONG aman karena diblokir
 *   client-side sebelum network call (dikonfirmasi lewat network
 *   listener di TC ini) -- screen ini TETAP diperlakukan validate-only
 *   untuk skenario lain (lihat TC-03/04/05), konsisten dengan SAFETY
 *   CONSTRAINT di AdminSocialMediaAuthPage.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/social-media-authentication/TC-ADMIN-SOCIALAUTH-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-SOCIALAUTH-02: empty submit shows Required on all 4 fields, no POST', async ({
  page,
  adminSocialMediaAuthPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-SOCIALAUTH-02', 'Verify Empty Submit Validation', env.baseURL, page);
  const sa = adminSocialMediaAuthPage;

  const postRequests: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('auth-provider')) postRequests.push(r.url());
  });

  report.step('Buka Social Media Authentication, klik Add, klik Save TANPA isi apa pun');
  await sa.goto();
  await sa.addButton.click();
  await page.waitForTimeout(800);
  await sa.saveButton.click();
  await page.waitForTimeout(1000);

  report.step('Verify 4 pesan Required muncul dan tidak ada POST terkirim');
  const errorCount = await sa.fieldErrors.count();
  report.check('Minimal 4 pesan error Required muncul', errorCount >= 4, `actual=${errorCount}`);
  report.check('TIDAK ADA POST terkirim', postRequests.length === 0, `requests=${JSON.stringify(postRequests)}`);

  report.print();
});
