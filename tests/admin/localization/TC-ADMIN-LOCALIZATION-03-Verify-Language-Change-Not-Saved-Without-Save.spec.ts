/**
 * ================================================================================
 * TC-ADMIN-LOCALIZATION-03: Verify Language Change Not Saved Without Save
 * Modul    : Admin - Configuration - Localization
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCALIZATION-03-Verify-Language-Change-Not-Saved-Without-Save.spec.ts
 * Path     : tests/admin/localization/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi memilih Language lain secara client-side TANPA klik
 *   Save tidak mengubah konfigurasi server -- dikonfirmasi lewat reload
 *   penuh. [SAFETY] TC ini SENGAJA TIDAK PERNAH klik Save karena
 *   mengubah default Language mengubah bahasa UI SEMUA user demo publik
 *   ini -- [VALIDATE-ONLY].
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/localization/TC-ADMIN-LOCALIZATION-03-Verify-Language-Change-Not-Saved-Without-Save.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LOCALIZATION-03: selecting a different Language without Save does not persist [VALIDATE-ONLY]', async ({
  page,
  adminLocalizationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LOCALIZATION-03', 'Verify Language Change Not Saved Without Save', env.baseURL, page);
  const lo = adminLocalizationPage;

  const mutatingRequests: string[] = [];
  page.on('request', (r) => {
    if (['POST', 'PUT'].includes(r.method()) && r.url().includes('localization')) mutatingRequests.push(`${r.method()} ${r.url()}`);
  });

  report.step('Buka Localization, catat Language asli, pilih opsi lain di dropdown (TIDAK klik Save)');
  await lo.goto();
  const originalLanguage = (await lo.languageSelect.textContent())?.trim() ?? '';
  await lo.openLanguageOptions();
  await page.waitForTimeout(500);
  const options = page.locator('.oxd-select-dropdown .oxd-select-option, [role="option"]');
  const optionTexts = await options.allTextContents();
  const differentOption = optionTexts.find((t) => t.trim() !== originalLanguage && t.trim().length > 0);
  if (differentOption) {
    await options.filter({ hasText: differentOption }).first().click();
    await page.waitForTimeout(500);
  }

  report.step('Reload halaman TANPA klik Save, verify Language kembali ke nilai asli dan tidak ada POST/PUT terkirim');
  await lo.goto();
  const languageAfterReload = (await lo.languageSelect.textContent())?.trim() ?? '';
  report.check('Language tetap sama dengan nilai asli setelah reload', languageAfterReload === originalLanguage, `original="${originalLanguage}" afterReload="${languageAfterReload}"`);
  report.check('TIDAK ADA POST/PUT terkirim ke server', mutatingRequests.length === 0, `requests=${JSON.stringify(mutatingRequests)}`);

  report.print();
});
