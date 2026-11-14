/**
 * ================================================================================
 * TC-PERF-KPI-06 — Verify Invalid/Nonexistent KPI IDs Are Handled Safely
 * Modul    : Performance - Configure - KPIs
 * Kategori : Security (S) 5.2 / Negative (-) 2.6
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-KPI-06-Verify-Invalid-ID-Handled-Safely.spec.ts
 * Path     : tests/performance/kpi/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi operasi GET/DELETE thd KPI ID yg tidak eksis atau negatif ditolak dgn
 *   aman (404/422), bukan 500/crash/leak.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/kpi/TC-PERF-KPI-06-Verify-Invalid-ID-Handled-Safely.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PERF-KPI-06: GET/DELETE on invalid KPI IDs are rejected safely (no 500/crash/leak)', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PERF-KPI-06', 'Invalid ID Handled Safely', env.baseURL, page);

  report.step('DELETE KPI dgn ID tidak eksis (999999)');
  const delResp = await page.request.delete('/web/index.php/api/v2/performance/kpis', { data: { ids: [999999] } });
  report.check('[API] DELETE ID tidak eksis -> 404 bersih (bukan 500/crash)', delResp.status() === 404, `status=${delResp.status()}`);

  report.step('GET KPI dgn ID tidak eksis (999999)');
  const getResp = await page.request.get('/web/index.php/api/v2/performance/kpis/999999');
  report.check('[API] GET ID tidak eksis -> 404 bersih', getResp.status() === 404, `status=${getResp.status()}`);

  report.step('GET KPI dgn ID negatif (-1)');
  const negResp = await page.request.get('/web/index.php/api/v2/performance/kpis/-1');
  report.check('[API] GET ID negatif ditolak dgn aman (404/422, bukan 500/leak)', [404, 422].includes(negResp.status()), `status=${negResp.status()}`);

  report.print();
});
