/**
 * ================================================================================
 * TC-TIME-TS-APPROVAL-01 — Verify Admin Can Approve A Submitted ESS Timesheet (With Comment)
 * Modul    : Time - Employee Timesheets (Admin)
 * Kategori : Positive (+) / Cross-Role
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TS-APPROVAL-01-Verify-Admin-Approve-Timesheet.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * TUJUAN:
 *   Admin membuka timesheet SUBMITTED milik ESS dari "Timesheets Pending Action" -> View -> isi
 *   komentar -> Approve -> APPROVED. ESS melihat APPROVED dan tidak lagi punya tombol Submit;
 *   timesheet hilang dari daftar Pending Action.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TS-APPROVAL-01-Verify-Admin-Approve-Timesheet.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';
import { EmployeeTimesheetPage, MyTimesheetPage } from '../../../src/pages';
import { createEssTimesheet, getEssTimesheetStatus } from '../../../src/utils/createEssTimesheet';

test('TC-TIME-TS-APPROVAL-01: admin approves a submitted ESS timesheet with a comment', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-TIME-TS-APPROVAL-01', 'Admin Approve Timesheet', env.baseURL, page);

  report.step('Setup: ESS + timesheet minggu ini SUBMITTED (15:30 jam)');
  const { ess, essPage, close } = await createEssTimesheet(page, browser, addEmployeePage, 'QaTsApprove');
  const lastName = ess.fullName.split(' ').pop() ?? ess.fullName;

  report.step('[Admin UI] Pending Action -> View -> komentar -> Approve');
  const employeeTimesheets = new EmployeeTimesheetPage(page);
  await employeeTimesheets.goto();
  const row = employeeTimesheets.pendingRowFor(lastName);
  report.check('Baris ESS ada di Pending Action', await isVisibleWithWait(row, 15_000));
  await employeeTimesheets.view(row);
  const resp = await employeeTimesheets.act('Approve', 'Disetujui, sesuai project ACME.');
  const body = await resp?.json().catch(() => null);
  report.check('[API] Approve 200 -> APPROVED', resp?.status() === 200 && body?.data?.status?.id === 'APPROVED', `status=${resp?.status()}, ts=${JSON.stringify(body?.data?.status)}`);
  report.finding('Payload Approve', resp?.request().postData() ?? '(tidak tertangkap)');

  report.step('[ESS] Status APPROVED, tombol Submit tidak ada lagi');
  report.check('[ESS API] Status APPROVED', (await getEssTimesheetStatus(essPage)) === 'APPROVED');
  const myTimesheet = new MyTimesheetPage(essPage);
  await myTimesheet.goto();
  report.check('ESS UI menampilkan "Status: Approved"', await isVisibleWithWait(essPage.getByText('Status: Approved'), 15_000));
  report.check('Tombol Submit TIDAK ada utk timesheet Approved', !(await essPage.getByRole('button', { name: 'Submit' }).isVisible()));

  report.step('[Admin UI] Timesheet keluar dari Pending Action');
  await employeeTimesheets.goto();
  report.check('Baris ESS tidak lagi di Pending Action', await isHiddenWithWait(employeeTimesheets.pendingRowFor(lastName), 10_000));

  await close();
  report.print();
});
