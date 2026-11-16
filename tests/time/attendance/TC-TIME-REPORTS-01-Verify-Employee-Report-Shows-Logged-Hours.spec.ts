/**
 * ================================================================================
 * TC-TIME-REPORTS-01 — Verify Employee Report Shows Hours Logged Via My Timesheet
 * Modul    : Time - Reports (Employee Reports)
 * Kategori : Positive (+) 1.4 1.6 | API (A) 6.1 -- End-to-end cross-check
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-REPORTS-01-Verify-Employee-Report-Shows-Logged-Hours.spec.ts
 * Path     : tests/time/attendance/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Employee Report (Time > Reports > Employee Reports) benar2 membaca data yg
 *   sama dgn yg disimpan lewat My Timesheet -- bukan hanya menyimpan (sudah dicek di
 *   TC-TIME-TIMESHEET-01), tapi juga BISA DIQUERY kembali via laporan terpisah. Alur: isi jam
 *   baru di My Timesheet utk Project+Activity tertentu, Save, lalu cari laporan Employee
 *   Report utk periode yg sama dan pastikan baris Project/Activity/jam tsb muncul dan Total
 *   Duration-nya benar.
 *
 * [BUG SCRIPT, diperbaiki] Mencari employee di form ini pakai nama ("John") TIDAK aman --
 * dikonfirmasi live, shared demo ini punya banyak employee seed/junk dgn nama mengandung
 * "John" (mis. "john doe123"), dan autocomplete memilih opsi PERTAMA tanpa menjamin itu
 * employee yg login. Diperbaiki dgn mencari via `employeeId` (dari getLoggedInEmployeeName(),
 * util yg sudah ada tepat utk masalah ini), yg dijamin unik, bukan nama tampilan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/attendance/TC-TIME-REPORTS-01-Verify-Employee-Report-Shows-Logged-Hours.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';

/** yyyy-dd-mm string for the first/last day of the current month. */
function monthRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-01-${String(month).padStart(2, '0')}`,
    to: `${year}-${String(lastDay).padStart(2, '0')}-${String(month).padStart(2, '0')}`,
  };
}

test('TC-TIME-REPORTS-01: hours logged via My Timesheet are queryable through Employee Report', async ({
  page,
  myTimesheetPage,
  timeEmployeeReportPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-TIME-REPORTS-01', 'Employee Report Shows Logged Hours', env.baseURL, page);

  report.step('Isi 3:00 jam baru di My Timesheet utk Project+Activity, Save');
  await myTimesheetPage.goto();
  await myTimesheetPage.startEdit();
  const { project, activity } = await myTimesheetPage.fillFirstRow([
    'ACME',
    'Apache',
    'Coca-Cola',
    'Fresh Books',
    'FreeWave',
  ]);
  await myTimesheetPage.fillDuration(0, '3:00');
  const saveResp = await myTimesheetPage.save();
  report.check('[API] Save timesheet berhasil (status 200)', saveResp?.status() === 200, `status=${saveResp?.status()}, project=${project}, activity=${activity}`);

  report.step('Buka Employee Report utk employee yg sama (dicari via employeeId, bukan nama -- nama bisa ambigu), periode bulan ini');
  const loggedInEmployee = await getLoggedInEmployeeName(page);
  const { from, to } = monthRange();
  await timeEmployeeReportPage.goto();
  await timeEmployeeReportPage.selectEmployee(loggedInEmployee.employeeId);
  await timeEmployeeReportPage.fillDateRange(from, to);
  const viewResp = await timeEmployeeReportPage.view();
  const viewBody = await viewResp?.json().catch(() => null);
  report.check('[API] GET reports/data berhasil (status 200)', viewResp?.status() === 200, `status=${viewResp?.status()}`);

  report.step(`Verify: baris "${project}" / "${activity}" muncul di laporan dgn total >= 3 jam`);
  await page.waitForTimeout(1_500);
  const bodyText = await page.locator('body').innerText();
  const projectShortName = project.split(' - ')[0] ?? project;
  report.check(`Project "${projectShortName}" muncul di laporan`, bodyText.includes(projectShortName));
  report.check(`Activity "${activity}" muncul di laporan`, bodyText.includes(activity));
  const totalRow = (viewBody?.data ?? []).find(
    (row: { projectName?: string; activityName?: string }) =>
      row.projectName?.includes(projectShortName) && row.activityName === activity,
  );
  report.check(
    `[API] Response data berisi baris Project/Activity ini dgn duration >= 3.00`,
    Number(totalRow?.duration ?? 0) >= 3,
    `row=${JSON.stringify(totalRow)}`,
  );

  report.print();
});
