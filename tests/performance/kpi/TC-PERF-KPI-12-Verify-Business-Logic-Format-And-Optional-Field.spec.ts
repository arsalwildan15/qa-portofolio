/**
 * ================================================================================
 * TC-PERF-KPI-12 — Verify KPI: Business Logic Bypass Via API, Format Validation And Optional Field
 * Modul    : Performance > Configure > KPIs (U066)
 * Kategori : Positive (+) 1.2 | Negative (-) 2.2 | Security (S) 5.9
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-KPI-12-Verify-Business-Logic-Format-And-Optional-Field.spec.ts
 * Path     : tests/performance/kpi/
 * ================================================================================
 *
 * LATAR: TC-PERF-KPI-04 sudah menutup 3.2 (boundary min/max) tapi hanya via UI (client-side
 * blocking) -- tidak pernah mengirim min>max langsung ke API, jadi tidak membuktikan server
 * SENDIRI menolaknya. Ini menutup 3 kode terakhir, dibuktikan via probe LIVE 18 Nov 2026.
 *
 * TUJUAN:
 *   5.9  POST minRating=50 > maxRating=10 LANGSUNG via API (bypass client) -> 400 ditolak
 *        server-side (bukan hanya validasi UI).
 *   2.2  minRating bertipe string non-numerik ("abc") -> 422.
 *   1.2  isDefault: true (field opsional) -> 200 diterima & tersimpan.
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/kpi/TC-PERF-KPI-12-Verify-Business-Logic-Format-And-Optional-Field.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const api = '/web/index.php/api/v2/performance/kpis';
type Kpi = { id: number; title: string; minRating: number; maxRating: number; isDefault: boolean | null };

test('TC-PERF-KPI-12: business logic bypass, format validation, optional field', async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-KPI-12', 'KPI Business Logic Format Optional Field', env.baseURL);
  const s = Date.now() % 100000;
  const createdIds: number[] = [];

  try {
    report.step('5.9 min>max LANGSUNG via API (bypass client-side)');
    const minMax = await page.request.post(api, { data: { title: `QaKpiBiz${s}`, minRating: 50, maxRating: 10, jobTitleId: 1 } });
    report.check('5.9 [U066] minRating=50 > maxRating=10 via API -> 400 ditolak server-side', minMax.status() === 400, `status=${minMax.status()}`);

    report.step('2.2 minRating non-numerik');
    const nonNumeric = await page.request.post(api, { data: { title: `QaKpiFmt${s}`, minRating: 'abc', maxRating: 100, jobTitleId: 1 } });
    report.check('2.2 [U066] minRating="abc" (non-numerik) -> 422', nonNumeric.status() === 422, `status=${nonNumeric.status()}`);

    report.step('1.2 Field opsional isDefault');
    const withDefault = await page.request.post(api, { data: { title: `QaKpiDef${s}`, minRating: 0, maxRating: 100, jobTitleId: 1, isDefault: true } });
    const withDefaultData = ((await withDefault.json().catch(() => ({}))) as { data?: Kpi }).data;
    if (withDefaultData?.id) createdIds.push(withDefaultData.id);
    report.check('1.2 [U066] isDefault: true (opsional) -> 200 & tersimpan', withDefault.status() === 200 && withDefaultData?.isDefault === true, `status=${withDefault.status()} isDefault=${withDefaultData?.isDefault}`);
  } finally {
    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  }
  report.print();
});
