/**
 * ================================================================================
 * TC-PERF-EVAL-11 — Verify A Fully-Filled Evaluation Can Be Saved, Completed, And Becomes Read-Only
 * Modul    : Performance - Manage Reviews - Evaluate
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-EVAL-11-Verify-Finalize-Review-Completed.spec.ts
 * Path     : tests/performance/evaluate/
 * ================================================================================
 *
 * TUJUAN:
 *   Alur positif evaluasi Admin/reviewer sampai selesai: isi rating (dalam rentang min/max tiap
 *   KPI) + komentar + Final Rating/Comments/Date of Completion -> Save (status "In Progress") ->
 *   Complete -> Ok (status "Completed"). Dialog konfirmasi menyatakan review jadi read-only &
 *   "cannot be undone", jadi diverifikasi juga: PUT evaluasi setelah Completed TIDAK diterima.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/evaluate/TC-PERF-EVAL-11-Verify-Finalize-Review-Completed.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createReview } from '../../../src/utils/createReview';

test('TC-PERF-EVAL-11: a fully filled evaluation saves (In Progress), completes (Completed) and becomes read-only', async ({
  page,
  addEmployeePage,
  reportToPage,
  performanceManageReviewsPage,
  performanceEvaluatePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PERF-EVAL-11', 'Finalize Review Completed', env.baseURL, page);

  report.step('Setup: review Activated utk employee ber-Job Title "QA Engineer"');
  const { reviewId } = await createReview(page, { addEmployeePage, reportToPage, performanceManageReviewsPage }, 'QaEvalDone');

  report.step('[API] Ambil daftar KPI review (utk rentang min/max tiap KPI)');
  const kpis = ((await (await page.request.get(`/web/index.php/api/v2/performance/reviews/${reviewId}/kpis`)).json())?.data ?? []) as Array<{ id: number; minRating: number; maxRating: number }>;
  report.check('Review punya >= 1 KPI', kpis.length > 0, `kpiCount=${kpis.length}`);

  report.step('Isi rating tiap KPI (nilai tengah rentangnya), semua komentar, dan finalisasi -> Save');
  await performanceEvaluatePage.goto(reviewId);
  const inputCount = await performanceEvaluatePage.ratingInputs.count();
  report.check('Jumlah input rating = jumlah KPI + 1 (Final Rating)', inputCount === kpis.length + 1, `inputs=${inputCount}, kpis=${kpis.length}`);
  for (const [i, kpi] of kpis.entries()) {
    await performanceEvaluatePage.kpiRatingInput(i).fill(String(Math.round((kpi.minRating + kpi.maxRating) / 2)));
  }
  await performanceEvaluatePage.fillAllGridComments('Kinerja sesuai target periode ini.');
  await performanceEvaluatePage.fillFinalization('75', 'Final: memenuhi ekspektasi.', '2026-07-07');
  const saved = await performanceEvaluatePage.save(reviewId);
  report.check('[API] PUT evaluation/supervisor 200', saved.supervisor?.status() === 200, `status=${saved.supervisor?.status()}`);
  const savedFinal = await saved.final?.json().catch(() => null);
  report.check('[API] PUT evaluation/final 200', saved.final?.status() === 200, `status=${saved.final?.status()}`);
  report.check('[API] Status setelah Save = "In Progress"', savedFinal?.data?.overallStatus?.statusName === 'In Progress', `status=${savedFinal?.data?.overallStatus?.statusName}`);

  report.step('Complete -> konfirmasi Ok');
  const completed = await performanceEvaluatePage.completeAndConfirm(reviewId);
  const completedBody = await completed?.json().catch(() => null);
  report.check('[API] PUT final (complete) 200', completed?.status() === 200, `status=${completed?.status()}`);
  report.check('[API] Status = "Completed"', completedBody?.data?.overallStatus?.statusName === 'Completed', `status=${completedBody?.data?.overallStatus?.statusName}`);
  report.check('[API] finalRating tersimpan 75', completedBody?.data?.finalRating === 75, `finalRating=${completedBody?.data?.finalRating}`);

  report.step('[API] Review Completed harus read-only: PUT evaluasi baru TIDAK boleh diterima');
  const firstKpi = kpis[0];
  if (firstKpi) {
    const putAfter = await page.request.put(`/web/index.php/api/v2/performance/reviews/${reviewId}/evaluation/supervisor`, {
      data: { ratings: [{ kpiId: firstKpi.id, rating: String(firstKpi.minRating), comment: 'ubah setelah Completed' }], generalComment: '' },
    });
    report.check('[API] PUT evaluation/supervisor setelah Completed TIDAK 200', putAfter.status() !== 200, `status=${putAfter.status()}`);
  }

  report.print();
});
