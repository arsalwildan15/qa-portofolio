/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-14: Verify Number Of Positions Zero
 * Modul    : Recruitment - Vacancies
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-14-Verify-Number-Of-Positions-Zero.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi perilaku Add Vacancy saat Number of Positions diisi "0".
 *   [CONFIRMED via discovery run]: DITOLAK client-side dengan pesan error
 *   persis "Should be a number between 1-99", POST tidak pernah terkirim.
 *   Ini perilaku deterministik (bukan ambigu), jadi dipakai hard check,
 *   bukan report.finding().
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-14-Verify-Number-Of-Positions-Zero.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-VACANCY-14: Number of Positions = 0 is rejected', async ({
  page,
  vacanciesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-14', 'Number Of Positions Zero', env.baseURL, page);

  let postFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/recruitment/vacancies')) postFired = true;
  });

  report.step('Isi form Add Vacancy valid, Number of Positions = "0", klik Save');
  await vacanciesPage.gotoAddForm();
  await vacanciesPage.vacancyNameInput.fill(uniqueName('QaPositionsZero'));
  await vacanciesPage.jobTitleSelect.click();
  await page.getByRole('option').nth(1).click();
  await vacanciesPage.fillFirstHiringManager();
  await vacanciesPage.numberOfPositionsInput.fill('0');
  await vacanciesPage.save();
  await page.waitForTimeout(1000);

  report.step('Verify: pesan error range muncul, POST tidak terkirim');
  const errorText = await vacanciesPage.fieldErrors.first().textContent().catch(() => null);
  report.check('Pesan error "Should be a number between 1-99" muncul', errorText?.includes('between 1-99') ?? false, `errorText=${errorText}`);
  report.check('POST vacancies TIDAK terkirim', postFired === false);

  report.print();
});
