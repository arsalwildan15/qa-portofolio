import { type Page } from '@playwright/test';
import { type AddEmployeePage } from '../pages/AddEmployeePage';
import { type ReportToPage } from '../pages/ReportToPage';
import { createTestEmployee } from './createTestEmployee';
import { assignSupervisor } from './assignSupervisor';
import { getLoggedInEmployeeName } from './getLoggedInEmployeeName';

/**
 * Creates a fresh employee, links the logged-in account as their Direct supervisor (required
 * for "Supervisor Reviewer" to offer any option on the Add Review form), and optionally sets a
 * Job Title (required for a review on this employee to be Activate-able -- the API rejects
 * Activate with 400 "Cannot activate review for employees who doesn't have a Job Title with KPI"
 * otherwise).
 *
 * The Job Title is set via the API (PUT pim/employees/<id>/job-details), NOT the PIM Job page:
 * loading that page makes the app GET admin/job-titles/<id>/specification, which 404s for any
 * title without an attached spec file. That 404 is harmless (handled, no exception) but logs a
 * browser console error identical in text to real bugs, polluting every consuming TC's
 * console-error check -- confirmed live 2026-11-15.
 */
export async function setupReviewableEmployee(
  page: Page,
  addEmployeePage: AddEmployeePage,
  reportToPage: ReportToPage,
  namePrefix: string,
  jobTitle?: string,
): Promise<{
  emp: { empNumber: number; employeeId: string; firstName: string; lastName: string };
  supervisorSearchTerm: string;
}> {
  const me = await getLoggedInEmployeeName(page);
  const supervisorSearchTerm = me.fullName.split(' ')[0] ?? me.fullName;
  const emp = await createTestEmployee(page, addEmployeePage, namePrefix);
  await assignSupervisor(page, reportToPage, emp.empNumber, supervisorSearchTerm);

  if (jobTitle) {
    const titlesResp = await page.request.get('/web/index.php/api/v2/admin/job-titles?limit=0');
    const titles = ((await titlesResp.json().catch(() => null))?.data ?? []) as Array<{ id: number; title: string }>;
    const jobTitleId = titles.find((t) => t.title === jobTitle)?.id;
    if (!jobTitleId) throw new Error(`setupReviewableEmployee: job title "${jobTitle}" not found (status=${titlesResp.status()})`);
    const putResp = await page.request.put(`/web/index.php/api/v2/pim/employees/${emp.empNumber}/job-details`, {
      data: { joinedDate: null, jobTitleId },
    });
    if (putResp.status() !== 200) throw new Error(`setupReviewableEmployee: job-details PUT status=${putResp.status()}`);
  }

  return { emp, supervisorSearchTerm };
}
