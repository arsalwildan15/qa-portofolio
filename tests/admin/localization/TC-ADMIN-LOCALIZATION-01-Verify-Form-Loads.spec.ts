/**
 * ================================================================================
 * TC-ADMIN-LOCALIZATION-01: Verify Form Loads
 * Modul    : Admin - Configuration - Localization
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LOCALIZATION-01-Verify-Form-Loads.spec.ts
 * Path     : tests/admin/localization/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Localization menampilkan Language dan Date Format
 *   dengan nilai saat ini, serta tombol Save. [TEMUAN] TIDAK ADA field
 *   Timezone di screen ini (koreksi atas asumsi awal scoping), dan TIDAK
 *   ADA tombol Cancel (sama quirk dengan General Information).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/localization/TC-ADMIN-LOCALIZATION-01-Verify-Form-Loads.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';

test('TC-ADMIN-LOCALIZATION-01: Localization form loads with current Language/Date Format and no Cancel button', async ({
  page,
  adminLocalizationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LOCALIZATION-01', 'Verify Form Loads', env.baseURL, page);
  const lo = adminLocalizationPage;

  report.step('Buka Localization');
  await lo.goto();

  report.step('Verify Language, Date Format, dan Save tampil; Cancel TIDAK ADA');
  report.check('Language select terlihat', await isVisibleWithWait(lo.languageSelect));
  report.check('Date Format select terlihat', await isVisibleWithWait(lo.dateFormatSelect));
  report.check('Tombol Save terlihat', await isVisibleWithWait(lo.saveButton));
  report.check('Tombol Cancel TIDAK ADA (sama quirk dengan General Information)', await isHiddenWithWait(lo.cancelButton, 3_000));

  const currentLanguage = await lo.languageSelect.textContent().catch(() => '');
  const currentDateFormat = await lo.dateFormatSelect.textContent().catch(() => '');
  report.finding('Nilai Language & Date Format saat ini', `Language="${currentLanguage?.trim()}", Date Format="${currentDateFormat?.trim()}"`);

  report.print();
});
