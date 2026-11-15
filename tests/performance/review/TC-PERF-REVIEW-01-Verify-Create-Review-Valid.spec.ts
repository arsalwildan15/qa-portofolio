/**
 * ================================================================================
 * TC-PERF-REVIEW-01 — Verify Creating A Performance Review With Valid Data Succeeds
 * Modul    : Performance - Manage Reviews
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-01-Verify-Create-Review-Valid.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi pembuatan Performance Review baru (Employee Name, Supervisor Reviewer,
 *   Review Period Start/End Date, Due Date) dgn data valid berhasil tersimpan dgn status
 *   awal "Inactive". Prasyarat yg dikonfirmasi live (lihat setupReviewableEmployee()):
 *   employee HARUS sudah punya supervisor (PIM > Report-to) sebelum Supervisor Reviewer
 *   autocomplete punya opsi apapun.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-01-Verify-Create-Review-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { setupReviewableEmployee } from '../../../src/utils/setupReviewableEmployee';

test('TC-PERF-REVIEW-01: creating a review with valid data succeeds, initial status is Inactive', async ({
  page,
  addEmployeePage,
  reportToPage,
  jobPage,
  performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-REVIEW-01', 'Create Review Valid', env.baseURL, page);

  report.step('Setup: employee baru + supervisor ter-link (prasyarat Supervisor Reviewer)');
  const { emp, supervisorSearchTerm } = await setupReviewableEmployee(page, addEmployeePage, reportToPage, jobPage, 'QaRevValid');

  report.step('Buka Add Review, isi Employee Name + Supervisor Reviewer + tanggal, Save');
  await performanceManageReviewsPage.gotoAdd();
  await performanceManageReviewsPage.selectEmployee(emp.employeeId);
  const supOptions = await performanceManageReviewsPage.selectSupervisorReviewer(supervisorSearchTerm);
  report.check('Supervisor Reviewer punya opsi (employee sudah ter-link supervisor)', supOptions[0] !== 'No Records Found', `options=${JSON.stringify(supOptions)}`);
  await performanceManageReviewsPage.fillReviewPeriod('2026-01-01', '2026-06-30', '2026-07-15');
  const resp = await performanceManageReviewsPage.save();
  const body = await resp?.json().catch(() => null);

  report.check('[API] POST manage/reviews status === 200', resp?.status() === 200, `status=${resp?.status()}`);
  report.check('[API] overallStatus awal = Inactive', body?.data?.overallStatus?.statusName === 'Inactive', `status=${body?.data?.overallStatus?.statusName}`);
  report.check('[API] reviewPeriodStart tersimpan benar', body?.data?.reviewPeriodStart === '2026-01-01', `value=${body?.data?.reviewPeriodStart}`);
  report.check('[API] dueDate tersimpan benar', body?.data?.dueDate === '2026-07-15', `value=${body?.data?.dueDate}`);

  report.step('Verify: review baru muncul di daftar Manage Reviews');
  // employeeId (unik), BUKAN firstName -- lihat catatan di TC-PERF-REVIEW-04.
  await performanceManageReviewsPage.searchByEmployeeName(emp.employeeId);
  const found = await performanceManageReviewsPage.rowFor(emp.firstName).isVisible({ timeout: 10_000 }).catch(() => false);
  report.check('Review baru ditemukan di daftar', found, `employee=${emp.firstName}`);

  report.print();
});
