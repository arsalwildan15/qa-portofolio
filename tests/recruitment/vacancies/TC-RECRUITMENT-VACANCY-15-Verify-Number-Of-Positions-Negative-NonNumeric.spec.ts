/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-15: Verify Number Of Positions Negative/Non-Numeric
 * Modul    : Recruitment - Vacancies
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-15-Verify-Number-Of-Positions-Negative-NonNumeric.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi "-1" dan "abc" di Number of Positions sama-sama ditolak.
 *   [CONFIRMED via discovery run]: keduanya ditolak client-side dengan
 *   pesan error PERSIS SAMA "Should be a numeric value" (bukan pesan
 *   range seperti TC-VACANCY-14), POST tidak pernah terkirim di kedua
 *   kasus.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-15-Verify-Number-Of-Positions-Negative-NonNumeric.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-VACANCY-15: Number of Positions negative or non-numeric is rejected', async ({
  page,
  vacanciesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-15', 'Number Of Positions Negative/NonNumeric', env.baseURL, page);

  let postFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/recruitment/vacancies')) postFired = true;
  });

  async function fillAndSave(value: string) {
    await vacanciesPage.gotoAddForm();
    await vacanciesPage.vacancyNameInput.fill(uniqueName('QaPositionsEdge'));
    await vacanciesPage.jobTitleSelect.click();
    await page.getByRole('option').nth(1).click();
    await vacanciesPage.fillFirstHiringManager();
    await vacanciesPage.numberOfPositionsInput.fill(value);
    await vacanciesPage.save();
    await page.waitForTimeout(1000);
    return vacanciesPage.fieldErrors.first().textContent().catch(() => null);
  }

  report.step('Isi Number of Positions = "-1", klik Save');
  const errNeg = await fillAndSave('-1');
  report.check('Pesan error "Should be a numeric value" muncul untuk "-1"', errNeg?.includes('numeric value') ?? false, `errNeg=${errNeg}`);

  report.step('Isi Number of Positions = "abc", klik Save');
  const errAbc = await fillAndSave('abc');
  report.check('Pesan error "Should be a numeric value" muncul untuk "abc"', errAbc?.includes('numeric value') ?? false, `errAbc=${errAbc}`);

  report.check('Tidak ada POST vacancies yang terkirim dengan payload tidak valid', postFired === false);

  report.print();
});
