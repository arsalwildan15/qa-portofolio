import { type Page } from '@playwright/test';
import { type CandidatesPage } from '../pages/CandidatesPage';

/**
 * Clicks a status action button on the candidate detail page and saves the
 * confirmation form. Navigating to the changeCandidateVacancyStatus URL
 * alone does NOT change status (confirmed live); Save must be clicked.
 * Waits 2s after each detail load because the action buttons render from a
 * separate async actions/allowed call that lags the initial page render by
 * roughly 1-2s (confirmed live, NOT the stuck-loading bug, see
 * docs/TC-Recruitment.txt).
 */
export async function shortlistCandidate(page: Page, candidatesPage: CandidatesPage, candidateId: number): Promise<void> {
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  await candidatesPage.statusActionButton('Shortlist').click();
  await page.waitForTimeout(800);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/shortlist') && r.request().method() !== 'GET', { timeout: 10_000 }),
    candidatesPage.save(),
  ]);
  await page.waitForTimeout(1000);
}

/**
 * Clicks "Mark Interview Passed" and saves. Confirmed live: PUT
 * .../candidates/<id>/interviews/<interviewId>/pass -> 200, new status =
 * "Interview Passed" (NOT terminal -- see STATUS-11/STATUS-12).
 */
export async function markInterviewPassed(page: Page, candidatesPage: CandidatesPage, candidateId: number): Promise<void> {
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
}

/**
 * Clicks "Offer Job" and saves. Confirmed live via discovery run: PUT
 * .../candidates/<id>/job/offer -> 200, new status = "Job Offered".
 * Available actions from "Job Offered" are "Reject", "Offer Declined",
 * "Hire" (confirmed live, see STATUS-12).
 */
export async function offerJobForCandidate(page: Page, candidatesPage: CandidatesPage, candidateId: number): Promise<void> {
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  await candidatesPage.statusActionButton('Offer Job').click();
  await page.waitForTimeout(800);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/candidates/${candidateId}/job/offer`) && r.request().method() !== 'GET', { timeout: 10_000 }),
    candidatesPage.save(),
  ]);
  await page.waitForTimeout(1000);
}

export async function scheduleInterviewForCandidate(page: Page, candidatesPage: CandidatesPage, candidateId: number): Promise<void> {
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  await candidatesPage.statusActionButton('Schedule Interview').click();
  await page.waitForTimeout(800);
  await candidatesPage.interviewTitleInput.fill('QA Automation Interview');
  await candidatesPage.selectFirstInterviewer();
  await candidatesPage.interviewDateInput.fill('2026-15-11');
  await page.waitForTimeout(500);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('shedule-interview') && r.request().method() !== 'GET', { timeout: 10_000 }),
    candidatesPage.save(),
  ]);
  await page.waitForTimeout(1000);
}
