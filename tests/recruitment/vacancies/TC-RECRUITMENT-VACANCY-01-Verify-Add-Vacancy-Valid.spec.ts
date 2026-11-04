/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-01: Verify Add Vacancy Valid
 * Modul    : Recruitment - Vacancies
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-01-Verify-Add-Vacancy-Valid.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Vacancy baru (Vacancy Name, Job Title,
 *   Description, Hiring Manager, Number of Positions) berhasil tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-01-Verify-Add-Vacancy-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-VACANCY-01: adding a vacancy with valid data succeeds', async ({
  page,
  vacanciesPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-01', 'Add Vacancy Valid', env.baseURL, page);
  const vacancyName = uniqueName('QaVacancy');

  report.step('Isi Vacancy Name, pilih Job Title, isi Description/Hiring Manager/Number of Positions, klik Save');
  await vacanciesPage.gotoAddForm();
  await vacanciesPage.vacancyNameInput.fill(vacancyName);
  await vacanciesPage.jobTitleSelect.click();
  await page.getByRole('option').nth(1).click();
  await vacanciesPage.descriptionTextarea.fill('QA automation role');
  await vacanciesPage.fillFirstHiringManager();
  await vacanciesPage.numberOfPositionsInput.fill('2');

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/recruitment/vacancies') && r.request().method() === 'POST'),
    vacanciesPage.save(),
  ]);

  report.step('Verify response POST vacancies, dan vacancy muncul di list');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await vacanciesPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `Vacancy "${vacancyName}" muncul di list`,
    await vacanciesPage.rowByName(vacancyName).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.print();
});
