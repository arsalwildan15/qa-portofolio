/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-02: Verify Empty Submit Validation
 * Modul    : Recruitment - Candidates
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add Candidate kosong menampilkan validasi
 *   required (Full Name, Vacancy, Email) dan tidak mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-RECRUITMENT-CANDIDATE-02: submitting an empty Add Candidate form shows required validation', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-02', 'Empty Submit Validation', env.baseURL, page);

  let postFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/candidates')) postFired = true;
  });

  report.step('Navigate ke Add Candidate, langsung klik Save tanpa isi apa pun');
  await candidatesPage.gotoAddForm();
  await candidatesPage.save();
  await page.waitForTimeout(1000);

  report.step('Verify: pesan error Required muncul, POST tidak terkirim');
  const errorCount = await candidatesPage.fieldErrors.count();
  report.check('Minimal 1 pesan error Required muncul', errorCount > 0, `errorCount=${errorCount}`);
  report.check('POST candidates TIDAK terkirim', postFired === false);

  report.print();
});
