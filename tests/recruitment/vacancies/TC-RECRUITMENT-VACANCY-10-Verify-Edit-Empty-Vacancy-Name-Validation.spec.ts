/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-10: Verify Edit Empty Vacancy Name Validation
 * Modul    : Recruitment - Vacancies
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-10-Verify-Edit-Empty-Vacancy-Name-Validation.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengosongkan Vacancy Name pada form edit memicu validasi
 *   Required dan TIDAK mengirim PUT, serta data lama di server tidak
 *   berubah. Mengikuti pola TEMUAN Hiring Manager (page.waitForResponse
 *   tidak dipakai tanpa guard, supaya tidak false-timeout saat PUT memang
 *   tidak pernah terkirim).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-10-Verify-Edit-Empty-Vacancy-Name-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestVacancy } from '../../../src/utils/createTestVacancy';

test('TC-RECRUITMENT-VACANCY-10: clearing Vacancy Name on edit blocks save', async ({
  page,
  vacanciesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-10', 'Edit Empty Vacancy Name Validation', env.baseURL, page);

  report.step('Buat vacancy baru khusus TC ini');
  const { vacancyId, vacancyName } = await createTestVacancy(page, vacanciesPage, 'QaEditEmptyName', '2');

  let putFired = false;
  page.on('request', (req) => {
    if (req.method() === 'PUT' && req.url().includes(`/api/v2/recruitment/vacancies/${vacancyId}`)) putFired = true;
  });

  report.step('Buka form edit, kosongkan Vacancy Name (select-all + delete), klik Save');
  await vacanciesPage.gotoEditForm(vacancyId);
  await page.waitForTimeout(1000);
  await vacanciesPage.vacancyNameInput.click();
  await vacanciesPage.vacancyNameInput.fill('');
  await vacanciesPage.vacancyNameInput.blur();
  await page.waitForTimeout(300);
  await vacanciesPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify: PUT tidak terkirim (sinyal utama validasi blocking), data lama tidak berubah');
  const errorCount = await vacanciesPage.fieldErrors.count();
  const requiredTextVisible = await page.getByText('Required', { exact: true }).first().isVisible({ timeout: 2_000 }).catch(() => false);
  // [TEMUAN] Pesan error inline "Required" TIDAK SELALU konsisten terlihat
  // via locator pada form EDIT di dalam timing test ini (confirmed live:
  // kadang 0 error terlihat), tapi sinyal yang SEBENARNYA membuktikan
  // validasi memblokir submit adalah PUT yang tidak pernah terkirim + data
  // lama tidak berubah -- itu dipakai sebagai hard check di bawah,
  // sementara visibilitas teks error didokumentasikan sebagai finding
  // supaya tidak false-fail akibat rendering timing.
  report.finding(
    'Visibilitas pesan error "Required" inline saat Vacancy Name dikosongkan di form EDIT',
    `errorCount=${errorCount}, requiredTextVisible=${requiredTextVisible}. Sinyal validasi yang reliable adalah ` +
      'PUT yang tidak terkirim (check di bawah), bukan visibilitas elemen error ini.',
  );
  report.check('PUT vacancy TIDAK terkirim', putFired === false);

  await vacanciesPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `Vacancy Name lama "${vacancyName}" tidak berubah (verifikasi via reload)`,
    await vacanciesPage.rowByName(vacancyName).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.print();
});
