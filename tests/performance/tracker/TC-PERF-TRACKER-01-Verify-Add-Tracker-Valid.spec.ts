/**
 * ================================================================================
 * TC-PERF-TRACKER-01 — Verify Adding A Performance Tracker With Valid Data Succeeds
 * Modul    : Performance - Configure - Trackers
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-TRACKER-01-Verify-Add-Tracker-Valid.spec.ts
 * Path     : tests/performance/tracker/
 * ================================================================================
 *
 * TUJUAN:
 *   Tracker = jurnal kinerja per employee (BUKAN konfigurasi KPI). Tambah tracker baru (Tracker
 *   Name, Employee Name, Reviewer) -> POST config/trackers 200 dgn data yg benar, dan tracker
 *   muncul di daftar Performance Trackers.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/tracker/TC-PERF-TRACKER-01-Verify-Add-Tracker-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';

test('TC-PERF-TRACKER-01: adding a tracker with valid data succeeds and appears in the list', async ({
  page,
  addEmployeePage,
  performanceTrackerPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-TRACKER-01', 'Add Tracker Valid', env.baseURL, page);
  const trackerName = `QaTracker ${Date.now()}`;

  report.step('Setup: employee baru (target tracker) + akun login sbg reviewer');
  const me = await getLoggedInEmployeeName(page);
  const emp = await createTestEmployee(page, addEmployeePage, 'QaTrk');

  report.step('Buka Add Performance Tracker, isi Tracker Name, Employee, Reviewer -> Save');
  await performanceTrackerPage.gotoAdd();
  await performanceTrackerPage.trackerNameInput.fill(trackerName);
  await performanceTrackerPage.selectEmployee(emp.employeeId, emp.lastName);
  await performanceTrackerPage.selectReviewer(me.fullName.split(' ')[0] ?? me.fullName);
  const resp = await performanceTrackerPage.save();
  const body = await resp?.json().catch(() => null);
  report.check('[API] POST config/trackers 200', resp?.status() === 200, `status=${resp?.status()}`);
  report.check('[API] trackerName tersimpan benar', body?.data?.trackerName === trackerName, `trackerName=${body?.data?.trackerName}`);
  report.check('[API] employee tertaut ke employee yg dipilih', body?.data?.employee?.empNumber === emp.empNumber, `empNumber=${body?.data?.employee?.empNumber}`);
  report.check('[API] reviewer berisi akun login', (body?.data?.reviewers ?? []).some((r: { empNumber?: number }) => r.empNumber === me.empNumber), `reviewers=${JSON.stringify(body?.data?.reviewers)}`);

  report.step('Verify: tracker muncul di daftar Performance Trackers');
  await performanceTrackerPage.goto();
  const found = await performanceTrackerPage.tableRows.filter({ hasText: trackerName }).first().isVisible({ timeout: 10_000 }).catch(() => false);
  report.check('Tracker baru ada di daftar', found, `trackerName=${trackerName}`);

  report.print();
});
