/**
 * ================================================================================
 * TC-PERF-REVIEW-06 — Verify "Complete" On The Evaluation Page Requires Finalization Fields
 * Modul    : Performance - Manage Reviews - Evaluate
 * Kategori : Negative (-) / Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-06-Verify-Complete-Required-Field-Validation.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik "Complete" pd halaman evaluasi TANPA mengisi Review Finalization
 *   (Date of Completion, Final Rating, Final Comments) ditolak CLIENT-SIDE dgn 3 pesan
 *   "Required" (satu per field), TIDAK ada request API terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-06-Verify-Complete-Required-Field-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { setupReviewableEmployee } from '../../../src/utils/setupReviewableEmployee';

test('TC-PERF-REVIEW-06: Complete without Review Finalization fields is blocked client-side with 3 Required errors', async ({
  page,
  addEmployeePage,
  reportToPage,
  jobPage,
  performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-REVIEW-06', 'Complete Required Field Validation', env.baseURL, page);

  report.step('Setup: employee + supervisor + Job Title "QA Engineer", buat + activate review');
  const { emp, supervisorSearchTerm } = await setupReviewableEmployee(page, addEmployeePage, reportToPage, jobPage, 'QaRevComplete', 'QA Engineer');
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

  report.step('Buka halaman evaluasi, klik Complete TANPA mengisi apapun di Review Finalization');
  await page.goto(`/web/index.php/performance/reviewEvaluateByAdmin/${reviewId}`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_200);

  let apiCalled = false;
  page.on('request', (r) => {
    if (r.url().includes('/api/v2/performance/') && r.method() !== 'GET') apiCalled = true;
  });
  await page.getByRole('button', { name: 'Complete' }).click();
  await page.waitForTimeout(1_000);

  const requiredErrors = await page.locator('.oxd-input-group .oxd-text--span, .oxd-text--toast-message').filter({ hasText: 'Required' }).allInnerTexts();
  report.check('TIDAK ada request API non-GET terkirim (diblokir client-side)', !apiCalled);
  report.check('Ada 3 pesan "Required" (Date of Completion, Final Rating, Final Comments)', requiredErrors.length === 3, `count=${requiredErrors.length}`);

  report.print();
});
