/**
 * ================================================================================
 * TC-ADMIN-CORPBRAND-01: Verify Form Loads
 * Modul    : Admin - Corporate Branding
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-CORPBRAND-01-Verify-Form-Loads.spec.ts
 * Path     : tests/admin/corporate-branding/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi form Corporate Branding termuat dengan 3 file input
 *   (Client Logo, Client Banner, Login Banner) dan tombol Reset to
 *   Default / Preview / Publish (BUKAN "Save" seperti sub-screen Admin
 *   lain -- dikonfirmasi live).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/corporate-branding/TC-ADMIN-CORPBRAND-01-Verify-Form-Loads.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-CORPBRAND-01: the Corporate Branding form loads with 3 file inputs and the expected buttons', async ({
  page,
  adminCorporateBrandingPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-CORPBRAND-01', 'Form Loads', env.baseURL, page);

  report.step('Buka form Corporate Branding');
  await adminCorporateBrandingPage.goto();
  await page.waitForTimeout(1500);

  report.step('Verify: 3 file input dan tombol Reset to Default/Preview/Publish ada');
  const fileInputCount = await page.locator('input[type="file"]').count();
  report.check('Ada 3 file input (Client Logo, Client Banner, Login Banner)', fileInputCount === 3, `count=${fileInputCount}`);
  report.check('Tombol "Reset to Default" ada', await adminCorporateBrandingPage.resetToDefaultButton.isVisible({ timeout: 5_000 }).catch(() => false));
  report.check('Tombol "Preview" ada', await adminCorporateBrandingPage.previewButton.isVisible({ timeout: 5_000 }).catch(() => false));
  report.check('Tombol "Publish" ada (bukan "Save")', await adminCorporateBrandingPage.publishButton.isVisible({ timeout: 5_000 }).catch(() => false));

  report.print();
});
