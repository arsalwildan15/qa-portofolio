/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-08: Verify New Vacancy In Candidate Dropdown
 * Modul    : Recruitment - Vacancies
 * Kategori : Positive (+) [Integration]
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-08-Verify-New-Vacancy-In-Candidate-Dropdown.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi vacancy baru yang dibuat langsung muncul di dropdown
 *   "Vacancy" saat Add Candidate (cross-feature check, membuktikan 2
 *   fitur berbeda membaca sumber data vacancy yang sama).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-08-Verify-New-Vacancy-In-Candidate-Dropdown.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-VACANCY-08: a new vacancy appears in the Add Candidate Vacancy dropdown', async ({
  page,
  vacanciesPage,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-08', 'New Vacancy In Candidate Dropdown', env.baseURL, page);
  const vacancyName = uniqueName('QaDropdownVacancy');

  report.step('Buat vacancy baru');
  await vacanciesPage.gotoAddForm();
  await vacanciesPage.vacancyNameInput.fill(vacancyName);
  await vacanciesPage.jobTitleSelect.click();
  await page.getByRole('option').nth(1).click();
  await vacanciesPage.fillFirstHiringManager();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/recruitment/vacancies') && r.request().method() === 'POST'),
    vacanciesPage.save(),
  ]);
  await page.waitForTimeout(1000);

  report.step('Buka Add Candidate, cek dropdown Vacancy');
  await candidatesPage.gotoAddForm();
  await page.waitForTimeout(1000);
  await candidatesPage.vacancySelect.click();
  await page.waitForTimeout(500);
  const options = await page.getByRole('option').allTextContents();

  report.step(`Verify "${vacancyName}" ada di opsi dropdown Vacancy`);
  report.check(
    `Vacancy "${vacancyName}" muncul di dropdown Add Candidate`,
    options.some((o) => o.trim() === vacancyName),
  );

  report.print();
});
