/**
 * ================================================================================
 * TC-PERF-KPI-04 — Verify Min/Max Rating Boundary On Add KPI
 * Modul    : Performance - Configure - KPIs
 * Kategori : Boundary (B) 3.2
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-KPI-04-Verify-Rating-Boundary.spec.ts
 * Path     : tests/performance/kpi/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi batas nilai Minimum/Maximum Rating:
 *   - Minimum > Maximum (5 > 1): ditolak CLIENT-SIDE dgn pesan jelas, tidak ada POST terkirim.
 *   - Minimum = 0 (valid, batas bawah bisnis): diterima, KPI tersimpan.
 *   - Minimum = -1 (negatif): diblokir CLIENT-SIDE, tidak ada POST terkirim sama sekali
 *     (dikonfirmasi live: input numerik menolak nilai negatif di level browser).
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/kpi/TC-PERF-KPI-04-Verify-Rating-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PERF-KPI-04: min>max rejected client-side, min=0 accepted, min=-1 blocked client-side', async ({
  page,
  performanceKpiPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-KPI-04', 'Rating Boundary', env.baseURL, page);
  const suffix = Date.now();

  report.step('Minimum (5) > Maximum (1): harapannya ditolak client-side');
  await performanceKpiPage.gotoAdd();
  await performanceKpiPage.kpiNameInput.fill(`Boundary MinMax ${suffix}`);
  await performanceKpiPage.selectJobTitle('HR Manager');
  await performanceKpiPage.minRatingInput.fill('5');
  await performanceKpiPage.maxRatingInput.fill('1');
  const resp1 = await performanceKpiPage.save();
  report.check('TIDAK ada POST terkirim utk Min > Max', resp1 === null, `status=${resp1?.status()}`);
  const text1 = await page.locator('body').innerText();
  report.check('Pesan error Min/Max muncul', /should be less than|should be greater than/i.test(text1));

  report.step('Minimum = 0: harapannya diterima (batas bawah bisnis yg valid)');
  await performanceKpiPage.gotoAdd();
  await performanceKpiPage.kpiNameInput.fill(`Boundary MinZero ${suffix}`);
  await performanceKpiPage.selectJobTitle('HR Manager');
  await performanceKpiPage.minRatingInput.fill('0');
  await performanceKpiPage.maxRatingInput.fill('5');
  const resp2 = await performanceKpiPage.save();
  const body2 = await resp2?.json().catch(() => null);
  report.check('[API] Min=0 diterima (status 200)', resp2?.status() === 200, `status=${resp2?.status()}`);
  report.check('[API] minRating tersimpan sbg 0', body2?.data?.minRating === 0, `minRating=${body2?.data?.minRating}`);

  report.step('Minimum = -1 (negatif): harapannya diblokir client-side');
  await performanceKpiPage.gotoAdd();
  await performanceKpiPage.kpiNameInput.fill(`Boundary MinNeg ${suffix}`);
  await performanceKpiPage.selectJobTitle('HR Manager');
  await performanceKpiPage.minRatingInput.fill('-1');
  await performanceKpiPage.maxRatingInput.fill('5');
  const resp3 = await performanceKpiPage.save();
  report.check('TIDAK ada POST terkirim utk Min = -1 (diblokir client-side)', resp3 === null, `status=${resp3?.status()}`);

  report.print();
});
