/**
 * ================================================================================
 * TC-PERF-REVIEW-05 — Verify The Evaluation Page Lists Exactly The KPIs Of The Employee's Job Title
 * Modul    : Performance - Manage Reviews - Evaluate
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-05-Verify-Evaluation-KPIs-Scoped-To-Job-Title.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi halaman evaluasi (reviewEvaluateByAdmin/<id>) menampilkan KPI yg BENAR --
 *   persis himpunan KPI yg terdaftar di Configure > KPIs utk Job Title employee tsb, bukan
 *   KPI global/acak. Dibandingkan via API: GET /api/v2/performance/kpis (difilter Job Title)
 *   vs GET /api/v2/performance/reviews/<id>/kpis.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-05-Verify-Evaluation-KPIs-Scoped-To-Job-Title.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { setupReviewableEmployee } from '../../../src/utils/setupReviewableEmployee';

test('TC-PERF-REVIEW-05: evaluation page KPIs exactly match the employee Job Title\'s configured KPIs', async ({
  page,
  addEmployeePage,
  reportToPage,
  jobPage,
  performanceManageReviewsPage,
  performanceKpiPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-REVIEW-05', 'Evaluation KPIs Scoped To Job Title', env.baseURL, page);
  const jobTitleName = 'QA Engineer';

  report.step('Setup: employee + supervisor + Job Title "QA Engineer", buat + activate review');
  const { emp, supervisorSearchTerm } = await setupReviewableEmployee(page, addEmployeePage, reportToPage, jobPage, 'QaRevKpiScope', jobTitleName);
  await performanceManageReviewsPage.gotoAdd();
  await performanceManageReviewsPage.selectEmployee(emp.employeeId);
  await performanceManageReviewsPage.selectSupervisorReviewer(supervisorSearchTerm);
  await performanceManageReviewsPage.fillReviewPeriod('2026-01-01', '2026-06-30', '2026-07-15');
  const saveResp = await performanceManageReviewsPage.save();
  const reviewId = (await saveResp?.json().catch(() => null))?.data?.id as number | undefined;
  if (!reviewId) {
    report.check('[SETUP GAGAL] reviewId tidak didapat', false);
    report.print();
    return;
  }
  await performanceManageReviewsPage.gotoEdit(reviewId);
  await performanceManageReviewsPage.activate(reviewId);
  report.finding('BG-356', 'Kalau console-error check di akhir gagal, itu kemungkinan bug self-refresh 404 pasca-Activate yg sudah tercatat (lihat TC-PERF-REVIEW-04) -- SAH, bukan regresi script.');
  await page.waitForLoadState('networkidle').catch(() => {});

  report.step('[UI] Ambil daftar KPI resmi utk Job Title "QA Engineer" dari Configure > KPIs (filter by Job Title)');
  await performanceKpiPage.goto();
  await performanceKpiPage.selectJobTitle(jobTitleName);
  await performanceKpiPage.searchButton.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  const expectedRows = await performanceKpiPage.tableRows.allInnerTexts();
  const expectedKpiNames = expectedRows.map((r) => r.split('\n')[0] ?? '').filter(Boolean).sort();
  report.finding('KPI resmi utk Job Title QA Engineer (via Configure > KPIs)', JSON.stringify(expectedKpiNames));

  report.step('[API] Ambil daftar KPI yg ditampilkan di halaman evaluasi review ini');
  const reviewKpisResp = await page.request.get(`/web/index.php/api/v2/performance/reviews/${reviewId}/kpis`);
  const reviewKpisBody = await reviewKpisResp.json().catch(() => null);
  const actualKpiNames = ((reviewKpisBody?.data ?? []) as Array<{ title: string }>).map((k) => k.title).sort();
  report.finding('KPI yg muncul di halaman evaluasi', JSON.stringify(actualKpiNames));

  report.check(
    'KPI di halaman evaluasi PERSIS SAMA dgn KPI resmi Job Title tsb (tidak lebih, tidak kurang)',
    JSON.stringify(expectedKpiNames) === JSON.stringify(actualKpiNames),
    `expected=${JSON.stringify(expectedKpiNames)}, actual=${JSON.stringify(actualKpiNames)}`,
  );
  report.check('Setidaknya 1 KPI muncul (Job Title ini memang punya KPI)', actualKpiNames.length > 0);

  report.print();
});
