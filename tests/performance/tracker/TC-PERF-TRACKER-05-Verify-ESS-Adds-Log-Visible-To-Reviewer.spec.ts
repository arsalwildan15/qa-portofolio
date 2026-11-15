/**
 * ================================================================================
 * TC-PERF-TRACKER-05 — Verify An Employee's Tracker Log Is Saved And Visible To The Reviewer
 * Modul    : Performance - My Trackers (ESS) / Employee Trackers (reviewer)
 * Kategori : Positive (+) / Cross-Role
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-TRACKER-05-Verify-ESS-Adds-Log-Visible-To-Reviewer.spec.ts
 * Path     : tests/performance/tracker/
 * ================================================================================
 *
 * TUJUAN:
 *   Karyawan (ESS) membuka tracker-nya dari My Trackers (View -> addPerformanceTrackerLog/
 *   trackId/<id>?mode=my), Add Log (Log, Comment, Positive) -> POST trackers/<id>/logs
 *   {log, comment, achievement:1} 200 (confirmed live). Reviewer (Admin) membuka tracker yg
 *   sama dan melihat log tsb; reviewer juga bisa menambah log Negative (achievement 2).
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/tracker/TC-PERF-TRACKER-05-Verify-ESS-Adds-Log-Visible-To-Reviewer.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { PerformanceTrackerPage } from '../../../src/pages';
import { createEssTracker } from '../../../src/utils/createEssReview';

test('TC-PERF-TRACKER-05: an employee tracker log is saved and visible to the reviewer', async ({
  page,
  browser,
  addEmployeePage,
  performanceTrackerPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PERF-TRACKER-05', 'ESS Adds Log Visible To Reviewer', env.baseURL, page);
  const stamp = Date.now();
  const essLog = `Closed 12 tickets ${stamp}`;
  const reviewerLog = `Missed deadline ${stamp}`;

  report.step('Setup: ESS + tracker dgn Admin sbg reviewer (via API)');
  const { essPage, close, trackerId, trackerName } = await createEssTracker(page, browser, addEmployeePage, 'QaPerfTrkLog');

  report.step('[ESS UI] My Trackers -> View -> Add Log (Positive)');
  await essPage.goto('/web/index.php/performance/viewMyPerformanceTrackerList');
  const row = essPage.locator('.oxd-table-card').filter({ hasText: trackerName }).first();
  report.check('Tracker tampil di My Trackers ESS', await isVisibleWithWait(row, 15_000));
  await row.getByRole('button', { name: 'View' }).click();
  await essPage.waitForURL(new RegExp(`addPerformanceTrackerLog/trackId/${trackerId}\\?mode=my`), { timeout: 15_000 });
  const essTracker = new PerformanceTrackerPage(essPage);
  const post = await essTracker.addLog(trackerId, essLog, 'Positive comment', 'Positive');
  const postBody = post ? JSON.parse(post.request().postData() ?? '{}') : {};
  report.check('[API] POST trackers/<id>/logs 200', post?.status() === 200, `status=${post?.status()}`);
  report.check('[API] achievement = 1 (Positive)', Number(postBody.achievement) === 1, `body=${JSON.stringify(postBody)}`);
  report.check('Log tampil di halaman tracker ESS', await isVisibleWithWait(essPage.getByText(essLog), 10_000));

  report.step('[Admin UI] Reviewer membuka tracker yg sama');
  await performanceTrackerPage.gotoLogs(trackerId);
  report.check('Log ESS terlihat oleh reviewer', await isVisibleWithWait(page.getByText(essLog), 15_000));

  report.step('[Admin UI] Reviewer menambah log Negative');
  const rPost = await performanceTrackerPage.addLog(trackerId, reviewerLog, 'Reviewer comment', 'Negative');
  const rBody = rPost ? JSON.parse(rPost.request().postData() ?? '{}') : {};
  report.check('[API] POST log reviewer 200, achievement = 2', rPost?.status() === 200 && Number(rBody.achievement) === 2, `status=${rPost?.status()}, body=${JSON.stringify(rBody)}`);

  report.step('[ESS API] Kedua log ada di tracker');
  const logs = ((await (await essPage.request.get(`/web/index.php/api/v2/performance/trackers/${trackerId}/logs?limit=50&offset=0`)).json().catch(() => null))?.data ?? []) as Array<{ log: string }>;
  report.check('ESS melihat log sendiri & log reviewer', [essLog, reviewerLog].every((t) => logs.some((l) => l.log === t)), `logs=${JSON.stringify(logs.map((l) => l.log))}`);

  await close();
  report.print();
});
