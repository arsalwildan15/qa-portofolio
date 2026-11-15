/**
 * ================================================================================
 * TC-TIME-TS-APPROVAL-04 — Verify A Timesheet That Was Never Submitted Cannot Be Approved Via API
 * Modul    : Time - Employee Timesheets (Admin)
 * Kategori : Negative (-) / State Machine Bypass
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TS-APPROVAL-04-Verify-Approve-Unsubmitted-Timesheet-Rejected.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * TUJUAN:
 *   Timesheet ESS yg sudah berisi jam tapi BELUM di-Submit (status id "NOT SUBMITTED", pakai spasi) tidak muncul di
 *   Pending Action. Admin memanggil APPROVE langsung via API -> harus ditolak dan status tetap
 *   "NOT SUBMITTED" (tidak boleh melompati langkah Submit milik karyawan).
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TS-APPROVAL-04-Verify-Approve-Unsubmitted-Timesheet-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssTimesheet, getEssTimesheetStatus } from '../../../src/utils/createEssTimesheet';

test('TC-TIME-TS-APPROVAL-04: a timesheet that was never submitted cannot be approved via API', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-TIME-TS-APPROVAL-04', 'Approve Unsubmitted Timesheet Rejected', env.baseURL, page);

  report.step('Setup: ESS + timesheet berisi jam, TIDAK di-Submit');
  const { ess, essPage, close, timesheetId } = await createEssTimesheet(page, browser, addEmployeePage, 'QaTsDraft', { submit: false });
  const initial = await getEssTimesheetStatus(essPage);
  report.check('Status awal "NOT SUBMITTED"', initial === 'NOT SUBMITTED', `status=${initial}`);

  report.step('[Admin API] APPROVE timesheet yg belum disubmit');
  const approve = await page.request.put(`/web/index.php/api/v2/time/employees/${ess.empNumber}/timesheets/${timesheetId}`, { data: { action: 'APPROVE' } });
  report.check('APPROVE timesheet "NOT SUBMITTED" ditolak (bukan 200)', approve.status() !== 200, `status=${approve.status()}`);
  const after = await getEssTimesheetStatus(essPage);
  report.check('Status tetap "NOT SUBMITTED"', after === 'NOT SUBMITTED', `status=${after}`);

  await close();
  report.print();
});
