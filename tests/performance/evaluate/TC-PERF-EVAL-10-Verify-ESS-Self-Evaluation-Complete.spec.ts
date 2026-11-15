/**
 * ================================================================================
 * TC-PERF-EVAL-10 — Verify An Employee Can Complete Their Self-Evaluation And It Becomes Read-Only
 * Modul    : Performance - My Reviews (ESS self-evaluation)
 * Kategori : Positive (+) / Cross-Role / State Transition
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-EVAL-10-Verify-ESS-Self-Evaluation-Complete.spec.ts
 * Path     : tests/performance/evaluate/
 * ================================================================================
 *
 * TUJUAN:
 *   Karyawan (ESS) membuka review Activated miliknya dari My Reviews, mengisi rating per KPI +
 *   General Comment, lalu Complete. Confirmed live: PUT reviews/<id>/evaluation/employee
 *   {complete:true} 200 -> selfReviewStatus "Completed", overall "In Progress"; Admin (reviewer)
 *   bisa membaca rating & komentar karyawan; form ESS jadi read-only dan PUT berikutnya 403.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/evaluate/TC-PERF-EVAL-10-Verify-ESS-Self-Evaluation-Complete.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { PerformanceSelfEvaluatePage } from '../../../src/pages';
import { createEssReview } from '../../../src/utils/createEssReview';

test('TC-PERF-EVAL-10: an employee completes their self-evaluation and it becomes read-only', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PERF-EVAL-10', 'ESS Self-Evaluation Complete', env.baseURL, page);
  const generalComment = `Self review ${Date.now()}`;

  report.step('Setup: ESS reviewee (atasan = Admin, Job Title QA Engineer) + review Activated (via API)');
  const { essPage, close, reviewId } = await createEssReview(page, browser, addEmployeePage, 'QaPerfSelf');
  const kpis = ((await (await essPage.request.get(`/web/index.php/api/v2/performance/reviews/${reviewId}/kpis`)).json().catch(() => null))?.data ?? []) as Array<{ id: number; minRating: number; maxRating: number }>;
  const values = kpis.map((k) => String(Math.min(Math.max(70, k.minRating), k.maxRating)));

  report.step('[ESS UI] My Reviews -> buka review -> isi rating tiap KPI + General Comment -> Complete');
  const selfEval = new PerformanceSelfEvaluatePage(essPage);
  await selfEval.openFromMyReviews();
  report.check('Jumlah input rating = jumlah KPI review', (await selfEval.ratingInputs.count()) === kpis.length, `inputs=${await selfEval.ratingInputs.count()}, kpis=${kpis.length}`);
  await selfEval.fillRatings(values);
  await selfEval.generalCommentTextarea.fill(generalComment);
  const put = await selfEval.completeAndConfirm(reviewId);
  const body = put ? JSON.parse(put.request().postData() ?? '{}') : {};
  report.check('[API] PUT evaluation/employee 200 dgn complete:true', put?.status() === 200 && body.complete === true, `status=${put?.status()}, complete=${body.complete}`);
  const sent = (body.ratings ?? []) as Array<{ rating: string | null }>;
  report.check('[API] Body PUT membawa rating yg diisi (bukan null)', sent.length === kpis.length && sent.every((r) => r.rating !== null), `ratings=${JSON.stringify(sent.map((r) => r.rating))}`);

  report.step('[ESS API] Status review setelah Complete');
  const mine = ((await (await essPage.request.get('/web/index.php/api/v2/performance/reviews?limit=50&offset=0')).json().catch(() => null))?.data ?? []) as Array<{ id: number; selfReviewStatus: string; overallStatus: { statusName: string } }>;
  const row = mine.find((r) => r.id === reviewId);
  report.check('selfReviewStatus = Completed', row?.selfReviewStatus === 'Completed', `self=${row?.selfReviewStatus}`);
  report.check('Status keseluruhan = In Progress (menunggu evaluasi atasan)', row?.overallStatus?.statusName === 'In Progress', `overall=${row?.overallStatus?.statusName}`);

  report.step('[Admin API] Reviewer dapat membaca evaluasi karyawan');
  const emp = await (await page.request.get(`/web/index.php/api/v2/performance/reviews/${reviewId}/evaluation/employee`)).json().catch(() => null);
  const ratings = (emp?.data ?? []) as Array<{ rating: string; kpi: { id: number } }>;
  const allMatch = kpis.every((k, i) => Number(ratings.find((r) => r.kpi.id === k.id)?.rating) === Number(values[i]));
  report.check('Rating tiap KPI tersimpan sesuai input', ratings.length === kpis.length && allMatch, `ratings=${JSON.stringify(ratings.map((r) => [r.kpi.id, r.rating]))}`);
  report.check('General Comment tersimpan', emp?.meta?.generalComment === generalComment, `generalComment=${emp?.meta?.generalComment}`);

  report.step('[ESS] Form read-only & perubahan via API ditolak');
  await selfEval.goto(reviewId);
  const enabled = await essPage.locator('.oxd-layout-context input.oxd-input:not([placeholder]):not([disabled])').count();
  report.check('Semua input rating disabled', enabled === 0, `enabled=${enabled}`);
  report.check('Tombol Save & Complete tidak ada lagi', (await selfEval.saveButton.count()) === 0 && (await selfEval.completeButton.count()) === 0);
  const again = await essPage.request.put(`/web/index.php/api/v2/performance/reviews/${reviewId}/evaluation/employee`, {
    data: { complete: false, ratings: kpis.map((k) => ({ kpiId: k.id, rating: k.minRating, comment: 'changed' })), generalComment: 'changed' },
  });
  report.check('[API] PUT evaluation/employee setelah Complete -> 403', again.status() === 403, `status=${again.status()}`);

  await close();
  report.print();
});
