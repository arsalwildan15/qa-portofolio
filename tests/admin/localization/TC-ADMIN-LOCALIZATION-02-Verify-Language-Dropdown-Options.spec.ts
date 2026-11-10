/**
 * ================================================================================
 * TC-ADMIN-LOCALIZATION-02: Verify Language Dropdown Options
 * Modul    : Admin - Configuration - Localization
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCALIZATION-02-Verify-Language-Dropdown-Options.spec.ts
 * Path     : tests/admin/localization/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi dropdown Language berisi lebih dari 1 opsi (konsisten
 *   dengan daftar di Language Packages) tanpa pernah memilih/menyimpan
 *   apa pun -- [VALIDATE-ONLY], dropdown ditutup lagi tanpa Save.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/localization/TC-ADMIN-LOCALIZATION-02-Verify-Language-Dropdown-Options.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LOCALIZATION-02: Language dropdown lists multiple options, never saved [VALIDATE-ONLY]', async ({
  page,
  adminLocalizationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LOCALIZATION-02', 'Verify Language Dropdown Options', env.baseURL, page);
  const lo = adminLocalizationPage;

  report.step('Buka Localization, klik dropdown Language (TIDAK memilih opsi apa pun)');
  await lo.goto();
  await lo.openLanguageOptions();
  await page.waitForTimeout(500);

  report.step('Verify lebih dari 1 opsi tersedia');
  const options = page.locator('.oxd-select-dropdown .oxd-select-option, [role="option"]');
  const count = await options.count();
  report.check('Dropdown Language berisi > 1 opsi', count > 1, `optionCount=${count}`);

  await page.keyboard.press('Escape');

  report.print();
});
