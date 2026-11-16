/**
 * ================================================================================
 * TC-TIME-PROJECT-01 — Verify A New Customer → Project → Activity Chain Is Usable By ESS And Names Are Unique
 * Modul    : Time - Project Info (Customers / Projects / Activities)
 * Kategori : Positive (+) 1.1-C 1.4 1.5 | Negative (-) 2.3 | API (A) 6.1 -- Cross-Role
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-PROJECT-01-Verify-Customer-Project-Activity-Unique-And-Usable.spec.ts
 * Path     : tests/time/project/
 * ================================================================================
 *
 * TUJUAN:
 *   Admin membuat Customer -> Project (milik customer tsb) -> Activity. Confirmed live:
 *   POST time/customers {name, description}, POST time/projects {name, customerId,
 *   description (null, BUKAN "" -> 422), projectAdminsEmpNumbers}, POST
 *   time/project/<id>/activities {name} (path "project" TUNGGAL). Nama duplikat di tiap level
 *   -> 422 [name]. Karyawan (ESS) bisa langsung memakai project+activity baru di timesheet,
 *   tetapi TIDAK boleh membuat customer/project sendiri.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/project/TC-TIME-PROJECT-01-Verify-Customer-Project-Activity-Unique-And-Usable.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssTimesheet, getEssTimesheetEntries } from '../../../src/utils/createEssTimesheet';

const API = '/web/index.php/api/v2/time';
const isNameConflict = async (r: import('@playwright/test').APIResponse) =>
  r.status() === 422 && ((await r.json().catch(() => null))?.error?.data?.invalidParamKeys ?? []).includes('name');

test('TC-TIME-PROJECT-01: a new customer/project/activity chain is usable by ESS and names are unique', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-TIME-PROJECT-01', 'Customer Project Activity Unique And Usable', env.baseURL, page);
  const stamp = Date.now();
  const customerName = `QaCust ${stamp}`;
  const projectName = `QaProj ${stamp}`;

  report.step('[Admin API] Customer -> Project -> Activity');
  const cust = await page.request.post(`${API}/customers`, { data: { name: customerName, description: '' } });
  const customerId = (await cust.json().catch(() => null))?.data?.id as number | undefined;
  report.check('[API] Customer 200', cust.status() === 200 && !!customerId, `status=${cust.status()}`);
  const proj = await page.request.post(`${API}/projects`, { data: { name: projectName, customerId, description: null, projectAdminsEmpNumbers: [] } });
  const projectBody = await proj.json().catch(() => null);
  const projectId = projectBody?.data?.id as number | undefined;
  report.check('[API] Project 200, terhubung ke customer', proj.status() === 200 && projectBody?.data?.customer?.id === customerId, `status=${proj.status()}, customer=${projectBody?.data?.customer?.id}`);
  const act = await page.request.post(`${API}/project/${projectId}/activities`, { data: { name: 'QaActivity' } });
  const activityId = (await act.json().catch(() => null))?.data?.id as number | undefined;
  report.check('[API] Activity 200', act.status() === 200 && !!activityId, `status=${act.status()}`);

  report.step('[Admin API] Nama duplikat di tiap level');
  report.check('[API] Customer duplikat -> 422 [name]', await isNameConflict(await page.request.post(`${API}/customers`, { data: { name: customerName, description: '' } })));
  report.check('[API] Project duplikat (customer sama) -> 422 [name]', await isNameConflict(await page.request.post(`${API}/projects`, { data: { name: projectName, customerId, description: null, projectAdminsEmpNumbers: [] } })));
  report.check('[API] Activity duplikat (project sama) -> 422 [name]', await isNameConflict(await page.request.post(`${API}/project/${projectId}/activities`, { data: { name: 'QaActivity' } })));

  report.step('[ESS API] Pakai project+activity baru di timesheet');
  const { essPage, close, timesheetId, startDate } = await createEssTimesheet(page, browser, addEmployeePage, 'QaTimeProj', { submit: false });
  const use = await essPage.request.put(`${API}/timesheets/${timesheetId}/entries`, {
    data: { entries: [{ projectId, activityId, dates: { [startDate]: { duration: '01:00' } } }], deletedEntries: [] },
  });
  const rows = (await getEssTimesheetEntries(essPage, timesheetId))?.data ?? [];
  report.check('[API] ESS bisa mencatat jam ke project baru (200)', use.status() === 200 && rows.some((r) => r.project.id === projectId), `status=${use.status()}, projects=${JSON.stringify(rows.map((r) => r.project.name))}`);

  report.step('[ESS API] ESS mencoba membuat customer & project sendiri');
  const essCust = await essPage.request.post(`${API}/customers`, { data: { name: `QaEssCust ${stamp}`, description: '' } });
  report.check('[API] ESS POST customers -> 403', essCust.status() === 403, `status=${essCust.status()}`);
  const essProj = await essPage.request.post(`${API}/projects`, { data: { name: `QaEssProj ${stamp}`, customerId, description: null, projectAdminsEmpNumbers: [] } });
  report.check('[API] ESS POST projects -> 403', essProj.status() === 403, `status=${essProj.status()}`);

  await close();
  report.print();
});
