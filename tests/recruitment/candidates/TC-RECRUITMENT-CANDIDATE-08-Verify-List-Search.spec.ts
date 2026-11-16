/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-08: Verify List Search
 * Modul    : Recruitment - Candidates
 * Kategori : Positive (+) 1.6
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-08-Verify-List-Search.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi candidate baru yang dibuat bisa ditemukan lewat pencarian
 *   list Candidates (filter Candidate Name -> Search).
 *
 * PERBAIKAN 17 Nov 2026 (BG-064 ditutup, bukan bug aplikasi): versi lama
 *   melompat ke "halaman terakhir" dan berasumsi kandidat baru ada di sana,
 *   padahal list diurutkan menurut Date of Application (DESC), bukan urutan
 *   dibuat, dan demo publik diisi pengguna lain. Kini memakai pencarian
 *   nama + menghapus kandidat uji di akhir.
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
  const [created] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/recruitment/candidates') && r.request().method() === 'POST'),
    candidatesPage.save(),
  ]);
  const candidateId = ((await created.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;

  try {
    report.step('Cari candidate lewat filter Candidate Name di list Candidates');
    await candidatesPage.goto();
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('Type for hints...').fill(lastName);
    const option = page.getByRole('option').filter({ hasText: lastName }).first();
    await option.waitFor({ timeout: 20_000 }).catch(() => null);
    report.check(`1.6 Saran Candidate Name menawarkan "${fullName}"`, await option.isVisible());
    await option.click().catch(() => null);
    const list = page.waitForResponse((r) => r.url().includes('/api/v2/recruitment/candidates?'), { timeout: 20_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Search' }).click();
    await list;
    await page.waitForLoadState('networkidle');
    report.check(
      `1.6 Candidate "${fullName}" muncul di hasil pencarian list`,
      await isVisibleWithWait(candidatesPage.rowByText(fullName).first()),
    );
  } finally {
    if (candidateId) await page.request.delete('/web/index.php/api/v2/recruitment/candidates', { data: { ids: [candidateId] } });
  }

  report.print();
});
