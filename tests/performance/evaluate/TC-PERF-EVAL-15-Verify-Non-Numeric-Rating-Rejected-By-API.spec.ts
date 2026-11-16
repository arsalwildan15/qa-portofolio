/**
 * ================================================================================
 * TC-PERF-EVAL-15 — Verify The API Rejects A Non-Numeric KPI Rating
 * Modul    : Performance - Manage Reviews - Evaluate
 * Kategori : Negative (-) 2.2 | API (A) 6.1 -- Server-Side Validation
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-EVAL-15-Verify-Non-Numeric-Rating-Rejected-By-API.spec.ts
 * Path     : tests/performance/evaluate/
 * ================================================================================
 *
 * TUJUAN:
 *   UI menandai rating "abc" sbg error, dan server MENOLAK rating > max / negatif (422, lihat
 *   TC-PERF-EVAL-12). Tapi confirmed live 2026-11-15: PUT evaluation/supervisor dgn rating
 *   "abc" DITERIMA 200 (response meng-echo "abc"), lalu yg TERSIMPAN adalah "0.00" -- nilai
 *   non-angka diam-diam dikonversi jadi 0 tanpa error. Validasi angka cuma ada di client.
 *   Ekspektasi TC ini = server menolak (422) dan rating tidak berubah. BUG NYATA -> TC SENGAJA
 *   dibiarkan FAILED (R3) supaya tercatat di Bug-List.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/evaluate/TC-PERF-EVAL-15-Verify-Non-Numeric-Rating-Rejected-By-API.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createReview } from '../../../src/utils/createReview';

test('TC-PERF-EVAL-15: the evaluation API rejects a non-numeric KPI rating', async ({
  page,
  addEmployeePage,
  reportToPage,
  performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PERF-EVAL-15', 'Non-Numeric Rating Rejected By API', env.baseURL, page);

  report.step('Setup: review Activated');
  const { reviewId } = await createReview(page, { addEmployeePage, reportToPage, performanceManageReviewsPage }, 'QaEvalNaN');
  const kpis = ((await (await page.request.get(`/web/index.php/api/v2/performance/reviews/${reviewId}/kpis`)).json())?.data ?? []) as Array<{ id: number }>;
  const kpiId = kpis[0]?.id;

  report.step('[API] PUT evaluation/supervisor dgn rating "abc"');
  const resp = await page.request.put(`/web/index.php/api/v2/performance/reviews/${reviewId}/evaluation/supervisor`, {
    data: { ratings: [{ kpiId, rating: 'abc', comment: 'non-numeric' }], generalComment: '' },
  });
  report.check('[API] Rating non-angka ditolak 422', resp.status() === 422, `status=${resp.status()}`);

  report.step('[API] Cek apa yg sebenarnya tersimpan (KPI ini belum pernah dirating sebelumnya)');
  const stored = await (await page.request.get(`/web/index.php/api/v2/performance/reviews/${reviewId}/evaluation/supervisor`)).json().catch(() => null);
  const storedRating = (stored?.data ?? []).find((r: { kpi?: { id?: number } }) => r.kpi?.id === kpiId)?.rating;
  report.check(
    'Request ditolak -> rating KPI tetap kosong (tidak diam-diam diubah jadi angka)',
    storedRating === null || storedRating === undefined,
    `storedRating=${JSON.stringify(storedRating)}`,
  );

  report.print();
});
