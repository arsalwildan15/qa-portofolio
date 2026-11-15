import { type Page } from '@playwright/test';
import { type AddEmployeePage } from '../pages/AddEmployeePage';
import { type ReportToPage } from '../pages/ReportToPage';
import { type JobPage } from '../pages/JobPage';
import { createTestEmployee } from './createTestEmployee';
import { assignSupervisor } from './assignSupervisor';
import { getLoggedInEmployeeName } from './getLoggedInEmployeeName';

/**
 * Creates a fresh employee, links the logged-in account as their Direct supervisor (required
 * for "Supervisor Reviewer" to offer any option on the Add Review form), and optionally sets a
 * Job Title (required for a review on this employee to be Activate-able -- confirmed live: the
 * API rejects Activate with 400 "Cannot activate review for employees who doesn't have a Job
 * Title with KPI" otherwise).
 */
export async function setupReviewableEmployee(
  page: Page,
  addEmployeePage: AddEmployeePage,
  reportToPage: ReportToPage,
  jobPage: JobPage,
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
    await jobPage.goto(emp.empNumber);
    await jobPage.selectDropdownOption(jobPage.jobTitleSelect, jobTitle);
    await jobPage.save();
    await page.waitForLoadState('networkidle').catch(() => {});
  }

  return { emp, supervisorSearchTerm };
}
