/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-09: Verify Delete Candidate
 * Modul    : Recruitment - Candidates
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-09-Verify-Delete-Candidate.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menghapus candidate berhasil via [API] DELETE
 *   /api/v2/recruitment/candidates/<id>, dan candidate yang sudah dihapus
 *   tidak lagi bisa diakses di halaman detail-nya.
 *
 * [CATATAN] List Candidates terpaginasi dengan 75+ record seeded dan terus
 *   bertambah; mencari row via UI (nama/pagination) tidak reliable untuk
 *   candidate yang baru saja dibuat karena posisi halamannya bergeser antar
 *   run. DELETE dipanggil langsung lewat page.request (cookies browser
 *   context yang sama) menggunakan id dari response POST create, sama
 *   seperti TC lain di suite ini yang menandai hasil [API].
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-09-Verify-Delete-Candidate.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName, uniqueEmail } from '../../../src/data/testData';

const VALID_PDF_BUFFER = Buffer.from('%PDF-1.4 minimal valid-looking resume content');

test('TC-RECRUITMENT-CANDIDATE-09: deleting a candidate removes it from the list', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-09', 'Delete Candidate', env.baseURL, page);
  const { firstName, lastName } = uniqueEmployeeName('QaDeleteCand');

  report.step('Buat candidate baru untuk dihapus, ambil id dari response POST');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.selectFirstVacancy();
  await candidatesPage.emailInput.fill(uniqueEmail('qadeletecand'));
  await candidatesPage.fileInput.setInputFiles({
    name: 'resume.pdf',
    mimeType: 'application/pdf',
    buffer: VALID_PDF_BUFFER,
  });
  const [createResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/recruitment/candidates') && r.request().method() === 'POST'),
    candidatesPage.save(),
  ]);
  const candidateId = (await createResp.json())?.data?.id;

  report.step(`Hapus candidate id=${candidateId} via [API] DELETE`);
  const deleteResp = await page.context().request.delete(
    `${env.baseURL}/web/index.php/api/v2/recruitment/candidates`,
    { data: { ids: [candidateId] } },
  );
  report.check('[API] status DELETE 2xx', deleteResp.status() >= 200 && deleteResp.status() < 300, `status=${deleteResp.status()}`);

  report.step('Verify candidate yang sudah dihapus tidak lagi bisa diakses via detail page');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(1500);
  const notFoundIndicator = await page
    .getByText(/not found|no record|invalid/i)
    .first()
    .isVisible({ timeout: 2_000 })
    .catch(() => false);
  const stillShowsName = await page
    .getByText(`${firstName} ${lastName}`, { exact: false })
    .first()
    .isVisible({ timeout: 2_000 })
    .catch(() => false);
  report.check(
    'Candidate yang sudah dihapus tidak lagi tampil di detail page',
    notFoundIndicator || !stillShowsName,
    `notFoundIndicator=${notFoundIndicator}, stillShowsName=${stillShowsName}`,
  );

  report.print();
});
