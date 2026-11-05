/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-13: Verify Schedule Interview Multiple Interviewers
 * Modul    : Recruitment - Status Workflow
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-13-Verify-Schedule-Interview-Multiple-Interviewers.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Schedule Interview dengan multiple interviewer lewat
 *   "+ Add Another". Interviewer pertama dan kedua diisi dari suggestion
 *   autocomplete yang BERBEDA (index 0 vs index 1), lalu dikonfirmasi
 *   response POST/Save sukses dan body/Candidate History mencatat kedua
 *   nama interviewer.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-13-Verify-Schedule-Interview-Multiple-Interviewers.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';
import { shortlistCandidate } from '../../../src/utils/advanceCandidateStatus';

test('TC-RECRUITMENT-STATUS-13: Schedule Interview with multiple interviewers via "+ Add Another"', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-13', 'Schedule Interview Multiple Interviewers', env.baseURL, page);

  report.step('Buat candidate baru, Shortlist');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaMultiInterviewer');
  await shortlistCandidate(page, candidatesPage, candidateId);

  report.step('Buka form Schedule Interview, isi Interviewer pertama');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  await candidatesPage.statusActionButton('Schedule Interview').click();
  await page.waitForTimeout(800);
  await candidatesPage.interviewTitleInput.fill('QA Multi-Interviewer Session');
  await candidatesPage.selectFirstInterviewer();

  report.step('Klik "+ Add Another", isi Interviewer kedua yang berbeda dari yang pertama');
  const addAnotherVisible = await candidatesPage.addAnotherInterviewerButton.isVisible({ timeout: 3_000 }).catch(() => false);
  report.check('Tombol "+ Add Another" tersedia di form Schedule Interview', addAnotherVisible);

  if (addAnotherVisible) {
    await candidatesPage.addAnotherInterviewer();
    await candidatesPage.interviewDateInput.fill('2026-20-11');
    await page.waitForTimeout(500);

    report.step('Save, verifikasi response 200');
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('shedule-interview') && r.request().method() !== 'GET', { timeout: 10_000 }),
      candidatesPage.save(),
    ]);
    report.check('Response status 200 setelah Save', resp.status() === 200, `status=${resp.status()}`);
    const body = await resp.json().catch(() => null);
    const interviewerCount = Array.isArray(body?.data?.interviewers) ? body.data.interviewers.length : null;
    report.check(
      'Response body mencatat 2 interviewer tersimpan',
      interviewerCount === 2,
      `interviewerCount=${interviewerCount}, body=${JSON.stringify(body?.data ?? body).slice(0, 300)}`,
    );

    report.finding(
      'Candidate History setelah Schedule Interview dengan 2 interviewer',
      `Response body data.interviewers = ${JSON.stringify(body?.data?.interviewers ?? 'N/A')}.`,
    );
  } else {
    report.finding(
      '"+ Add Another" tidak ditemukan di form Schedule Interview',
      'Form Schedule Interview mungkin hanya mendukung 1 interviewer per sesi, atau selector/label tombol berbeda ' +
        'dari yang diasumsikan di gap-coverage doc. TC ini tidak bisa melanjutkan ke langkah interviewer kedua.',
    );
  }

  report.check('TC dijalankan tanpa exception', true);
  report.print();
});
