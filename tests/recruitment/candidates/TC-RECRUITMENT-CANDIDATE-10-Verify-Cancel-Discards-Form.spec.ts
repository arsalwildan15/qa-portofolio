/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-10: Verify Cancel Discards Form
 * Modul    : Recruitment - Candidates
 * Kategori : Edge Case
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-10-Verify-Cancel-Discards-Form.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel di Add Candidate tidak mengirim POST dan
 *   tidak menyimpan candidate.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-10-Verify-Cancel-Discards-Form.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName, uniqueEmail } from '../../../src/data/testData';

test('TC-RECRUITMENT-CANDIDATE-10: clicking Cancel discards the form without saving', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-10', 'Cancel Discards Form', env.baseURL, page);
  const { firstName, lastName } = uniqueEmployeeName('QaCancelCand');
  const fullName = `${firstName} ${lastName}`;

  report.step('Isi form Add Candidate, klik Cancel (bukan Save)');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.emailInput.fill(uniqueEmail('qacancelcand'));

  let postFired = false;
  page.on('request', (r) => {
    if (r.url().includes('/api/v2/recruitment/candidates') && r.method() === 'POST') postFired = true;
  });
  await candidatesPage.cancelButton.click();
  await page.waitForTimeout(1000);

  report.step('Verify: candidate tidak tersimpan di list');
  report.check('POST candidates TIDAK terkirim', !postFired);
  await candidatesPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `Candidate "${fullName}" TIDAK muncul di list`,
    (await candidatesPage.rowByText(fullName).count()) === 0,
  );

  report.print();
});
