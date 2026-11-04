/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-07: Verify Search Vacancies List
 * Modul    : Recruitment - Vacancies
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-07-Verify-Search-Vacancies-List.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi search by Vacancy Name di list Vacancies menampilkan
 *   hanya hasil yang relevan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-07-Verify-Search-Vacancies-List.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-VACANCY-07: searching by Vacancy Name filters the list', async ({
  page,
  vacanciesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-07', 'Search Vacancies List', env.baseURL, page);
  const vacancyName = uniqueName('QaSearchVacancy');

  report.step('Buat vacancy baru untuk dicari');
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

  report.step('Cari vacancy via dropdown filter Vacancy, klik Search');
  await vacanciesPage.goto();
  await page.waitForTimeout(1000);
  await vacanciesPage.searchByVacancyName(vacancyName);
  await vacanciesPage.search();
  await page.waitForTimeout(1200);

  report.step(`Verify hasil search cuma menampilkan "${vacancyName}"`);
  report.check(
    `Vacancy "${vacancyName}" muncul di hasil search`,
    await isVisibleWithWait(vacanciesPage.rowByName(vacancyName).first()),
  );
  const rowCount = await vacanciesPage.tableRows.count();
  report.check('Hasil search cuma 1 baris (filter bekerja)', rowCount === 1, `rowCount=${rowCount}`);

  report.print();
});
