import { type Browser, type Page } from '@playwright/test';
import { type AddEmployeePage } from '../pages/AddEmployeePage';
import { createEssAccount } from './createEssAccount';
import { loginAs } from './loginAs';

// Seed data of the demo (confirmed live 2026-11-15): project "ACME Ltd" id 2, activity
// "Administration" id 11. If a demo reset ever renumbers these, the entries PUT below fails
// loudly instead of silently creating a wrong timesheet.
export const PROJECT_ID = 2;
export const ACTIVITY_ID = 11;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Fresh ESS account + its current-week timesheet with 8h (Mon) + 7.5h (Tue) logged, optionally
 * submitted -- all through the ESS's own API (setup only; shapes confirmed live): GET
 * time/timesheets/default, PUT time/timesheets/<id>/entries, PUT time/timesheets/<id> {SUBMIT}.
 * Caller must `close()` the ESS context.
 */
export async function createEssTimesheet(
  page: Page,
  browser: Browser,
  addEmployeePage: AddEmployeePage,
  namePrefix: string,
  options: { submit?: boolean } = { submit: true },
): Promise<{
  ess: { empNumber: number; employeeId: string; fullName: string; username: string; password: string };
  essPage: Page;
  close: () => Promise<void>;
  timesheetId: number;
  startDate: string;
}> {
  const ess = await createEssAccount(page, addEmployeePage, namePrefix);
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);

  // A brand-new employee has NO timesheet row yet: GET timesheets/default returns id:null until
  // the My Timesheet page is opened once (no create API call was observed -- the page load
  // itself creates it). Confirmed live 2026-11-15.
  await essPage.goto('/web/index.php/time/viewMyTimesheet');
  await essPage.waitForLoadState('networkidle').catch(() => {});
  const def = await (await essPage.request.get('/web/index.php/api/v2/time/timesheets/default')).json().catch(() => null);
  const timesheetId = def?.data?.id as number | undefined;
  const startDate = def?.data?.startDate as string | undefined;
  if (!timesheetId || !startDate) throw new Error(`createEssTimesheet: no default timesheet (${JSON.stringify(def)})`);

  const entries = await essPage.request.put(`/web/index.php/api/v2/time/timesheets/${timesheetId}/entries`, {
    data: {
      entries: [{ projectId: PROJECT_ID, activityId: ACTIVITY_ID, dates: { [startDate]: { duration: '08:00' }, [addDays(startDate, 1)]: { duration: '07:30' } } }],
      deletedEntries: [],
    },
  });
  if (entries.status() !== 200) throw new Error(`createEssTimesheet: entries status=${entries.status()}`);

  if (options.submit) {
    const sub = await essPage.request.put(`/web/index.php/api/v2/time/timesheets/${timesheetId}`, { data: { action: 'SUBMIT' } });
    if (sub.status() !== 200) throw new Error(`createEssTimesheet: submit status=${sub.status()}`);
  }
  return { ess, essPage, close, timesheetId, startDate };
}

/** Status id of an ESS timesheet as the ESS sees it (confirmed live: "NOT SUBMITTED" -- with a space --, SUBMITTED, APPROVED, REJECTED). */
export async function getEssTimesheetStatus(essPage: Page): Promise<string | undefined> {
  const body = await (await essPage.request.get('/web/index.php/api/v2/time/timesheets/default')).json().catch(() => null);
  return body?.data?.status?.id;
}

/** GET time/timesheets/<id>/entries as the ESS sees it: rows (project/activity/dates/total) + meta.columns/meta.sum. */
export async function getEssTimesheetEntries(essPage: Page, timesheetId: number): Promise<{
  data: Array<{ project: { id: number; name: string }; activity: { id: number; name: string }; total: { label: string }; dates: Record<string, { id: number; duration: string; comment: string | null }> }>;
  meta: { sum: { label: string }; columns: Record<string, { total: { label: string } }> };
} | null> {
  return (await essPage.request.get(`/web/index.php/api/v2/time/timesheets/${timesheetId}/entries`)).json().catch(() => null);
}

/** Second seed activity of the ACME Ltd project (any id other than ACTIVITY_ID), via GET time/project/<id>/activities (singular "project" -- confirmed live). */
export async function otherSeedActivityId(page: Page): Promise<number> {
  const body = await (await page.request.get(`/web/index.php/api/v2/time/project/${PROJECT_ID}/activities?limit=0`)).json().catch(() => null);
  const id = ((body?.data ?? []) as Array<{ id: number }>).find((a) => a.id !== ACTIVITY_ID)?.id;
  if (!id) throw new Error('otherSeedActivityId: ACME Ltd has no second activity');
  return id;
}
