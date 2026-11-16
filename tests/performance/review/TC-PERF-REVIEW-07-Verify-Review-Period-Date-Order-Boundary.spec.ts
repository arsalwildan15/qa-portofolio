/**
 * ================================================================================
 * TC-PERF-REVIEW-07 — Verify Review Period Date-Order Boundary On Add Review
 * Modul    : Performance - Manage Reviews
 * Kategori : Boundary (B) 3.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-07-Verify-Review-Period-Date-Order-Boundary.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Review Period End Date SEBELUM Start Date ditolak CLIENT-SIDE dgn 2 pesan
 *   error jelas ("should be before period end date" / "should be after period start date"),
 *   TIDAK ada POST terkirim. Confirmed live 2026-11-15.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-07-Verify-Review-Period-Date-Order-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { setupReviewableEmployee } from '../../../src/utils/setupReviewableEmployee';

test('TC-PERF-REVIEW-07: Review Period End Date before Start Date is rejected client-side', async ({
  page,
  addEmployeePage,
  reportToPage,
  performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-REVIEW-07', 'Review Period Date-Order Boundary', env.baseURL, page);

  report.step('Setup: employee + supervisor');
  const { emp, supervisorSearchTerm } = await setupReviewableEmployee(page, addEmployeePage, reportToPage, 'QaRevDate');

  report.step('Buka Add Review, isi End Date SEBELUM Start Date, coba Save');
  await performanceManageReviewsPage.gotoAdd();
  await performanceManageReviewsPage.selectEmployee(emp.employeeId, emp.lastName);
  await performanceManageReviewsPage.selectSupervisorReviewer(supervisorSearchTerm);
  await performanceManageReviewsPage.fillReviewPeriod('2026-06-30', '2026-01-01', '2026-07-15');
  const resp = await performanceManageReviewsPage.save();
  report.check('TIDAK ada POST terkirim (diblokir client-side)', resp === null, `status=${resp?.status()}`);

  const bodyText = await page.locator('body').innerText();
  report.check('Pesan error "start date should be before period end date" muncul', /start date should be before period end date/i.test(bodyText));
  report.check('Pesan error "end date should be after period start date" muncul', /end date should be after period start date/i.test(bodyText));

  report.print();
});
