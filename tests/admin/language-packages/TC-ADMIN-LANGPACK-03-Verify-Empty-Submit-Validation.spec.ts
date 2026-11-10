/**
 * ================================================================================
 * TC-ADMIN-LANGPACK-03: Verify Empty Submit Validation
 * Modul    : Admin - Configuration - Language Packages
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LANGPACK-03-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/language-packages/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Save pada dialog Add tanpa memilih Name
 *   memunculkan validasi Required dan tidak ada POST terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/language-packages/TC-ADMIN-LANGPACK-03-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LANGPACK-03: submitting Add with no Name selected shows Required, nothing saved', async ({
  page,
  adminLanguagePackagesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LANGPACK-03', 'Verify Empty Submit Validation', env.baseURL, page);
  const lp = adminLanguagePackagesPage;

  const postRequests: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('language')) postRequests.push(r.url());
  });

  report.step('Buka Language Packages, klik Add, klik Save TANPA pilih Name');
  await lp.goto();
  await lp.addButton.click();
  await page.waitForTimeout(800);
  await lp.save();
  await page.waitForTimeout(1000);

  report.step('Verify pesan Required muncul dan tidak ada POST terkirim');
  const errorText = await lp.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check('Pesan error Required muncul', (errorText ?? '').trim().length > 0, `error="${errorText}"`);
  report.check('TIDAK ADA POST terkirim', postRequests.length === 0, `requests=${JSON.stringify(postRequests)}`);

  report.print();
});
