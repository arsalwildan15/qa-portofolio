/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-06: Verify Interview Scheduled Reject
 * Modul    : Recruitment - Status Workflow
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-06-Verify-Interview-Scheduled-Reject.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi candidate dengan status "Interview Scheduled" bisa
 *   di-Reject, dan status berubah jadi "Rejected".
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-06-Verify-Interview-Scheduled-Reject.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';
import { shortlistCandidate, scheduleInterviewForCandidate } from '../../../src/utils/advanceCandidateStatus';

test('TC-RECRUITMENT-STATUS-06: rejecting an Interview Scheduled candidate moves it to Rejected', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-06', 'Interview Scheduled Reject', env.baseURL, page);

  report.step('Buat candidate baru, Shortlist, Schedule Interview, lalu Reject');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaStatusIntReject');
  await shortlistCandidate(page, candidatesPage, candidateId);
  await scheduleInterviewForCandidate(page, candidatesPage, candidateId);

  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  await candidatesPage.statusActionButton('Reject').click();
  await page.waitForTimeout(800);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/recruitment/candidates') && r.request().method() !== 'GET', { timeout: 10_000 }),
    candidatesPage.save(),
  ]);
  report.check('[API] status reject === 200', resp.status() === 200, `status=${resp.status()}`);

  report.step('Verify status berubah jadi "Rejected"');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  const statusText = await candidatesPage.statusText.textContent().catch(() => null);
  report.check('Status = "Rejected"', statusText?.includes('Rejected') ?? false, `statusText=${statusText}`);

  report.print();
});
