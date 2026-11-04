/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-06: Verify Cancel Discards Form
 * Modul    : Recruitment - Vacancies
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-06-Verify-Cancel-Discards-Form.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel di Add Vacancy membatalkan form (tidak
 *   tersimpan) dan kembali ke list Vacancies.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-06-Verify-Cancel-Discards-Form.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-VACANCY-06: clicking Cancel discards the form without saving', async ({
  page,
  vacanciesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-06', 'Cancel Discards Form', env.baseURL, page);
  const vacancyName = uniqueName('QaCancelVacancy');

  let postFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/vacancies')) postFired = true;
  });

  report.step('Isi Vacancy Name, klik Cancel (bukan Save)');
  await vacanciesPage.gotoAddForm();
  await vacanciesPage.vacancyNameInput.fill(vacancyName);
  await vacanciesPage.cancelButton.click();
  await page.waitForTimeout(1200);

  report.step('Verify: vacancy tidak tersimpan di list');
  report.check('POST vacancies TIDAK terkirim', postFired === false);
  await vacanciesPage.goto();
  await page.waitForTimeout(1000);
  report.check(
    `Vacancy "${vacancyName}" TIDAK muncul di list`,
    (await vacanciesPage.rowByName(vacancyName).count()) === 0,
  );

  report.print();
});
