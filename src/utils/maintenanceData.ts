import { type APIRequestContext, type Page } from '@playwright/test';
import { passAdminAccessGate } from './adminAccessGate';

/**
 * Throw-away data for the Maintenance (purge / access records) tests. Purging is irreversible, so
 * these tests only ever purge records they created themselves (contracts confirmed live 2026-11-17):
 *   DELETE /api/v2/maintenance/purge {empNumber}            -> purges a PAST (terminated) employee
 *   GET    /api/v2/maintenance/candidates?vacancyId=<id>    -> candidates of a vacancy
 *   DELETE /api/v2/maintenance/candidates/purge {vacancyId} -> purges all candidates of a vacancy
 *   GET    /web/index.php/maintenance/accessEmployeeData/<empNumber> -> JSON download of personal data
 */
const API = '/web/index.php/api/v2/';
const uid = () => `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10)}`;

export async function createEmployee(req: APIRequestContext, firstName: string, lastName: string): Promise<number> {
  const r = await req.post(`${API}pim/employees`, { data: { firstName, lastName, middleName: '', employeeId: `M${uid()}` } });
  return ((await r.json()) as { data: { empNumber: number } }).data.empNumber;
}

/** Creates an employee and terminates them, which makes them a "Past Employee" eligible for purge. */
export async function createPastEmployee(req: APIRequestContext, firstName: string, lastName: string): Promise<number> {
  const emp = await createEmployee(req, firstName, lastName);
  const reason = ((await (await req.get(`${API}pim/termination-reasons?limit=1`)).json()) as { data: Array<{ id: number }> }).data[0]?.id;
  await req.post(`${API}pim/employees/${emp}/terminations`, { data: { terminationReasonId: reason, date: '2026-11-01', note: 'qa purge test' } });
  return emp;
}

/** A vacancy owned by the test, optionally with one candidate. */
export async function createVacancyWithCandidate(req: APIRequestContext, label: string, withCandidate = true): Promise<{ vacancyId: number; vacancyName: string; candidateId?: number; candidateName?: string }> {
  const jobTitleId = ((await (await req.get(`${API}admin/job-titles?limit=1`)).json()) as { data: Array<{ id: number }> }).data[0]?.id;
  const hiringManager = ((await (await req.get(`${API}pim/employees?limit=1`)).json()) as { data: Array<{ empNumber: number }> }).data[0]?.empNumber;
  const vacancyName = `${label} ${uid()}`;
  const v = await req.post(`${API}recruitment/vacancies`, { data: { name: vacancyName, jobTitleId, employeeId: hiringManager, numOfPositions: 1, description: '', status: true, isPublished: false } });
  const vacancyId = ((await v.json()) as { data: { id: number } }).data.id;
  if (!withCandidate) return { vacancyId, vacancyName };
  const last = `C${uid()}`;
  const c = await req.post(`${API}recruitment/candidates`, { data: { firstName: 'QaPurgeCand', middleName: '', lastName: last, email: `qa${uid()}@example.com`, contactNumber: '', keywords: '', comment: '', dateOfApplication: '2026-11-01', consentToKeepData: false, vacancyId } });
  return { vacancyId, vacancyName, candidateId: ((await c.json()) as { data: { id: number } }).data.id, candidateName: `QaPurgeCand ${last}` };
}

/** Opens a Maintenance page and passes the "Administrator Access" password prompt. */
export async function openMaintenance(page: Page, path: 'purgeEmployee' | 'purgeCandidateData' | 'accessEmployeeData'): Promise<boolean> {
  await page.goto(`/web/index.php/maintenance/${path}`);
  const gated = await passAdminAccessGate(page);
  await page.waitForLoadState('networkidle');
  return gated;
}

/** Types into the page's autocomplete and returns the option texts once suggestions arrive. */
export async function suggestions(page: Page, text: string): Promise<string[]> {
  const box = page.locator('form input').first();
  const resp = page.waitForResponse((r) => r.url().includes('/api/v2/') && r.request().method() === 'GET' && /nameOrId|name=/.test(r.url()), { timeout: 15_000 }).catch(() => null);
  await box.fill(text);
  await resp;
  await page.getByRole('option').first().waitFor({ timeout: 8_000 }).catch(() => {});
  return (await page.getByRole('option').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
}

/**
 * Text of the "Selected Employee" area after Search. The employee's name and id are shown in
 * read-only INPUTS, which innerText does not include (first run read only the column headers),
 * so the input values are appended.
 */
export async function selectedEmployeeText(page: Page): Promise<string> {
  const area = page.locator('.orangehrm-background-container');
  const text = await area.innerText();
  const values = await area.locator('input').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  return `${text} ${values.join(' ')}`.replace(/\s+/g, ' ');
}
