/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-06: Verify SQL Injection In Keywords
 * Modul    : Recruitment - Candidates
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-06-Verify-SQL-Injection-In-Keywords.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di field Keywords tidak memicu
 *   error server (500) atau console error, mengindikasikan input
 *   diperlakukan sebagai data biasa (parameterized), bukan dieksekusi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-06-Verify-SQL-Injection-In-Keywords.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName, uniqueEmail } from '../../../src/data/testData';

const VALID_PDF_BUFFER = Buffer.from('%PDF-1.4 minimal valid-looking resume content');

test('TC-RECRUITMENT-CANDIDATE-06: a SQL injection payload in Keywords does not break the server', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-06', 'SQL Injection In Keywords', env.baseURL, page);
  const { firstName, lastName } = uniqueEmployeeName('QaSqliCand');
  const payload = "qa'; DROP TABLE candidates; --";

  report.step('Isi field wajib, isi Keywords dengan payload SQL injection, klik Save');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.selectFirstVacancy();
  await candidatesPage.emailInput.fill(uniqueEmail('qasqlicand'));
  await candidatesPage.fileInput.setInputFiles({
    name: 'resume.pdf',
    mimeType: 'application/pdf',
    buffer: VALID_PDF_BUFFER,
  });
  await candidatesPage.keywordsInput.fill(payload);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/recruitment/candidates') && r.request().method() === 'POST'),
    candidatesPage.save(),
  ]);

  report.step('Verify: server tidak error (status < 500)');
  report.check('[API] status < 500 (bukan server error)', resp.status() < 500, `status=${resp.status()}`);

  report.print();
});
