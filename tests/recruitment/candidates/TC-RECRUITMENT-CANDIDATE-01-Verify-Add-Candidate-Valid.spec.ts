/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-01: Verify Add Candidate Valid
 * Modul    : Recruitment - Candidates
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-01-Verify-Add-Candidate-Valid.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Candidate baru (Full Name, Vacancy, Email,
 *   Resume PDF) berhasil tersimpan via POST /api/v2/recruitment/candidates.
 *
 * [API] POST sukses mengembalikan body {"data":{"id":N,...}}. SPA TIDAK
 *   mengubah URL bar menjadi /addCandidate/<id> setelah Save (tetap di
 *   /addCandidate, dikonfirmasi live), jadi id kandidat WAJIB diambil
 *   dari response body, bukan dari page.url().
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-01-Verify-Add-Candidate-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName, uniqueEmail } from '../../../src/data/testData';

const VALID_PDF_BUFFER = Buffer.from('%PDF-1.4 minimal valid-looking resume content');

test('TC-RECRUITMENT-CANDIDATE-01: adding a candidate with valid data and resume succeeds', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-01', 'Add Candidate Valid', env.baseURL, page);
  const { firstName, lastName } = uniqueEmployeeName('QaCandidate');

  report.step('Isi Full Name, pilih Vacancy, isi Email, upload Resume, klik Save');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  const vacancyName = await candidatesPage.selectFirstVacancy();
  await candidatesPage.emailInput.fill(uniqueEmail('qacandidate'));
  await candidatesPage.fileInput.setInputFiles({
    name: 'resume.pdf',
    mimeType: 'application/pdf',
    buffer: VALID_PDF_BUFFER,
  });

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/recruitment/candidates') && r.request().method() === 'POST'),
    candidatesPage.save(),
  ]);

  report.step('Verify response POST candidates berhasil');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}, vacancy=${vacancyName}`);
  const body = await resp.json().catch(() => null);
  report.check('[API] response body punya data.id', typeof body?.data?.id === 'number', `id=${body?.data?.id}`);

  report.print();
});
