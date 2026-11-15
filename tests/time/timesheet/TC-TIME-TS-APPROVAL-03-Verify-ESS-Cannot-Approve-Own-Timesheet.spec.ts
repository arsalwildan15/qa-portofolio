/**
 * ================================================================================
 * TC-TIME-TS-APPROVAL-03 — Verify An ESS Employee Cannot Approve Their Own Timesheet
 * Modul    : Time - Access Control
 * Kategori : Security (S) / Segregation Of Duties (BFLAC)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TS-APPROVAL-03-Verify-ESS-Cannot-Approve-Own-Timesheet.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * TUJUAN:
 *   ESS dgn timesheet SUBMITTED miliknya: UI My Timesheet tidak punya tombol Approve, dan
 *   memanggil endpoint approval Admin (PUT time/employees/<diri-sendiri>/timesheets/<id>
 *   {APPROVE}) langsung dari sesi ESS harus ditolak; status tetap SUBMITTED.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TS-APPROVAL-03-Verify-ESS-Cannot-Approve-Own-Timesheet.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { MyTimesheetPage } from '../../../src/pages';
import { createEssTimesheet, getEssTimesheetStatus } from '../../../src/utils/createEssTimesheet';

test('TC-TIME-TS-APPROVAL-03: an ESS employee cannot approve their own timesheet (UI or API)', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-TIME-TS-APPROVAL-03', 'ESS Cannot Approve Own Timesheet', env.baseURL, page);

  report.step('Setup: ESS + timesheet SUBMITTED');
  const { ess, essPage, close, timesheetId } = await createEssTimesheet(page, browser, addEmployeePage, 'QaTsSelf');

  report.step('[ESS UI] My Timesheet: tidak ada tombol Approve');
  const myTimesheet = new MyTimesheetPage(essPage);
  await myTimesheet.goto();
  report.check('Halaman selesai dirender (Status: Submitted tampil)', await isVisibleWithWait(essPage.getByText('Status: Submitted'), 15_000));
  report.check('Tombol Approve TIDAK tampil utk ESS', !(await essPage.getByRole('button', { name: 'Approve', exact: true }).isVisible()));

  report.step('[ESS API] PUT employees/<diri-sendiri>/timesheets/<id> APPROVE');
  const approve = await essPage.request.put(`/web/index.php/api/v2/time/employees/${ess.empNumber}/timesheets/${timesheetId}`, { data: { action: 'APPROVE' } });
  report.check('APPROVE oleh pemilik timesheet ditolak (bukan 200)', approve.status() !== 200, `status=${approve.status()}`);
  report.check('Status tetap SUBMITTED', (await getEssTimesheetStatus(essPage)) === 'SUBMITTED');

  await close();
  report.print();
});
