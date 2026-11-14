/**
 * ================================================================================
 * TC-TIME-ADMIN-ATTENDANCE-02 — Verify Invalid Employee/Timesheet IDs Are Handled Safely
 * Modul    : Time - Attendance & Timesheets (API Access Control)
 * Kategori : Security (S) 5.2 / Negative (-) 2.6
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-ADMIN-ATTENDANCE-02-Verify-Invalid-ID-Handled-Safely.spec.ts
 * Path     : tests/time/attendance/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi endpoint Attendance Records & Timesheet menangani empNumber/timesheetId yg
 *   tidak eksis atau negatif dgn aman (4xx yg jelas), bukan 500/crash/leak.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/attendance/TC-TIME-ADMIN-ATTENDANCE-02-Verify-Invalid-ID-Handled-Safely.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-TIME-ADMIN-ATTENDANCE-02: invalid empNumber/timesheetId are rejected safely across Attendance and Timesheet APIs', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-TIME-ADMIN-ATTENDANCE-02', 'Invalid ID Handled Safely', env.baseURL, page);

  report.step('GET attendance records utk empNumber tidak eksis (999999)');
  const r1 = await page.request.get('/web/index.php/api/v2/attendance/employees/999999/records?limit=50');
  report.check('[API] empNumber tidak eksis ditolak dgn aman (422, bukan 500/leak)', r1.status() === 422, `status=${r1.status()}`);

  report.step('GET attendance records utk empNumber negatif (-1)');
  const r2 = await page.request.get('/web/index.php/api/v2/attendance/employees/-1/records?limit=50');
  report.check('[API] empNumber negatif ditolak dgn aman (422)', r2.status() === 422, `status=${r2.status()}`);

  report.step('GET timesheet entries utk timesheetId tidak eksis (999999)');
  const r3 = await page.request.get('/web/index.php/api/v2/time/timesheets/999999/entries');
  report.check('[API] timesheetId tidak eksis -> 404 bersih (bukan 500/crash)', r3.status() === 404, `status=${r3.status()}`);

  report.print();
});
