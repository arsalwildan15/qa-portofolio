import { type Browser, type Page } from '@playwright/test';
import { type AddEmployeePage } from '../pages/AddEmployeePage';
import { createEssAccount } from './createEssAccount';
import { loginAs } from './loginAs';

const US_VACATION_LEAVE_TYPE_ID = 1;

/**
 * Next weekday (Mon-Fri) `daysFromNow` days ahead, as ISO yyyy-mm-dd. Skips Dec 24-28: the demo's
 * holiday calendar has Christmas Day (12-25) and Boxing Day (Canada, observed 12-28 in 2026), and a
 * request falling only on a holiday is rejected 400 "No Working Days Selected" (confirmed live).
 */
export function isoWeekday(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  while (d.getDay() === 0 || d.getDay() === 6 || (d.getMonth() === 11 && d.getDate() >= 24 && d.getDate() <= 28)) {
    d.setDate(d.getDate() + 1);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Creates a fresh ESS account with a "US - Vacation" entitlement for the current leave period and
 * (optionally) one Pending Approval full-day leave request APPLIED BY that ESS account. All via
 * API (setup only -- shapes confirmed live 2026-11-15): Admin POST leave/leave-entitlements, ESS
 * POST leave/leave-requests. Caller must `close()` the ESS context.
 */
export async function createEssLeaveRequest(
  page: Page,
  browser: Browser,
  addEmployeePage: AddEmployeePage,
  namePrefix: string,
  options: { entitlementDays?: number; apply?: boolean; daysFromNow?: number } = {},
): Promise<{
  ess: { empNumber: number; employeeId: string; fullName: string; username: string; password: string };
  essPage: Page;
  close: () => Promise<void>;
  leaveRequestId: number | undefined;
  date: string;
}> {
  const { entitlementDays = 10, apply = true, daysFromNow = 21 } = options;
  const ess = await createEssAccount(page, addEmployeePage, namePrefix);
  const year = new Date().getFullYear();
  const ent = await page.request.post('/web/index.php/api/v2/leave/leave-entitlements', {
    data: { empNumber: ess.empNumber, leaveTypeId: US_VACATION_LEAVE_TYPE_ID, fromDate: `${year}-01-01`, toDate: `${year}-12-31`, entitlement: String(entitlementDays) },
  });
  if (ent.status() !== 200) throw new Error(`createEssLeaveRequest: entitlement status=${ent.status()}`);

  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);
  const date = isoWeekday(daysFromNow);
  let leaveRequestId: number | undefined;
  if (apply) {
    const req = await essPage.request.post('/web/index.php/api/v2/leave/leave-requests', {
      data: { leaveTypeId: US_VACATION_LEAVE_TYPE_ID, fromDate: date, toDate: date, comment: null, duration: { type: 'full_day' } },
    });
    leaveRequestId = (await req.json().catch(() => null))?.data?.id;
    if (!leaveRequestId) throw new Error(`createEssLeaveRequest: apply status=${req.status()}`);
  }
  return { ess, essPage, close, leaveRequestId, date };
}

/** ESS-side view of its own request: status name (e.g. "Pending Approval", "Scheduled") + allowed actions + balance. */
export async function getEssLeaveRequest(essPage: Page, leaveRequestId: number): Promise<{
  status: string | undefined;
  actions: string[];
  balance: number | undefined;
}> {
  const body = await (await essPage.request.get('/web/index.php/api/v2/leave/leave-requests?limit=50&offset=0')).json().catch(() => null);
  const record = (body?.data ?? []).find((r: { id: number }) => r.id === leaveRequestId);
  const bal = await (await essPage.request.get(`/web/index.php/api/v2/leave/leave-balance/leave-type/${US_VACATION_LEAVE_TYPE_ID}`)).json().catch(() => null);
  return {
    status: record?.leaveBreakdown?.[0]?.name,
    actions: ((record?.allowedActions ?? []) as Array<{ action: string }>).map((a) => a.action),
    balance: bal?.data?.balance?.balance,
  };
}
