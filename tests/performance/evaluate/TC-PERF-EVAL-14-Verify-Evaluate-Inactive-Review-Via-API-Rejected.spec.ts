/**
 * ================================================================================
 * TC-PERF-EVAL-14 — Verify An Inactive Review Cannot Be Evaluated Or Completed Via Direct API Calls
 * Modul    : Performance - Manage Reviews - Evaluate
 * Kategori : Negative (-) 2.5 | API (A) 6.1 -- Business-Logic Bypass
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-EVAL-14-Verify-Evaluate-Inactive-Review-Via-API-Rejected.spec.ts
 * Path     : tests/performance/evaluate/
 * ================================================================================
 *
 * TUJUAN:
 *   Di UI, review "Inactive" tidak punya tombol Evaluate. TC ini memastikan larangan itu juga
 *   ditegakkan server: PUT evaluation/supervisor (rating) dan PUT evaluation/final
 *   (complete:true) utk review Inactive ditolak (confirmed live: 422 dan 403), dan status
 *   review tetap "Inactive".
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/evaluate/TC-PERF-EVAL-14-Verify-Evaluate-Inactive-Review-Via-API-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createReview } from '../../../src/utils/createReview';

test('TC-PERF-EVAL-14: an Inactive review cannot be rated or completed via direct API calls', async ({
  page,
  addEmployeePage,
  reportToPage,
  performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PERF-EVAL-14', 'Evaluate Inactive Review Via API Rejected', env.baseURL, page);

  report.step('Setup: review TIDAK di-Activate (status Inactive)');
  const { reviewId } = await createReview(page, { addEmployeePage, reportToPage, performanceManageReviewsPage }, 'QaEvalInactive', { activate: false });

  report.step('[API] PUT evaluation/supervisor (rating) utk review Inactive');
  const putRating = await page.request.put(`/web/index.php/api/v2/performance/reviews/${reviewId}/evaluation/supervisor`, {
    data: { ratings: [{ kpiId: 17, rating: '70', comment: 'bypass' }], generalComment: 'bypass' },
  });
  report.check('[API] Rating review Inactive ditolak (bukan 200)', putRating.status() !== 200, `status=${putRating.status()}`);

  report.step('[API] PUT evaluation/final complete:true utk review Inactive');
  const putComplete = await page.request.put(`/web/index.php/api/v2/performance/reviews/${reviewId}/evaluation/final`, {
    data: { complete: true, finalRating: '70', finalComment: 'bypass', completedDate: '2026-07-07' },
  });
  report.check('[API] Complete review Inactive ditolak (bukan 200)', putComplete.status() !== 200, `status=${putComplete.status()}`);

  report.step('[API] Status review tetap "Inactive"');
  const review = await (await page.request.get(`/web/index.php/api/v2/performance/manage/reviews/${reviewId}`)).json().catch(() => null);
  report.check('Status review masih "Inactive"', review?.data?.overallStatus?.statusName === 'Inactive', `status=${review?.data?.overallStatus?.statusName}`);

  report.print();
});
