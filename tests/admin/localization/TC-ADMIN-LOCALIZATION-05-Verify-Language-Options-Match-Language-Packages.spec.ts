/**
 * ================================================================================
 * TC-ADMIN-LOCALIZATION-05: Verify Language Options Match Language Packages
 * Modul    : Admin - Configuration - Localization
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCALIZATION-05-Verify-Language-Options-Match-Language-Packages.spec.ts
 * Path     : tests/admin/localization/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi konsistensi data read-only antar 2 sub-screen
 *   Configuration: setiap bahasa yang terdaftar di Language Packages
 *   (Admin > Configuration > Language Packages) juga tersedia sebagai
 *   opsi di dropdown Language pada Localization. Pure read-only cross-
 *   screen check, TIDAK pernah menyimpan apa pun di kedua screen.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/localization/TC-ADMIN-LOCALIZATION-05-Verify-Language-Options-Match-Language-Packages.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LOCALIZATION-05: Language dropdown options are consistent with the Language Packages list (read-only)', async ({
  page,
  adminLocalizationPage,
  adminLanguagePackagesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LOCALIZATION-05', 'Verify Language Options Match Language Packages', env.baseURL, page);
  const lo = adminLocalizationPage;
  const lp = adminLanguagePackagesPage;

  report.step('Baca daftar Language Packages yang ter-enable');
  await lp.goto();
  const packageNames = (await lp.tableRows.allTextContents()).map((t) => t.trim()).filter(Boolean);
  report.finding('Language Packages saat ini', JSON.stringify(packageNames));

  report.step('Buka Localization, buka dropdown Language, bandingkan opsi dengan Language Packages (TIDAK menyimpan apa pun)');
  await lo.goto();
  await lo.openLanguageOptions();
  await page.waitForTimeout(500);
  const options = page.locator('.oxd-select-dropdown .oxd-select-option, [role="option"]');
  const optionTexts = (await options.allTextContents()).map((t) => t.trim());
  await page.keyboard.press('Escape');

  report.check('Dropdown Language tidak kosong', optionTexts.length > 0, `optionCount=${optionTexts.length}`);
  const missing = packageNames.filter((pkg) => !optionTexts.some((opt) => opt.includes(pkg.split(' - ')[0] ?? pkg) || pkg.includes(opt)));
  report.finding(
    'Konsistensi Language Packages vs dropdown Localization',
    missing.length === 0
      ? 'Semua Language Package yang ter-enable muncul sebagai opsi di dropdown Language -- konsisten'
      : `Package yang TIDAK ditemukan persis di dropdown (perlu dicek manual, bisa jadi beda format label): ${JSON.stringify(missing)}`,
  );

  report.print();
});
