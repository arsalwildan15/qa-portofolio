import { type Page } from '@playwright/test';
import { type CandidatesPage } from '../pages/CandidatesPage';
import { uniqueEmployeeName, uniqueEmail } from '../data/testData';

const VALID_PDF_BUFFER = Buffer.from('%PDF-1.4 minimal valid-looking resume content');

/**
 * Creates a candidate (with a vacancy assigned and a resume attached) via
 * Add Candidate. Unlike PIM's Add Employee, no Employee-Id-style collision
 * was observed here, confirmed via repeated live creation during
 * exploration, so no retry loop is needed. The SPA does NOT update the URL
 * bar to include the new candidate's id after Save (confirmed live, stays
 * on /addCandidate), so the id must come from the POST response body.
 */
export async function createTestCandidate(
  page: Page,
  candidatesPage: CandidatesPage,
  namePrefix: string,
): Promise<{ candidateId: number; firstName: string; lastName: string; vacancyName: string }> {
  const { firstName, lastName } = uniqueEmployeeName(namePrefix);
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  // Uses a vacancy WITH a hiring manager assigned, not just the first dropdown option --
  // see BG-007: the first option ("Junior Account Assistant") has no hiring manager, which
  // makes the Shortlist endpoint crash with a 500 for every candidate created against it.
  const vacancyName = await candidatesPage.selectVacancyWithHiringManager();
  await candidatesPage.emailInput.fill(uniqueEmail(namePrefix));
  await candidatesPage.fileInput.setInputFiles({
    name: 'resume.pdf',
    mimeType: 'application/pdf',
    buffer: VALID_PDF_BUFFER,
  });

  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/recruitment/candidates') && r.request().method() === 'POST',
      { timeout: 15_000 },
    ),
    candidatesPage.save(),
  ]);
  const body = await resp.json();
  const candidateId = body?.data?.id;
  if (!candidateId) throw new Error('createTestCandidate: POST response did not include data.id');

  return { candidateId, firstName, lastName, vacancyName };
}
