/**
 * ================================================================================
 * TC-TIME-TS-SUBMIT-01 — Verify An ESS Employee Can Fill And Submit Their Weekly Timesheet
 * Modul    : Time - My Timesheet (ESS) + Employee Timesheets (Admin)
 * Kategori : Positive (+) / Cross-Role
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TS-SUBMIT-01-Verify-ESS-Fill-And-Submit-Timesheet.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * TUJUAN:
 *   Akun ESS sungguhan membuka My Timesheet (minggu berjalan, status "Not Submitted") -> Edit ->
 *   isi Project+Activity, 8 jam (Senin) + 7.5 jam (Selasa) -> Save (total 15:30) -> Submit ->
 *   status SUBMITTED. Lalu sisi Admin: timesheet itu muncul di "Timesheets Pending Action".
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TS-SUBMIT-01-Verify-ESS-Fill-And-Submit-Timesheet.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { MyTimesheetPage, EmployeeTimesheetPage } from '../../../src/pages';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';
import { getEssTimesheetStatus } from '../../../src/utils/createEssTimesheet';

test('TC-TIME-TS-SUBMIT-01: an ESS employee fills and submits the weekly timesheet; it reaches Admin pending list', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-TIME-TS-SUBMIT-01', 'ESS Fill And Submit Timesheet', env.baseURL, page);

  report.step('Setup: akun ESS baru, login di sesi terpisah');
  const ess = await createEssAccount(page, addEmployeePage, 'QaTsSub');
  const lastName = ess.fullName.split(' ').pop() ?? ess.fullName;
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);
  const myTimesheet = new MyTimesheetPage(essPage);

  report.step('[ESS UI] My Timesheet minggu berjalan: status awal "Not Submitted"');
  await myTimesheet.goto();
  report.check('Status awal "Not Submitted"', await isVisibleWithWait(essPage.getByText('Status: Not Submitted'), 15_000));

  report.step('[ESS UI] Edit -> isi project/activity + 8 jam Senin + 7.5 jam Selasa -> Save');
  await myTimesheet.startEdit();
  const row = await myTimesheet.fillFirstRow(['ACME', 'Apache', 'Coca-Cola', 'Fresh Books', 'FreeWave']);
  report.finding('Project/Activity terpakai', JSON.stringify(row));
  await myTimesheet.fillDuration(0, '8');
  await myTimesheet.fillDuration(1, '7.5');
  const saveResp = await myTimesheet.save();
  const saved = await saveResp?.json().catch(() => null);
  report.check('[API] Save entries 200', saveResp?.status() === 200, `status=${saveResp?.status()}`);
  report.check('[API] Total jam = 15:30', saved?.data?.[0]?.total?.label === '15:30', `total=${JSON.stringify(saved?.data?.[0]?.total)}`);

  report.step('[ESS UI] Submit');
  await essPage.waitForURL(/viewMyTimesheet/, { timeout: 15_000 }).catch(() => {});
  const submitButton = essPage.getByRole('button', { name: 'Submit' });
  await submitButton.waitFor({ state: 'visible', timeout: 15_000 });
  const submitResp = essPage
    .waitForResponse((r) => /\/api\/v2\/time\/timesheets\/\d+$/.test(r.url()) && r.request().method() === 'PUT', { timeout: 15_000 })
    .catch(() => null);
  await submitButton.click();
  const submitted = await (await submitResp)?.json().catch(() => null);
  report.check('[API] Status -> SUBMITTED', submitted?.data?.status?.id === 'SUBMITTED', `status=${JSON.stringify(submitted?.data?.status)}`);
  report.check('[ESS API] Timesheet default ESS = SUBMITTED', (await getEssTimesheetStatus(essPage)) === 'SUBMITTED');

  report.step('[Admin UI] Timesheet muncul di "Timesheets Pending Action"');
  const employeeTimesheets = new EmployeeTimesheetPage(page);
  await employeeTimesheets.goto();
  report.check('Baris ESS ada di daftar Pending Action', await isVisibleWithWait(employeeTimesheets.pendingRowFor(lastName), 15_000), `lastName=${lastName}`);

  await close();
  report.print();
});
