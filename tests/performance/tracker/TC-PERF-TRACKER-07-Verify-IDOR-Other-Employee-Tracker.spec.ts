/**
 * ================================================================================
 * TC-PERF-TRACKER-07 — Verify An Employee Cannot Read Or Write Another Employee's Tracker
 * Modul    : Performance - Tracker Logs (API authorization)
 * Kategori : Security (S) 5.2-IDOR -- IDOR
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-TRACKER-07-Verify-IDOR-Other-Employee-Tracker.spec.ts
 * Path     : tests/performance/tracker/
 * ================================================================================
 *
 * TUJUAN:
 *   ESS lain (bukan pemilik, bukan reviewer) mengakses tracker milik ESS pertama dgn id
 *   langsung. Confirmed live: GET employees/trackers/<id>, GET trackers/<id>/logs, dan POST
 *   trackers/<id>/logs semuanya 403; halaman ?mode=my menampilkan "Credential Required".
 *   Pemilik tetap bisa membaca (kontrol positif) dan tidak ada log asing yg tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/tracker/TC-PERF-TRACKER-07-Verify-IDOR-Other-Employee-Tracker.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createEssTracker } from '../../../src/utils/createEssReview';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';

test('TC-PERF-TRACKER-07: an employee cannot read or write another employee tracker', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PERF-TRACKER-07', 'IDOR Other Employee Tracker', env.baseURL, page);

  report.step('Setup: ESS pemilik + tracker; ESS lain (penyerang)');
  const { essPage, close, trackerId } = await createEssTracker(page, browser, addEmployeePage, 'QaPerfTrkOwn');
  const other = await createEssAccount(page, addEmployeePage, 'QaPerfTrkAtk');
  const { page: atk, close: closeAtk } = await loginAs(browser, other.username, other.password);
  const base = `/web/index.php/api/v2/performance`;

  report.step('[ESS lain, API] Baca tracker & log milik orang lain');
  const g1 = await atk.request.get(`${base}/employees/trackers/${trackerId}`);
  report.check('[API] GET employees/trackers/<id> -> 403', g1.status() === 403, `status=${g1.status()}`);
  const g2 = await atk.request.get(`${base}/trackers/${trackerId}/logs?limit=10&offset=0`);
  report.check('[API] GET trackers/<id>/logs -> 403', g2.status() === 403, `status=${g2.status()}`);

  report.step('[ESS lain, API] Tulis log ke tracker orang lain');
  const intrude = `intrusion ${Date.now()}`;
  const p1 = await atk.request.post(`${base}/trackers/${trackerId}/logs`, { data: { log: intrude, comment: 'x', achievement: 2 } });
  report.check('[API] POST trackers/<id>/logs -> 403', p1.status() === 403, `status=${p1.status()}`);

  report.step('[ESS lain, UI] Buka URL tracker orang lain');
  await atk.goto(`/web/index.php/performance/addPerformanceTrackerLog/trackId/${trackerId}?mode=my`);
  report.check('Halaman menampilkan "Credential Required"', await isVisibleWithWait(atk.getByText('Credential Required'), 15_000));

  report.step('[Pemilik, API] Kontrol positif & tidak ada log asing');
  const own = await essPage.request.get(`${base}/trackers/${trackerId}/logs?limit=50&offset=0`);
  const logs = ((await own.json().catch(() => null))?.data ?? []) as Array<{ log: string }>;
  report.check('[API] Pemilik bisa membaca log (200)', own.status() === 200, `status=${own.status()}`);
  report.check('Log penyerang TIDAK tersimpan', !logs.some((l) => l.log === intrude));

  await closeAtk();
  await close();
  report.print();
});
