/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-07: Verify Mark Interview Failed Fresh Candidate
 * Modul    : Recruitment - Status Workflow
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-07-Verify-Mark-Interview-Failed-Fresh-Candidate.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi candidate "Interview Scheduled" bisa ditandai "Mark
 *   Interview Failed", dan status berubah jadi "Interview Failed". TC ini
 *   sengaja dijalankan di candidate yang baru dibuat (fresh, bukan data
 *   seed lama) untuk membuktikan alur ini bekerja bersih tanpa terkena bug
 *   stuck-loading yang didokumentasikan di
 *   TC-RECRUITMENT-STATUS-09 (lihat juga docs/TC-Recruitment.txt).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-07-Verify-Mark-Interview-Failed-Fresh-Candidate.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';
import { shortlistCandidate, scheduleInterviewForCandidate } from '../../../src/utils/advanceCandidateStatus';

test('TC-RECRUITMENT-STATUS-07: marking a fresh Interview Scheduled candidate as Interview Failed works cleanly', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-07', 'Mark Interview Failed Fresh Candidate', env.baseURL, page);

  report.step('Buat candidate baru, Shortlist, Schedule Interview, lalu Mark Interview Failed');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaStatusIntFailed');
  await shortlistCandidate(page, candidatesPage, candidateId);
  await scheduleInterviewForCandidate(page, candidatesPage, candidateId);

  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  await candidatesPage.statusActionButton('Mark Interview Failed').click();
  await page.waitForTimeout(800);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/recruitment/candidates') && r.request().method() !== 'GET', { timeout: 10_000 }),
    candidatesPage.save(),
  ]);
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}, url=${resp.url()}`);

  report.step('Verify status berubah jadi "Interview Failed" tanpa stuck-loading');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  const statusText = await candidatesPage.statusText.textContent({ timeout: 5_000 }).catch(() => null);
  report.check('Status = "Interview Failed"', statusText?.includes('Interview Failed') ?? false, `statusText=${statusText}`);

  report.print();
});
