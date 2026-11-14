import { type Page } from '@playwright/test';

/**
 * Picks an employee record from the PIM employee list that isn't the login/admin employee
 * used by most of this suite's self-targeted TCs (Apply Leave, etc.), which has accumulated
 * a heavy leave-request history today -- confirmed live, Assign Leave against that specific
 * employee became unreliable (intermittent hangs/timeouts on Leave endpoints), most likely
 * from the sheer data volume on that one record. Picks from the most RECENTLY created
 * employees (sorted by empNumber descending), which are less likely to carry that history.
 */
export async function pickLightlyUsedEmployee(page: Page): Promise<{ empNumber: number; employeeId: string; fullName: string }> {
  const resp = await page.request.get('/web/index.php/api/v2/pim/employees?limit=20&sortField=employee.empNumber&sortOrder=DESC');
  const body = await resp.json().catch(() => null);
  const candidate = body?.data?.find(
    (e: { employeeId?: string; empNumber?: number }) => e.employeeId && e.employeeId !== '0000' && e.empNumber !== 7,
  );
  if (!candidate) throw new Error('pickLightlyUsedEmployee: no suitable candidate found in employee list');
  return {
    empNumber: candidate.empNumber,
    employeeId: candidate.employeeId,
    fullName: `${candidate.firstName} ${candidate.lastName}`,
  };
}
