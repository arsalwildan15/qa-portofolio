/**
 * ================================================================================
 * TC-PERF-TRACKER-03 — Verify Behaviour When Two Trackers With The Same Name Are Created For One Employee
 * Modul    : Performance - Configure - Trackers
 * Kategori : Negative (-) 2.3 | Edge Case (!) 4.8 -- Business Rule (observasi desain)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-TRACKER-03-Verify-Duplicate-Tracker-Name-Same-Employee.spec.ts
 * Path     : tests/performance/tracker/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan aturan keunikan nama tracker. Confirmed live: tracker kedua dgn nama SAMA
 *   utk karyawan yg SAMA diterima (200, id berbeda) dan keduanya muncul di My Trackers karyawan
 *   -- tidak ada validasi unik (sejalan dgn KPI-05: nama KPI duplikat juga diizinkan). TC
 *   memverifikasi keduanya benar-benar entitas terpisah (log di salah satu tidak bocor ke yg
 *   lain), dan mencatat duplikasi nama sbg finding desain, bukan bug.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/tracker/TC-PERF-TRACKER-03-Verify-Duplicate-Tracker-Name-Same-Employee.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssTracker } from '../../../src/utils/createEssReview';

test('TC-PERF-TRACKER-03: two same-named trackers for one employee are separate entities', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PERF-TRACKER-03', 'Duplicate Tracker Name Same Employee', env.baseURL, page);

  report.step('Setup: ESS + tracker pertama (via API)');
  const { ess, essPage, close, trackerId, trackerName, reviewerEmpNumber } = await createEssTracker(page, browser, addEmployeePage, 'QaPerfTrkDup');

  report.step('[Admin API] Buat tracker kedua dgn nama & karyawan yg sama');
  const dup = await page.request.post('/web/index.php/api/v2/performance/config/trackers', {
    data: { trackerName, empNumber: ess.empNumber, reviewerEmpNumbers: [reviewerEmpNumber] },
  });
  const dupId = (await dup.json().catch(() => null))?.data?.id as number | undefined;
  report.finding('Respons tracker duplikat', `status=${dup.status()}, id=${dupId}`);
  report.check('Respons terdefinisi: ditolak 4xx ATAU diterima sbg entitas baru (id berbeda)', (dup.status() >= 400 && dup.status() < 500) || (dup.status() === 200 && !!dupId && dupId !== trackerId), `status=${dup.status()}, first=${trackerId}, second=${dupId}`);

  if (dup.status() === 200 && dupId) {
    report.finding('Nama tracker duplikat DIIZINKAN (observasi desain)', 'Sejalan dgn KPI-05; karyawan melihat dua tracker bernama sama di My Trackers dan hanya bisa membedakannya dari tanggal/urutan.');

    report.step('[ESS API] My Trackers memuat keduanya');
    const mine = ((await (await essPage.request.get('/web/index.php/api/v2/performance/trackers?limit=50&offset=0')).json().catch(() => null))?.data ?? []) as Array<{ id: number }>;
    report.check('Kedua tracker ada di My Trackers', [trackerId, dupId].every((id) => mine.some((t) => t.id === id)), `ids=${JSON.stringify(mine.map((t) => t.id))}`);

    report.step('[ESS API] Log di tracker pertama tidak muncul di tracker kedua');
    const logText = `QaDupLog ${Date.now()}`;
    const post = await essPage.request.post(`/web/index.php/api/v2/performance/trackers/${trackerId}/logs`, { data: { log: logText, comment: 'c', achievement: 1 } });
    report.check('[API] POST log ke tracker pertama 200', post.status() === 200, `status=${post.status()}`);
    const logsOf = async (id: number) => ((await (await essPage.request.get(`/web/index.php/api/v2/performance/trackers/${id}/logs?limit=50&offset=0`)).json().catch(() => null))?.data ?? []) as Array<{ log: string }>;
    report.check('Log ada di tracker pertama', (await logsOf(trackerId)).some((l) => l.log === logText));
    report.check('Log TIDAK ada di tracker kedua', !(await logsOf(dupId)).some((l) => l.log === logText));
  }

  await close();
  report.print();
});
