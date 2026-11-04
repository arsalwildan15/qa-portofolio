/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-04: Verify Schedule Interview Valid
 * Modul    : Recruitment - Status Workflow
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-04-Verify-Schedule-Interview-Valid.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi candidate "Shortlisted" bisa dijadwalkan interview
 *   (action=4) dengan mengisi Interview Title, Interviewer (async
 *   autocomplete), dan Date, lalu status berubah jadi "Interview
 *   Scheduled" via [API] POST .../shedule-interview (typo asli di app).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-04-Verify-Schedule-Interview-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';
import { shortlistCandidate } from '../../../src/utils/advanceCandidateStatus';

test('TC-RECRUITMENT-STATUS-04: scheduling an interview for a Shortlisted candidate succeeds', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-04', 'Schedule Interview Valid', env.baseURL, page);

  report.step('Buat candidate baru, Shortlist, lalu klik Schedule Interview');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaStatusInterview');
  await shortlistCandidate(page, candidatesPage, candidateId);

  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  await candidatesPage.statusActionButton('Schedule Interview').click();
  await page.waitForTimeout(800);
  report.check('URL mengandung selectedAction=4', page.url().includes('selectedAction=4'), `url=${page.url()}`);

  report.step('Isi Interview Title, Interviewer, Date, klik Save');
  await candidatesPage.interviewTitleInput.fill('QA Automation Interview');
  await candidatesPage.selectFirstInterviewer();
  await candidatesPage.interviewDateInput.fill('2026-15-11');
  await page.waitForTimeout(500);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('shedule-interview') && r.request().method() !== 'GET', { timeout: 10_000 }),
    candidatesPage.save(),
  ]);
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.step('Verify status berubah jadi "Interview Scheduled"');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  const statusText = await candidatesPage.statusText.textContent().catch(() => null);
  report.check('Status = "Interview Scheduled"', statusText?.includes('Interview Scheduled') ?? false, `statusText=${statusText}`);

  report.print();
});
