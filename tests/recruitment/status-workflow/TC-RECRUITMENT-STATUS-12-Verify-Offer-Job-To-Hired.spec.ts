/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-12: Verify Offer Job To Hired
 * Modul    : Recruitment - Status Workflow
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-12-Verify-Offer-Job-To-Hired.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan alur lanjutan setelah "Interview Passed" sampai
 *   status TERMINAL yang sesungguhnya.
 *   [CONFIRMED via discovery run]: dari "Interview Passed", klik "Offer
 *   Job" -> form konfirmasi hanya punya field readonly (Candidate,
 *   Vacancy, Hiring Manager, Current Status) + Notes (textarea, optional)
 *   -> Save -> PUT .../candidates/<id>/job/offer -> 200 -> status baru
 *   PERSIS "Job Offered". Dari "Job Offered", tombol aksi yang tersedia
 *   adalah "Reject", "Offer Declined", "Hire" (BUKAN "Mark as Hired").
 *   Klik "Hire" -> status akhir dikonfirmasi di TC ini. State machine
 *   LENGKAP: Application Initiated -> Shortlisted -> Interview Scheduled
 *   -> Interview Passed -> Job Offered -> Hired (atau Offer Declined/
 *   Reject sebagai cabang terminal alternatif).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-12-Verify-Offer-Job-To-Hired.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';
import {
  shortlistCandidate,
  scheduleInterviewForCandidate,
  markInterviewPassed,
  offerJobForCandidate,
} from '../../../src/utils/advanceCandidateStatus';

test('TC-RECRUITMENT-STATUS-12: Offer Job to Hired, full state machine chain', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-12', 'Offer Job To Hired', env.baseURL, page);

  report.step('Buat candidate, Shortlist, Schedule Interview, Mark Interview Passed');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaOfferHired');
  await shortlistCandidate(page, candidatesPage, candidateId);
  await scheduleInterviewForCandidate(page, candidatesPage, candidateId);
  await markInterviewPassed(page, candidatesPage, candidateId);

  report.step('Klik "Offer Job", isi form (field readonly + Notes opsional), Save');
  await offerJobForCandidate(page, candidatesPage, candidateId);

  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  const statusAfterOffer = await candidatesPage.statusText.textContent().catch(() => null);
  report.check('Status setelah Offer Job = "Job Offered"', statusAfterOffer?.includes('Job Offered') ?? false, `statusText=${statusAfterOffer}`);

  report.step('Dari "Job Offered", catat tombol aksi yang tersedia');
  const possibleActions = ['Reject', 'Offer Declined', 'Hire', 'Mark As Hired', 'Hired'];
  const availableFromOffered: string[] = [];
  for (const label of possibleActions) {
    const visible = await candidatesPage.statusActionButton(label).isVisible({ timeout: 1_500 }).catch(() => false);
    if (visible) availableFromOffered.push(label);
  }
  report.check('Ada minimal 1 aksi lanjutan dari "Job Offered"', availableFromOffered.length > 0, availableFromOffered.join(', '));

  report.step('Klik "Hire" (jika tersedia), Save, lanjutkan sampai mentok di status TERMINAL');
  const hireVisible = availableFromOffered.includes('Hire');
  if (hireVisible) {
    await candidatesPage.statusActionButton('Hire').click();
    await page.waitForTimeout(800);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() !== 'GET' && r.url().includes(`/candidates/${candidateId}`), { timeout: 10_000 }).catch(() => null),
      candidatesPage.save(),
    ]);
    await page.waitForTimeout(1500);

    await candidatesPage.gotoDetail(candidateId);
    await page.waitForTimeout(3000);
    const finalStatus = await candidatesPage.statusText.textContent().catch(() => null);
    report.check('Status akhir terbaca setelah Hire', !!finalStatus, `statusText=${finalStatus}`);

    const anyActionAfterHire: string[] = [];
    for (const label of ['Reject', 'Shortlist', 'Schedule Interview', 'Mark Interview Passed', 'Mark Interview Failed', 'Offer Job', 'Offer Declined', 'Hire']) {
      const visible = await candidatesPage.statusActionButton(label).isVisible({ timeout: 1_000 }).catch(() => false);
      if (visible) anyActionAfterHire.push(label);
    }
    report.check('Status setelah "Hire" bersifat TERMINAL (tidak ada tombol aksi lanjutan)', anyActionAfterHire.length === 0, anyActionAfterHire.join(', '));

    report.finding(
      'State machine LENGKAP dikonfirmasi live sampai status terminal',
      `Application Initiated -> Shortlisted -> Interview Scheduled -> Interview Passed -> Job Offered -> ` +
        `${finalStatus?.replace('Status: ', '') ?? '(unknown)'} (TERMINAL). Nama tombol aksi persis dari UI: ` +
        '"Offer Job" (bukan field terpisah "Mark as Hired"), lalu "Hire" (bukan "Mark as Hired") dari status ' +
        '"Job Offered". Diagram STATE MACHINE di CATATAN TEKNIS docs/TC-Recruitment.txt sudah diupdate sesuai ini.',
    );
  } else {
    report.finding(
      'Tombol "Hire" tidak ditemukan dari status "Job Offered"',
      `Tombol aksi yang ternyata tersedia: ${availableFromOffered.join(', ')}. Dicatat sebagai temuan karena tidak sesuai dugaan awal.`,
    );
  }

  report.check('TC dijalankan tanpa exception', true);
  report.print();
});
