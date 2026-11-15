import { type Browser, type Page } from '@playwright/test';
import { type AddEmployeePage } from '../pages/AddEmployeePage';
import { createEssAccount } from './createEssAccount';
import { loginAs } from './loginAs';
import { getLoggedInEmployeeName } from './getLoggedInEmployeeName';

type EssAccount = { empNumber: number; employeeId: string; fullName: string; username: string; password: string };

/**
 * Setup-only API shapes confirmed live 2026-11-15 (Admin session):
 * - POST pim/employees/<emp>/supervisors {empNumber, reportingMethodId:1 (Direct)} -> 200
 * - PUT  pim/employees/<emp>/job-details {joinedDate:null, jobTitleId} -> 200
 * - POST performance/manage/reviews {empNumber, reviewerEmpNumber, startDate, endDate, dueDate,
 *   activate} -> 200, overallStatus "Activated" when activate:true
 * - POST performance/config/trackers {trackerName, empNumber, reviewerEmpNumbers} -> 200
 * Using the API here (instead of the PIM Job / Report-to pages) keeps the consuming TCs' console
 * check clean -- the PIM Job page logs a harmless job-spec 404 (see setupReviewableEmployee).
 */
async function jobTitleId(page: Page, title: string): Promise<number> {
  const resp = await page.request.get('/web/index.php/api/v2/admin/job-titles?limit=0');
  const id = (((await resp.json().catch(() => null))?.data ?? []) as Array<{ id: number; title: string }>).find((t) => t.title === title)?.id;
  if (!id) throw new Error(`createEssReview: job title "${title}" not found (status=${resp.status()})`);
  return id;
}

/** Creates an ESS account reporting to the logged-in Admin, with Job Title `jobTitle` (has KPIs). */
export async function setupEssReviewee(
  page: Page,
  addEmployeePage: AddEmployeePage,
  namePrefix: string,
  jobTitle = 'QA Engineer',
): Promise<{ ess: EssAccount; supervisorEmpNumber: number }> {
  const me = await getLoggedInEmployeeName(page);
  const ess = await createEssAccount(page, addEmployeePage, namePrefix);
  const sup = await page.request.post(`/web/index.php/api/v2/pim/employees/${ess.empNumber}/supervisors`, {
    data: { empNumber: me.empNumber, reportingMethodId: 1 },
  });
  if (sup.status() !== 200) throw new Error(`setupEssReviewee: supervisor status=${sup.status()}`);
  const jd = await page.request.put(`/web/index.php/api/v2/pim/employees/${ess.empNumber}/job-details`, {
    data: { joinedDate: null, jobTitleId: await jobTitleId(page, jobTitle) },
  });
  if (jd.status() !== 200) throw new Error(`setupEssReviewee: job-details status=${jd.status()}`);
  return { ess, supervisorEmpNumber: me.empNumber };
}

/** ESS reviewee + a review on them (Admin as reviewer), logged in as the ESS user. Caller must `close()`. */
export async function createEssReview(
  page: Page,
  browser: Browser,
  addEmployeePage: AddEmployeePage,
  namePrefix: string,
  options: { activate?: boolean } = {},
): Promise<{ ess: EssAccount; essPage: Page; close: () => Promise<void>; reviewId: number }> {
  const { ess, supervisorEmpNumber } = await setupEssReviewee(page, addEmployeePage, namePrefix);
  const resp = await page.request.post('/web/index.php/api/v2/performance/manage/reviews', {
    data: {
      empNumber: ess.empNumber, reviewerEmpNumber: supervisorEmpNumber,
      startDate: '2026-01-01', endDate: '2026-06-30', dueDate: '2026-07-15', activate: options.activate ?? true,
    },
  });
  const reviewId = (await resp.json().catch(() => null))?.data?.id as number | undefined;
  if (!reviewId) throw new Error(`createEssReview: review status=${resp.status()}`);
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);
  return { ess, essPage, close, reviewId };
}

/** ESS account + a tracker on them with the logged-in Admin as reviewer, logged in as the ESS user. */
export async function createEssTracker(
  page: Page,
  browser: Browser,
  addEmployeePage: AddEmployeePage,
  namePrefix: string,
): Promise<{ ess: EssAccount; essPage: Page; close: () => Promise<void>; trackerId: number; trackerName: string; reviewerEmpNumber: number }> {
  const me = await getLoggedInEmployeeName(page);
  const ess = await createEssAccount(page, addEmployeePage, namePrefix);
  const trackerName = `${namePrefix}Trk ${Date.now()}`;
  const resp = await page.request.post('/web/index.php/api/v2/performance/config/trackers', {
    data: { trackerName, empNumber: ess.empNumber, reviewerEmpNumbers: [me.empNumber] },
  });
  const trackerId = (await resp.json().catch(() => null))?.data?.id as number | undefined;
  if (!trackerId) throw new Error(`createEssTracker: tracker status=${resp.status()}`);
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);
  return { ess, essPage, close, trackerId, trackerName, reviewerEmpNumber: me.empNumber };
}
