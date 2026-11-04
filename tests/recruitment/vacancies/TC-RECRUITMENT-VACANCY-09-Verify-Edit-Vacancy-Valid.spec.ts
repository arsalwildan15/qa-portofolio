/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-09: Verify Edit Vacancy Valid
 * Modul    : Recruitment - Vacancies
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-09-Verify-Edit-Vacancy-Valid.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi edit Vacancy Name dan Number of Positions pada vacancy
 *   yang sudah ada tersimpan dan persisten setelah reload. [API] CONFIRMED
 *   via discovery run: Edit memakai URL & FORM YANG SAMA dengan Add
 *   (/web/index.php/recruitment/addJobVacancy/<id>), dan Save mengirim
 *   PUT /api/v2/recruitment/vacancies/<id> (bukan POST, bukan endpoint
 *   terpisah).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-09-Verify-Edit-Vacancy-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestVacancy } from '../../../src/utils/createTestVacancy';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-VACANCY-09: editing a vacancy with valid data persists', async ({
  page,
  vacanciesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-09', 'Edit Vacancy Valid', env.baseURL, page);

  report.step('Buat vacancy baru khusus TC ini');
  const { vacancyId } = await createTestVacancy(page, vacanciesPage, 'QaEditVacancy', '2');
  const newName = uniqueName('QaEditedVacancy');

  report.step('Buka form edit (URL & form sama dengan Add), ubah Vacancy Name dan Number of Positions, Save');
  await vacanciesPage.gotoEditForm(vacancyId);
  await page.waitForTimeout(1000);
  await vacanciesPage.vacancyNameInput.fill('');
  await vacanciesPage.vacancyNameInput.fill(newName);
  await vacanciesPage.numberOfPositionsInput.fill('');
  await vacanciesPage.numberOfPositionsInput.fill('5');

  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/v2/recruitment/vacancies/${vacancyId}`) && r.request().method() === 'PUT',
    ),
    vacanciesPage.save(),
  ]);

  report.step('[API] Verify response PUT status, dan perubahan persisten setelah reload');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);

  await vacanciesPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `Vacancy "${newName}" muncul di list dengan nama baru`,
    await vacanciesPage.rowByName(newName).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  await vacanciesPage.gotoEditForm(vacancyId);
  await page.waitForTimeout(1200);
  const persistedName = await vacanciesPage.vacancyNameInput.inputValue().catch(() => '');
  const persistedPositions = await vacanciesPage.numberOfPositionsInput.inputValue().catch(() => '');
  report.check('Vacancy Name persisten setelah reload', persistedName === newName, `persistedName=${persistedName}`);
  report.check('Number of Positions persisten setelah reload (=5)', persistedPositions === '5', `persistedPositions=${persistedPositions}`);

  report.print();
});
