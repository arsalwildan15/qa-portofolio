/**
 * ================================================================================
 * TC-ADMIN-LOCALIZATION-04: Verify Date Format Change Not Saved Without Save
 * Modul    : Admin - Configuration - Localization
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCALIZATION-04-Verify-Date-Format-Change-Not-Saved-Without-Save.spec.ts
 * Path     : tests/admin/localization/
 * ================================================================================
 *
 * TUJUAN:
 *   Sama seperti TC-ADMIN-LOCALIZATION-03, tapi untuk field Date Format --
 *   memilih opsi lain secara client-side TANPA klik Save tidak mengubah
 *   konfigurasi server. [SAFETY] [VALIDATE-ONLY], Save tidak pernah
 *   diklik karena mengubah format tanggal default memengaruhi semua user.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/localization/TC-ADMIN-LOCALIZATION-04-Verify-Date-Format-Change-Not-Saved-Without-Save.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LOCALIZATION-04: selecting a different Date Format without Save does not persist [VALIDATE-ONLY]', async ({
  page,
  adminLocalizationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LOCALIZATION-04', 'Verify Date Format Change Not Saved Without Save', env.baseURL, page);
  const lo = adminLocalizationPage;

  const mutatingRequests: string[] = [];
  page.on('request', (r) => {
    if (['POST', 'PUT'].includes(r.method()) && r.url().includes('localization')) mutatingRequests.push(`${r.method()} ${r.url()}`);
  });

  report.step('Buka Localization, catat Date Format asli, pilih opsi lain di dropdown (TIDAK klik Save)');
  await lo.goto();
  const originalFormat = (await lo.dateFormatSelect.textContent())?.trim() ?? '';
  await lo.openDateFormatOptions();
  await page.waitForTimeout(500);
  const options = page.locator('.oxd-select-dropdown .oxd-select-option, [role="option"]');
  const optionTexts = await options.allTextContents();
  const differentOption = optionTexts.find((t) => t.trim() !== originalFormat && t.trim().length > 0);
  if (differentOption) {
    await options.filter({ hasText: differentOption }).first().click();
    await page.waitForTimeout(500);
  }

  report.step('Reload halaman TANPA klik Save, verify Date Format kembali ke nilai asli dan tidak ada POST/PUT terkirim');
  await lo.goto();
  const formatAfterReload = (await lo.dateFormatSelect.textContent())?.trim() ?? '';
  report.check('Date Format tetap sama dengan nilai asli setelah reload', formatAfterReload === originalFormat, `original="${originalFormat}" afterReload="${formatAfterReload}"`);
  report.check('TIDAK ADA POST/PUT terkirim ke server', mutatingRequests.length === 0, `requests=${JSON.stringify(mutatingRequests)}`);

  report.print();
});
