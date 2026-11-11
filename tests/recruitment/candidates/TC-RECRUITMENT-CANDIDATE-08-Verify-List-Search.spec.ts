/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-08: Verify List Search
 * Modul    : Recruitment - Candidates
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-08-Verify-List-Search.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi candidate baru yang dibuat muncul di list Candidates
 *   setelah di-refresh.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-08-Verify-List-Search.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName, uniqueEmail } from '../../../src/data/testData';

const VALID_PDF_BUFFER = Buffer.from('%PDF-1.4 minimal valid-looking resume content');

test('TC-RECRUITMENT-CANDIDATE-08: a newly created candidate appears in the list', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-08', 'List Search', env.baseURL, page);
  const { firstName, lastName } = uniqueEmployeeName('QaListCand');
  const fullName = `${firstName} ${lastName}`;

  report.step('Buat candidate baru');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.selectFirstVacancy();
  await candidatesPage.emailInput.fill(uniqueEmail('qalistcand'));
  await candidatesPage.fileInput.setInputFiles({
    name: 'resume.pdf',
    mimeType: 'application/pdf',
    buffer: VALID_PDF_BUFFER,
  });
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/recruitment/candidates') && r.request().method() === 'POST'),
    candidatesPage.save(),
  ]);
  await page.waitForTimeout(1000);

  report.step('Verify candidate muncul di list Candidates (lompat ke halaman terakhir, list terpaginasi)');
  await candidatesPage.goto();
  await page.waitForTimeout(2500);
  await candidatesPage.gotoLastPage();
  report.check(
    `Candidate "${fullName}" muncul di list`,
    await isVisibleWithWait(candidatesPage.rowByText(fullName).first()),
  );

  report.print();
});
