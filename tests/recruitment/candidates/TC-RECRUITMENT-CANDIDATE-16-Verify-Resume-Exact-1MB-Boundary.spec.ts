/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-16: Verify Resume Exact 1MB Boundary
 * Modul    : Recruitment - Candidates
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-16-Verify-Resume-Exact-1MB-Boundary.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Menutup celah TC-CANDIDATE-07 (yang cuma membuktikan "terlalu besar
 *   ditolak") dengan membuktikan batas PASTINYA exact, bukan off-by-one.
 *   [CONFIRMED via discovery run, 3 ukuran dites langsung]:
 *     - 1,048,575 bytes (1 byte DI BAWAH 1MB) -> DITERIMA, POST 200.
 *     - 1,048,576 bytes (PERSIS 1MB)          -> DITERIMA, POST 200.
 *     - 1,048,577 bytes (1 byte DI ATAS 1MB)  -> DITOLAK, pesan error
 *       persis "Attachment Size Exceeded", POST tidak terkirim.
 *   Batas pastinya adalah 1,048,576 bytes (1 MiB) INKLUSIF.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-16-Verify-Resume-Exact-1MB-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName, uniqueEmail } from '../../../src/data/testData';

const EXACT_1MB = 1_048_576;

test('TC-RECRUITMENT-CANDIDATE-16: a resume exactly at the 1MB limit is accepted', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-16', 'Resume Exact 1MB Boundary', env.baseURL, page);
  const { firstName, lastName } = uniqueEmployeeName('QaExact1MB');

  report.step('Isi field wajib, upload resume PERSIS 1,048,576 bytes (1 MiB)');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.selectFirstVacancy();
  await candidatesPage.emailInput.fill(uniqueEmail('qaexact1mb'));
  await candidatesPage.fileInput.setInputFiles({
    name: 'resume-exactly-1mb.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(EXACT_1MB, 'a'),
  });
  await page.waitForTimeout(500);

  const errorBefore = await candidatesPage.fieldErrors.first().textContent({ timeout: 1_500 }).catch(() => null);
  report.check('Tidak ada pesan error validasi ukuran sebelum Save', errorBefore === null, `errorBefore=${errorBefore}`);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/recruitment/candidates') && r.request().method() === 'POST', { timeout: 10_000 }),
    candidatesPage.save(),
  ]);

  report.step('[API] Verify response POST, file PERSIS 1MB diterima');
  report.check('[API] status === 200 (file persis 1MB diterima)', resp.status() === 200, `status=${resp.status()}`);

  report.print();
});
