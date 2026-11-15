/**
 * ================================================================================
 * TC-PERF-TRACKER-04 — Verify A Tracker Can Be Renamed And Then Deleted (Including Its Logs)
 * Modul    : Performance - Configure - Trackers
 * Kategori : Positive (+) / CRUD
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-TRACKER-04-Verify-Edit-And-Delete-Tracker.spec.ts
 * Path     : tests/performance/tracker/
 * ================================================================================
 *
 * TUJUAN:
 *   Edit (ikon pensil -> addPerformanceTracker/<id>, form terisi) -> Save = PUT
 *   config/trackers/<id> 200, nama baru tampil di daftar. Hapus (ikon trash -> dialog "Are you
 *   Sure?" -> Yes, Delete) = DELETE config/trackers {ids} 200 walau tracker SUDAH punya log
 *   (confirmed live) -> hilang dari daftar Admin & My Trackers ESS, GET tracker -> 404.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/tracker/TC-PERF-TRACKER-04-Verify-Edit-And-Delete-Tracker.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';
import { createEssTracker } from '../../../src/utils/createEssReview';

test('TC-PERF-TRACKER-04: a tracker can be renamed and then deleted together with its logs', async ({
  page,
  browser,
  addEmployeePage,
  performanceTrackerPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PERF-TRACKER-04', 'Edit And Delete Tracker', env.baseURL, page);

  report.step('Setup: ESS + tracker (via API) + 1 log dari ESS');
  const { essPage, close, trackerId, trackerName } = await createEssTracker(page, browser, addEmployeePage, 'QaPerfTrkEd');
  const logResp = await essPage.request.post(`/web/index.php/api/v2/performance/trackers/${trackerId}/logs`, { data: { log: 'log before delete', comment: 'c', achievement: 1 } });
  report.check('[API] Setup log tersimpan', logResp.status() === 200, `status=${logResp.status()}`);
  const newName = `${trackerName} Renamed`;

  report.step('[Admin UI] Edit -> ganti Tracker Name -> Save');
  await performanceTrackerPage.goto();
  await performanceTrackerPage.clickEdit(trackerName);
  report.check('Form edit terisi nama lama', (await performanceTrackerPage.trackerNameInput.inputValue()) === trackerName);
  await performanceTrackerPage.trackerNameInput.fill(newName);
  const put = await performanceTrackerPage.saveEdit(trackerId);
  report.check('[API] PUT config/trackers/<id> 200', put?.status() === 200, `status=${put?.status()}`);
  const putBody = await put?.json().catch(() => null);
  report.check('[API] trackerName baru tersimpan', putBody?.data?.trackerName === newName, `trackerName=${putBody?.data?.trackerName}`);

  report.step('[Admin UI] Nama baru tampil di daftar');
  await performanceTrackerPage.goto();
  report.check('Baris dgn nama baru tampil', await isVisibleWithWait(performanceTrackerPage.rowFor(newName).first(), 15_000));

  report.step('[Admin UI] Hapus tracker (punya log)');
  const del = await performanceTrackerPage.deleteRow(newName);
  report.check('[API] DELETE config/trackers 200', del?.status() === 200, `status=${del?.status()}`);
  report.check('Baris hilang dari daftar Admin', await isHiddenWithWait(performanceTrackerPage.rowFor(newName).first(), 15_000));
  const gone = await page.request.get(`/web/index.php/api/v2/performance/employees/trackers/${trackerId}`);
  report.check('[API] GET tracker terhapus -> 404', gone.status() === 404, `status=${gone.status()}`);

  report.step('[ESS API] Tracker hilang dari My Trackers');
  const mine = ((await (await essPage.request.get('/web/index.php/api/v2/performance/trackers?limit=50&offset=0')).json().catch(() => null))?.data ?? []) as Array<{ id: number }>;
  report.check('Tracker tidak ada lagi di My Trackers ESS', !mine.some((t) => t.id === trackerId), `ids=${JSON.stringify(mine.map((t) => t.id))}`);

  await close();
  report.print();
});
