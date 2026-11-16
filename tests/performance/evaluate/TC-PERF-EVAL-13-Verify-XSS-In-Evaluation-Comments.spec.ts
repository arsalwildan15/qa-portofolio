/**
 * ================================================================================
 * TC-PERF-EVAL-13 — Verify XSS Payloads In Evaluation Comments Are Stored As Text, Not Executed
 * Modul    : Performance - Manage Reviews - Evaluate
 * Kategori : Security (S) 5.1-XSS-Stored -- Stored XSS
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-EVAL-13-Verify-XSS-In-Evaluation-Comments.spec.ts
 * Path     : tests/performance/evaluate/
 * ================================================================================
 *
 * TUJUAN:
 *   Payload `<img src=x onerror=...>` di SEMUA komentar KPI, General Comment, dan Final Comments
 *   disimpan (Save) lalu halaman di-reload: payload TIDAK boleh tereksekusi (window flag tetap
 *   kosong), TIDAK ada elemen <img src="x"> yg tersuntik ke DOM, dan teksnya kembali utuh sbg
 *   teks biasa di textarea.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/evaluate/TC-PERF-EVAL-13-Verify-XSS-In-Evaluation-Comments.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createReview } from '../../../src/utils/createReview';

const PAYLOAD = '<img src=x onerror="window.__perfXss=1">';

test('TC-PERF-EVAL-13: XSS in evaluation comments is stored as plain text and never executed', async ({
  page,
  addEmployeePage,
  reportToPage,
  performanceManageReviewsPage,
  performanceEvaluatePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PERF-EVAL-13', 'XSS In Evaluation Comments', env.baseURL, page);

  report.step('Setup: review Activated');
  const { reviewId } = await createReview(page, { addEmployeePage, reportToPage, performanceManageReviewsPage }, 'QaEvalXss');
  const kpiCount = ((await (await page.request.get(`/web/index.php/api/v2/performance/reviews/${reviewId}/kpis`)).json())?.data ?? []).length as number;

  report.step('Isi rating valid + payload XSS di semua komentar & Final Comments -> Save');
  await performanceEvaluatePage.goto(reviewId);
  await performanceEvaluatePage.fillAllKpiRatings(kpiCount, '50');
  await performanceEvaluatePage.fillAllGridComments(PAYLOAD);
  await performanceEvaluatePage.fillFinalization('50', PAYLOAD, '2026-07-07');
  const saved = await performanceEvaluatePage.save(reviewId);
  report.check('[API] Save (supervisor + final) 200', saved.supervisor?.status() === 200 && saved.final?.status() === 200, `supervisor=${saved.supervisor?.status()}, final=${saved.final?.status()}`);

  report.step('Reload halaman evaluasi -> cek payload tidak tereksekusi');
  await performanceEvaluatePage.goto(reviewId);
  const executed = await page.evaluate(() => (window as unknown as { __perfXss?: number }).__perfXss);
  report.check('Payload TIDAK tereksekusi (window flag kosong)', executed === undefined, `flag=${executed}`);
  const injected = await page.locator('img[src="x"]').count();
  report.check('Tidak ada <img src="x"> tersuntik ke DOM', injected === 0, `count=${injected}`);
  const firstComment = await performanceEvaluatePage.gridCommentTextareas.first().inputValue();
  report.check('Komentar kembali utuh sbg teks biasa', firstComment === PAYLOAD, `value=${firstComment}`);
  const finalComment = await performanceEvaluatePage.finalCommentTextarea.inputValue();
  report.check('Final Comments kembali utuh sbg teks biasa', finalComment === PAYLOAD, `value=${finalComment}`);

  report.print();
});
