/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-10: Verify Mark Interview Passed
 * Modul    : Recruitment - Status Workflow
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-10-Verify-Mark-Interview-Passed.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi candidate "Interview Scheduled" bisa di-"Mark Interview
 *   Passed". [CONFIRMED via discovery run]:
 *     - Form konfirmasi HANYA berisi field readonly (Candidate/Vacancy/
 *       Hiring Manager/Current Status) + Notes (opsional, bukan field
 *       baru yang belum pernah dieksplorasi selain itu).
 *     - Endpoint asli: PUT /api/v2/recruitment/candidates/<id>/interviews/
 *       <interviewId>/pass, body {"note":null} kalau Notes dikosongkan.
 *     - Status PERSIS berubah jadi "Interview Passed" (BUKAN "Hired",
 *       update dari asumsi awal di gap-coverage doc).
 *     - Candidate History mencatat transisi ini (baris baru di tabel).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-10-Verify-Mark-Interview-Passed.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';
import { shortlistCandidate, scheduleInterviewForCandidate } from '../../../src/utils/advanceCandidateStatus';

test('TC-RECRUITMENT-STATUS-10: marking an Interview Scheduled candidate as Passed succeeds', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-10', 'Mark Interview Passed', env.baseURL, page);

  report.step('Buat candidate baru, Shortlist, Schedule Interview');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaStatusPassed');
  await shortlistCandidate(page, candidatesPage, candidateId);
  await scheduleInterviewForCandidate(page, candidatesPage, candidateId);

  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  const historyCountBefore = await candidatesPage.historyRows.count();

  report.step('gotoDetail(), tunggu render tombol aksi (~3s), klik "Mark Interview Passed"');
  await candidatesPage.statusActionButton('Mark Interview Passed').click();
  await page.waitForTimeout(800);
  report.check('URL mengandung selectedAction=5', page.url().includes('selectedAction=5'), `url=${page.url()}`);

  report.step('Field tambahan selain Notes TIDAK ada (readonly fields + Notes saja), klik Save');
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/candidates/${candidateId}/interviews/`) && r.url().includes('/pass') && r.request().method() !== 'GET',
      { timeout: 10_000 },
    ),
    candidatesPage.save(),
  ]);
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.step('Verify status berubah jadi "Interview Passed" (bukan "Hired")');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  const statusText = await candidatesPage.statusText.textContent().catch(() => null);
  report.check('Status = "Interview Passed"', statusText?.includes('Interview Passed') ?? false, `statusText=${statusText}`);

  report.step('Verify Candidate History mencatat transisi ini');
  const historyCountAfter = await candidatesPage.historyRows.count();
  report.check(
    'Jumlah baris Candidate History bertambah setelah Mark Interview Passed',
    historyCountAfter > historyCountBefore,
    `before=${historyCountBefore}, after=${historyCountAfter}`,
  );

  report.print();
});
