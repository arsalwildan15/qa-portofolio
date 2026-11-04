/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-02: Verify Empty Submit Validation
 * Modul    : Recruitment - Vacancies
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add Vacancy kosong menampilkan validasi
 *   required dan tidak mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-RECRUITMENT-VACANCY-02: submitting an empty Add Vacancy form shows required validation', async ({
  page,
  vacanciesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-02', 'Empty Submit Validation', env.baseURL, page);

  let postFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/vacancies')) postFired = true;
  });

  report.step('Navigate ke Add Vacancy, langsung klik Save tanpa isi apa pun');
  await vacanciesPage.gotoAddForm();
  await vacanciesPage.save();
  await page.waitForTimeout(1000);

  report.step('Verify: pesan error Required muncul, POST tidak terkirim');
  const errorCount = await vacanciesPage.fieldErrors.count();
  report.check('Minimal 1 pesan error Required muncul', errorCount > 0, `errorCount=${errorCount}`);
  report.check('POST vacancies TIDAK terkirim', postFired === false);

  report.print();
});
