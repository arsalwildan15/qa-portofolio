/**
 * ================================================================================
 * TC-PERF-TRACKER-08 — Verify Tracker Log: Contract, Server Validation, Achievement Enum, Unicode And Injection
 * Modul    : Performance > Tracker Logs (U104)
 * Kategori : Positive (+) 1.1-C 1.1-R | Negative (-) 2.1 2.2 | Boundary (B) 3.1 3.2 |
 *            Edge (!) 4.1 | Security (S) 5.1-SQLi 5.1-XSS-Stored | API (A) 6.2 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-TRACKER-08-Verify-Tracker-Log-Contract-Validation-And-Injection.spec.ts
 * Path     : tests/performance/tracker/
 * ================================================================================
 *
 * LATAR (dibaca live dari src/pages/PerformanceTrackerPage.ts & dikonfirmasi ulang 17 Nov 2026):
 * POST performance/trackers/<id>/logs body {log, comment, achievement: 1 (Positive) | 2
 * (Negative)}.
 *
 * TUJUAN:
 *   1.1-C / 1.1-R  POST log valid (Positive & Negative) -> 200 + id; GET logs -> baris muncul,
 *          meta.positive/meta.negative terhitung benar.
 *   2.1 / 6.5  tanpa log/comment/achievement -> 422 dgn invalidParamKeys spesifik.
 *   2.2 / 6.5  achievement bukan 1/2 (mis. 3 atau "x") -> 422.
 *   3.1 / 3.2  log 150 karakter (batas atas, dikonfirmasi via probe) -> 200; 151 karakter -> 422.
 *   4.1 / 5.1-SQLi / 5.1-XSS-Stored  log & comment berisi Arab/CJK, kutip SQL, HTML ->
 *          tersimpan apa adanya sebagai teks (render aman dibuktikan TC lain, TRACKER-06).
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/tracker/TC-PERF-TRACKER-08-Verify-Tracker-Log-Contract-Validation-And-Injection.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

const API = '/web/index.php/api/v2/';
const keysOf = async (r: { json(): Promise<unknown> }) => (((await r.json().catch(() => null)) as { error?: { data?: { invalidParamKeys?: string[] } } } | null)?.error?.data?.invalidParamKeys ?? []).join(',');

test('TC-PERF-TRACKER-08: Tracker Log - contract, validation, achievement enum, injection', async ({ page }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-PERF-TRACKER-08', 'Tracker Log Contract Validation Injection', env.baseURL);
  const emp = await createEmployee(page.request, 'QaTrkLog', `L${Date.now() % 100000}`);
  const trackerResp = await page.request.post(`${API}performance/config/trackers`, { data: { trackerName: `QaTrkLogTrk${Date.now() % 100000}`, empNumber: emp, reviewerEmpNumbers: [] } });
  const trackerId = ((await trackerResp.json()) as { data: { id: number } }).data.id;
  try {
    report.step('Create: Positive & Negative');
    const pos = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'QaLogPositive', comment: 'komentar positif', achievement: 1 } });
    report.check('1.1-C [U104] POST log Positive (achievement=1) -> 200 + id', pos.status() === 200 && typeof ((await pos.json()) as { data: { id: number } }).data.id === 'number', `status=${pos.status()}`);
    const neg = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'QaLogNegative', comment: 'komentar negatif', achievement: 2 } });
    report.check('1.1-C [U104] POST log Negative (achievement=2) -> 200 + id', neg.status() === 200, `status=${neg.status()}`);
    const list = ((await (await page.request.get(`${API}performance/trackers/${trackerId}/logs?limit=10`)).json()) as { data: unknown[]; meta: { total: number; positive: number; negative: number } }).meta;
    report.check('1.1-R / 6.2 [U104] GET logs -> meta.positive & meta.negative terhitung benar', list.total === 2 && list.positive === 1 && list.negative === 1, JSON.stringify(list));

    report.step('Validasi required & enum achievement');
    const empty = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: {} });
    const k = await keysOf(empty);
    report.check('2.1 / 6.5 [U104] POST tanpa field -> 422 dgn "log"/"comment"/"achievement"', empty.status() === 422 && k.includes('log') && k.includes('comment') && k.includes('achievement'), `status=${empty.status()} keys=${k}`);
    const badEnumNum = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'x', comment: 'x', achievement: 3 } });
    report.check('2.2 / 6.5 [U104] achievement=3 (di luar enum 1/2) -> 422', badEnumNum.status() === 422, `status=${badEnumNum.status()}`);
    const badEnumStr = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'x', comment: 'x', achievement: 'x' } });
    report.check('2.2 / 6.5 [U104] achievement="x" (bukan angka) -> 422', badEnumStr.status() === 422, `status=${badEnumStr.status()}`);

    report.step('Panjang & unicode/injeksi');
    const long150 = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'L'.repeat(150), comment: '', achievement: 1 } });
    report.check('3.1 [U104] Log 150 karakter (batas atas) -> 200 (diterima)', long150.status() === 200, `status=${long150.status()}`);
    const long151 = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'L'.repeat(151), comment: '', achievement: 1 } });
    report.check('3.2 / 6.5 [U104] Log 151 karakter (lewat batas) -> 422', long151.status() === 422, `status=${long151.status()}`);
    for (const [label, text] of [['4.1 Arab/CJK', 'مرحبا 你好'], ['5.1-SQLi', "' OR '1'='1 --"], ['5.1-XSS-Stored', '<img src=x onerror=alert(1)>']] as const) {
      const r = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: text, comment: text, achievement: 1 } });
      report.check(`${label} [U104] Log & comment -> 200 & tersimpan (dicek via GET)`, r.status() === 200, `status=${r.status()}`);
    }
    const afterInject = await page.request.get(`${API}performance/trackers/${trackerId}/logs?limit=20`);
    const rows = ((await afterInject.json()) as { data: Array<{ log: string }> }).data;
    report.check('4.1 / 5.1-SQLi / 5.1-XSS-Stored Baris tersimpan identik sebagai teks (dicek via GET)', rows.some((r) => r.log === 'مرحبا 你好') && rows.some((r) => r.log === "' OR '1'='1 --") && rows.some((r) => r.log === '<img src=x onerror=alert(1)>'), `jumlah baris=${rows.length}`);
  } finally {
    await page.request.delete(`${API}performance/config/trackers`, { data: { ids: [trackerId] } }).catch(() => null);
    await page.request.delete(`${API}pim/employees`, { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
