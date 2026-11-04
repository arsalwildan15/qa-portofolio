/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-03: Verify Vacancy Name Very Long Text
 * Modul    : Recruitment - Vacancies
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-03-Verify-Vacancy-Name-Very-Long-Text.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi perilaku Vacancy Name dengan teks sangat panjang (300
 *   karakter): didokumentasikan sebagai finding karena belum diketahui
 *   batas pasti sebelum dicoba langsung (ada boundary client-side atau
 *   diterima apa adanya oleh server).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-03-Verify-Vacancy-Name-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-RECRUITMENT-VACANCY-03: a 300-character Vacancy Name is handled', async ({
  page,
  vacanciesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-03', 'Vacancy Name Very Long Text', env.baseURL, page);
  const longName = 'A'.repeat(300);

  report.step('Isi Vacancy Name 300 karakter, isi field wajib lain, klik Save');
  await vacanciesPage.gotoAddForm();
  await vacanciesPage.vacancyNameInput.fill(longName);
  await vacanciesPage.jobTitleSelect.click();
  await page.getByRole('option').nth(1).click();
  await vacanciesPage.save();
  await page.waitForTimeout(1200);

  const errorText = await vacanciesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.finding(
    'Perilaku Vacancy Name 300 karakter',
    errorText !== null
      ? `Ditolak dengan pesan validasi: "${errorText}"`
      : 'Diterima tanpa pesan validasi panjang (tidak ada batas client-side yang terlihat).',
  );
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
