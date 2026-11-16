/**
 * ================================================================================
 * TC-PERF-EVAL-12 — Verify KPI Rating Min/Max Boundary (Client-Side And Server-Side)
 * Modul    : Performance - Manage Reviews - Evaluate
 * Kategori : Boundary (B) 3.2 | API (A) 6.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-EVAL-12-Verify-Rating-Min-Max-Boundary.spec.ts
 * Path     : tests/performance/evaluate/
 * ================================================================================
 *
 * TUJUAN:
 *   Rentang rating berlaku per KPI (minRating/maxRating dari Configure > KPIs). Diverifikasi:
 *   - UI: max+1 -> "Rating should be less than or equal to <max>"; min-1 -> "...greater than or
 *     equal to <min>"; tepat min dan tepat max diterima (tanpa error).
 *   - API (bypass UI): rating > max dan rating negatif ditolak 422 (confirmed live).
 *   Rating NON-ANGKA via API adalah bug terpisah -> TC-PERF-EVAL-15.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/evaluate/TC-PERF-EVAL-12-Verify-Rating-Min-Max-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createReview } from '../../../src/utils/createReview';

test('TC-PERF-EVAL-12: KPI rating outside min/max is rejected (UI and API), exact min/max accepted', async ({
  page,
  addEmployeePage,
  reportToPage,
  performanceManageReviewsPage,
  performanceEvaluatePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PERF-EVAL-12', 'Rating Min/Max Boundary', env.baseURL, page);

  report.step('Setup: review Activated');
  const { reviewId } = await createReview(page, { addEmployeePage, reportToPage, performanceManageReviewsPage }, 'QaEvalRange');
  const kpis = ((await (await page.request.get(`/web/index.php/api/v2/performance/reviews/${reviewId}/kpis`)).json())?.data ?? []) as Array<{ id: number; title: string; minRating: number; maxRating: number }>;
  const kpi = kpis[0];
  if (!kpi) {
    report.check('[SETUP GAGAL] review tanpa KPI', false);
    report.print();
    return;
  }
  report.finding('KPI yg diuji', `${kpi.title} (min=${kpi.minRating}, max=${kpi.maxRating})`);

  await performanceEvaluatePage.goto(reviewId);
  const input = performanceEvaluatePage.kpiRatingInput(0);
  const errorFor = async (value: string): Promise<string[]> => {
    await input.fill(value);
    await page.keyboard.press('Tab');
    return performanceEvaluatePage.fieldErrors.allInnerTexts();
  };

  report.step('[UI] max+1 dan min-1 -> pesan error rentang');
  const overErrors = await errorFor(String(kpi.maxRating + 1));
  report.check(`max+1 (${kpi.maxRating + 1}) -> "less than or equal to ${kpi.maxRating}"`, overErrors.some((e) => e.includes(`less than or equal to ${kpi.maxRating}`)), `errors=${JSON.stringify(overErrors)}`);
  const underErrors = await errorFor(String(kpi.minRating - 1));
  report.check(`min-1 (${kpi.minRating - 1}) -> "greater than or equal to ${kpi.minRating}"`, underErrors.some((e) => e.includes(`greater than or equal to ${kpi.minRating}`)), `errors=${JSON.stringify(underErrors)}`);

  report.step('[UI] tepat max dan tepat min -> diterima');
  const atMax = await errorFor(String(kpi.maxRating));
  report.check(`tepat max (${kpi.maxRating}) tanpa error rentang`, !atMax.some((e) => /Rating should be/.test(e)), `errors=${JSON.stringify(atMax)}`);
  const atMin = await errorFor(String(kpi.minRating));
  report.check(`tepat min (${kpi.minRating}) tanpa error rentang`, !atMin.some((e) => /Rating should be/.test(e)), `errors=${JSON.stringify(atMin)}`);

  report.step('[API] bypass UI: rating > max dan negatif harus ditolak server');
  const put = (rating: string) => page.request.put(`/web/index.php/api/v2/performance/reviews/${reviewId}/evaluation/supervisor`, {
    data: { ratings: [{ kpiId: kpi.id, rating, comment: 'boundary' }], generalComment: '' },
  });
  const over = await put(String(kpi.maxRating + 50));
  report.check('[API] rating > max ditolak 422', over.status() === 422, `status=${over.status()}`);
  const negative = await put('-10');
  report.check('[API] rating negatif ditolak 422', negative.status() === 422, `status=${negative.status()}`);

  report.print();
});
