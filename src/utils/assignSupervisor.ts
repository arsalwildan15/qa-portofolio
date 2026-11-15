import { type Page } from '@playwright/test';
import { type ReportToPage } from '../pages/ReportToPage';

/**
 * Assigns `supervisorSearchTerm` as a Direct supervisor of `subordinateEmpNumber` via PIM >
 * Report-to. Verifies success via the POST response status, NOT the page's own UI text after
 * save -- that text-match is a documented known issue (TC-PIM-REPORTTO-01/03/06 in
 * docs/QA-Review-Progress.md: the underlying save is confirmed working via its own API-level
 * TC-PIM-REPORTTO-07, only the UI-verification assertion is unreliable). Reusing the unreliable
 * check here would make every ESS/approval-flow fixture needlessly flaky.
 */
export async function assignSupervisor(
  page: Page,
  reportToPage: ReportToPage,
  subordinateEmpNumber: number,
  supervisorSearchTerm: string,
): Promise<{ status: number | undefined }> {
  await reportToPage.goto(subordinateEmpNumber);
  await reportToPage.openAddSupervisor();
  await reportToPage.selectFirstNameOption(supervisorSearchTerm);
  await reportToPage.selectDropdownOption(reportToPage.reportingMethodSelect, 'Direct');

  const responsePromise = page
    .waitForResponse(
      (r) => r.url().includes(`/employees/${subordinateEmpNumber}/`) && r.request().method() === 'POST',
      { timeout: 15_000 },
    )
    .catch(() => null);
  await reportToPage.save();
  const resp = await responsePromise;
  return { status: resp?.status() };
}
