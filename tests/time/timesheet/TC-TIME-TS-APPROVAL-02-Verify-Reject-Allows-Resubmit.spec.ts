/**
 * ================================================================================
 * TC-TIME-TS-APPROVAL-02 — Verify A Rejected Timesheet Can Be Corrected And Resubmitted By The ESS
 * Modul    : Time - Employee Timesheets (Admin) + My Timesheet (ESS)
 * Kategori : Positive (+) 1.3 -- State Machine
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TS-APPROVAL-02-Verify-Reject-Allows-Resubmit.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * TUJUAN:
 *   Admin Reject (dgn komentar alasan) timesheet SUBMITTED milik ESS -> REJECTED. Berbeda dgn
 *   Claim, Reject di Timesheet BUKAN terminal: ESS bisa Submit ulang -> kembali SUBMITTED
 *   (confirmed live). Catatan: probe 2026-11-15 menunjukkan Reject TANPA komentar juga diterima
 *   -- dicatat sbg finding (bisa keputusan desain), bukan bug.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TS-APPROVAL-02-Verify-Reject-Allows-Resubmit.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { EmployeeTimesheetPage } from '../../../src/pages';
import { createEssTimesheet, getEssTimesheetStatus } from '../../../src/utils/createEssTimesheet';

test('TC-TIME-TS-APPROVAL-02: a rejected timesheet can be resubmitted by the ESS employee', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-TIME-TS-APPROVAL-02', 'Reject Allows Resubmit', env.baseURL, page);

  report.step('Setup: ESS + timesheet SUBMITTED');
  const { ess, essPage, close, timesheetId } = await createEssTimesheet(page, browser, addEmployeePage, 'QaTsReject');
  const lastName = ess.fullName.split(' ').pop() ?? ess.fullName;

  report.step('[Admin UI] View -> komentar alasan -> Reject');
  const employeeTimesheets = new EmployeeTimesheetPage(page);
  await employeeTimesheets.goto();
  const row = employeeTimesheets.pendingRowFor(lastName);
  report.check('Baris ESS ada di Pending Action', await isVisibleWithWait(row, 15_000));
  await employeeTimesheets.view(row);
  const resp = await employeeTimesheets.act('Reject', 'Jam Selasa belum sesuai, mohon direvisi.');
  const body = await resp?.json().catch(() => null);
  report.check('[API] Reject 200 -> REJECTED', resp?.status() === 200 && body?.data?.status?.id === 'REJECTED', `status=${resp?.status()}, ts=${JSON.stringify(body?.data?.status)}`);
  report.check('[ESS API] Status REJECTED', (await getEssTimesheetStatus(essPage)) === 'REJECTED');

  report.step('[ESS API] Submit ulang timesheet yg ditolak');
  const resubmit = await essPage.request.put(`/web/index.php/api/v2/time/timesheets/${timesheetId}`, { data: { action: 'SUBMIT' } });
  report.check('Resubmit 200', resubmit.status() === 200, `status=${resubmit.status()}`);
  report.check('[ESS API] Status kembali SUBMITTED', (await getEssTimesheetStatus(essPage)) === 'SUBMITTED');

  await close();
  report.print();
});
