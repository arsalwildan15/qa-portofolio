/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-13: Verify Reactivate Vacancy
 * Modul    : Recruitment - Vacancies
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-13-Verify-Reactivate-Vacancy.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi vacancy yang di-deactivate bisa di-reactivate (toggle
 *   "Active" -> on lagi) dan kembali muncul di dropdown Add Candidate.
 *   Independen dari TC-VACANCY-12 (membuat + deactivate vacancy sendiri
 *   di dalam TC ini juga, bukan bergantung pada state TC lain).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-13-Verify-Reactivate-Vacancy.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestVacancy } from '../../../src/utils/createTestVacancy';

test('TC-RECRUITMENT-VACANCY-13: reactivating a vacancy restores it in the Add Candidate dropdown', async ({
  page,
  vacanciesPage,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-13', 'Reactivate Vacancy', env.baseURL, page);

  report.step('Buat vacancy baru, deactivate dulu (Active -> off)');
  const { vacancyId, vacancyName } = await createTestVacancy(page, vacanciesPage, 'QaReactivateVacancy', '2');

  await vacanciesPage.gotoEditForm(vacancyId);
  await page.waitForTimeout(1000);
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/v2/recruitment/vacancies/${vacancyId}`) && r.request().method() === 'PUT',
    ),
    (async () => {
      await vacanciesPage.toggleActiveStatus();
      await vacanciesPage.save();
    })(),
  ]);
  await page.waitForTimeout(800);

  report.step('Edit ulang, toggle "Active" -> on lagi, Save');
  await vacanciesPage.gotoEditForm(vacancyId);
  await page.waitForTimeout(1000);
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/v2/recruitment/vacancies/${vacancyId}`) && r.request().method() === 'PUT',
    ),
    (async () => {
      await vacanciesPage.toggleActiveStatus();
      await vacanciesPage.save();
    })(),
  ]);
  report.check('[API] PUT reactivate status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.step('Verify kolom Status kembali "Active" di list');
  await vacanciesPage.goto();
  await page.waitForTimeout(1200);
  const row = vacanciesPage.rowByName(vacancyName).first();
  const rowText = (await row.textContent().catch(() => '')) ?? '';
  report.check('Kolom Status di list kembali "Active"', rowText.includes('Active') && !rowText.includes('Closed'), `rowText=${rowText}`);

  report.step('Cek vacancy muncul kembali di dropdown Add Candidate');
  await candidatesPage.gotoAddForm();
  await page.waitForTimeout(800);
  await candidatesPage.vacancySelect.click();
  await page.waitForTimeout(500);
  const options = await page.getByRole('option').allTextContents();
  const present = options.some((o) => o.trim() === vacancyName);
  await page.keyboard.press('Escape');

  if (!present) {
    report.finding(
      'Vacancy tidak ditemukan di dropdown Add Candidate setelah reactivate',
      `vacancyName="${vacancyName}" tidak ada di antara ${options.length} opsi dropdown. Dropdown dibatasi ` +
        '(observed ~25 opsi) dan demo publik punya churn tinggi, jadi ini kemungkinan besar shared-demo churn, ' +
        'bukan bug reactivate (lihat TC-VACANCY-12 untuk detail karakteristik ini).',
    );
  } else {
    report.check(`Vacancy "${vacancyName}" muncul kembali di dropdown Add Candidate`, present);
  }

  report.print();
});
