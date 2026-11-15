import { type Page } from '@playwright/test';
import { type AddEmployeePage } from '../pages/AddEmployeePage';
import { createTestEmployee } from './createTestEmployee';
import { getLoggedInEmployeeName } from './getLoggedInEmployeeName';
import { uniqueName } from '../data/testData';

const VACANCIES = '/web/index.php/api/v2/recruitment/vacancies';

type VacancySummary = { id: number; name: string };

async function firstJobTitleId(page: Page): Promise<number> {
  const body = await (await page.request.get('/web/index.php/api/v2/admin/job-titles?limit=1')).json().catch(() => null);
  const id = body?.data?.[0]?.id as number | undefined;
  if (!id) throw new Error('ensureVacancy: no job title available to attach a vacancy to');
  return id;
}

/**
 * POST recruitment/vacancies with the exact body shape the Add Vacancy form sends (captured live
 * 2026-11-15). `description` MUST be "" -- `null` makes this endpoint return 500 (BG-409,
 * TC-RECRUITMENT-VACANCY-19), while every other invalid field is rejected with a clean 422.
 */
async function postVacancy(page: Page, hiringManagerEmpNumber: number, namePrefix: string): Promise<VacancySummary> {
  const name = uniqueName(namePrefix);
  const resp = await page.request.post(VACANCIES, {
    data: { name, jobTitleId: await firstJobTitleId(page), employeeId: hiringManagerEmpNumber, numOfPositions: 2, description: '', status: true, isPublished: true },
  });
  const id = (await resp.json().catch(() => null))?.data?.id as number | undefined;
  if (!id) throw new Error(`ensureVacancy: POST vacancy status=${resp.status()}`);
  return { id, name };
}

/**
 * Returns an ACTIVE vacancy that has a hiring manager, creating one via the API when the shared
 * demo has none. Confirmed live 2026-11-15: the demo can be left with ZERO vacancies (other users
 * delete them / resets), which made every candidate-creating TC hang on an empty Vacancy dropdown.
 * A vacancy WITH a hiring manager is required for Shortlist to work (BG-007).
 */
export async function ensureVacancyWithHiringManager(page: Page): Promise<VacancySummary> {
  const list = await (await page.request.get(`${VACANCIES}?limit=50&offset=0&status=true`)).json().catch(() => null);
  for (const v of (list?.data ?? []) as VacancySummary[]) {
    const detail = await (await page.request.get(`${VACANCIES}/${v.id}`)).json().catch(() => null);
    // "No hiring manager" is serialized as an object whose fields are all null, not as null.
    if (detail?.data?.hiringManager?.id != null) return { id: v.id, name: v.name };
  }
  const me = await getLoggedInEmployeeName(page);
  return postVacancy(page, me.empNumber, 'QaVacHm');
}

/**
 * Builds the BG-007 precondition on demand instead of relying on a seed vacancy: creates a vacancy
 * whose hiring manager is a throw-away employee, then deletes that employee in PIM. Confirmed live
 * 2026-11-15: the vacancy stays active and its hiringManager becomes all-null -- which is also the
 * realistic way production reaches BG-007 (a manager leaves and is removed from PIM).
 */
export async function createVacancyWithoutHiringManager(page: Page, addEmployeePage: AddEmployeePage): Promise<VacancySummary> {
  const manager = await createTestEmployee(page, addEmployeePage, 'QaHmGone');
  const vacancy = await postVacancy(page, manager.empNumber, 'QaVacNoHm');
  const del = await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [manager.empNumber] } });
  if (del.status() !== 200) throw new Error(`createVacancyWithoutHiringManager: delete employee status=${del.status()}`);
  const detail = await (await page.request.get(`${VACANCIES}/${vacancy.id}`)).json().catch(() => null);
  if (detail?.data?.hiringManager?.id != null) throw new Error('createVacancyWithoutHiringManager: hiring manager still set after deleting the employee');
  return vacancy;
}
