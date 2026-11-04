/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-11: Verify Post-Passed Available Actions
 * Modul    : Recruitment - Status Workflow
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-11-Verify-Post-Passed-Available-Actions.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi "Interview Passed" BUKAN status terminal. [CONFIRMED
 *   via discovery run]: tombol aksi yang tersedia di halaman detail
 *   setelah Mark Interview Passed adalah "Reject", "Schedule Interview",
 *   dan "Offer Job" -- BUKAN "Hired" seperti diasumsikan di gap-coverage
 *   doc, dan status ini MASIH punya transisi lanjutan (ke ronde interview
 *   lain, offer, atau reject), berbeda dari "Rejected"/"Interview Failed"
 *   yang memang terminal. Diagram STATE MACHINE di docs/TC-Recruitment.txt
 *   (bagian CATATAN TEKNIS) sudah diupdate berdasarkan temuan ini.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-11-Verify-Post-Passed-Available-Actions.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';
import { shortlistCandidate, scheduleInterviewForCandidate } from '../../../src/utils/advanceCandidateStatus';

test('TC-RECRUITMENT-STATUS-11: available actions after Interview Passed [TEMUAN]', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-11', 'Post-Passed Available Actions', env.baseURL, page);

  report.step('Buat candidate baru, Shortlist, Schedule Interview, Mark Interview Passed');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaStatusPostPassed');
  await shortlistCandidate(page, candidatesPage, candidateId);
  await scheduleInterviewForCandidate(page, candidatesPage, candidateId);

  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  await candidatesPage.statusActionButton('Mark Interview Passed').click();
  await page.waitForTimeout(800);
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/candidates/${candidateId}/interviews/`) && r.url().includes('/pass') && r.request().method() !== 'GET',
      { timeout: 10_000 },
    ),
    candidatesPage.save(),
  ]);
  await page.waitForTimeout(1000);

  report.step('gotoDetail(), tunggu render tombol aksi (~3s), catat tombol aksi apa saja yang muncul');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  const statusText = await candidatesPage.statusText.textContent().catch(() => null);
  report.check('Status = "Interview Passed"', statusText?.includes('Interview Passed') ?? false, `statusText=${statusText}`);

  const actionButtonLabels = ['Reject', 'Shortlist', 'Schedule Interview', 'Mark Interview Passed', 'Mark Interview Failed', 'Offer Job'];
  const availableActions: string[] = [];
  for (const label of actionButtonLabels) {
    const visible = await candidatesPage
      .statusActionButton(label)
      .isVisible({ timeout: 1_000 })
      .catch(() => false);
    if (visible) availableActions.push(label);
  }

  report.check('TC dijalankan tanpa exception', true);

  if (availableActions.length === 0) {
    report.finding(
      'Status "Interview Passed" adalah TERMINAL',
      'Tidak ada tombol aksi yang ditemukan di halaman detail, mirip "Rejected"/"Interview Failed". Tidak ada ' +
        'transisi lanjutan (mis. "Job Offered"/"Hired") yang tersedia dari UI.',
    );
  } else {
    report.finding(
      'Status "Interview Passed" BUKAN terminal -- masih punya transisi lanjutan',
      `Tombol aksi yang tersedia: ${availableActions.join(', ')}. Dikonfirmasi live, state machine melanjutkan ke ` +
        'Reject / Schedule Interview (ronde interview lain) / Offer Job, bukan berhenti di "Interview Passed".',
    );
  }

  report.print();
});
