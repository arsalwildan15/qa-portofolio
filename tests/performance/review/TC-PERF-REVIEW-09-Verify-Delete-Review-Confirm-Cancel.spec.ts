/**
 * ================================================================================
 * TC-PERF-REVIEW-09 — Verify Delete Review Confirmation Dialog (Cancel Keeps It, Confirm Deletes It)
 * Modul    : Performance - Manage Reviews
 * Kategori : Positive (+) 1.1-D | API (A) 6.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-09-Verify-Delete-Review-Confirm-Cancel.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi tombol trash pd baris review memunculkan modal konfirmasi ("Are you Sure?"),
 *   "No, Cancel" membatalkan (review tetap ada), dan "Yes, Delete" benar2 menghapusnya dari
 *   daftar.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-09-Verify-Delete-Review-Confirm-Cancel.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';
import { setupReviewableEmployee } from '../../../src/utils/setupReviewableEmployee';

test('TC-PERF-REVIEW-09: delete confirmation dialog — Cancel keeps the review, Confirm deletes it', async ({
  page,
  addEmployeePage,
  reportToPage,
  performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-REVIEW-09', 'Delete Review Confirm Cancel', env.baseURL, page);

  report.step('Setup: employee + supervisor, buat review (status Inactive, masih punya trash+edit)');
  const { emp, supervisorSearchTerm } = await setupReviewableEmployee(page, addEmployeePage, reportToPage, 'QaRevDelete');
  await performanceManageReviewsPage.gotoAdd();
  await performanceManageReviewsPage.selectEmployee(emp.employeeId, emp.lastName);
  await performanceManageReviewsPage.selectSupervisorReviewer(supervisorSearchTerm);
  await performanceManageReviewsPage.fillReviewPeriod('2026-01-01', '2026-06-30', '2026-07-15');
  await performanceManageReviewsPage.save();
  await performanceManageReviewsPage.goto();
  // employeeId (unik), BUKAN firstName -- lihat catatan di TC-PERF-REVIEW-04.
  await performanceManageReviewsPage.searchByEmployeeName(emp.employeeId, emp.lastName);

  report.step('Klik trash -> modal muncul -> klik "No, Cancel" -> review TETAP ada');
  const row = performanceManageReviewsPage.rowFor(emp.firstName);
  await performanceManageReviewsPage.clickDelete(row);
  const dialog = performanceManageReviewsPage.confirmDeleteDialog();
  const dialogVisible = await isVisibleWithWait(dialog, 5_000);
  report.check('Modal konfirmasi "Are you Sure?" muncul', dialogVisible);
  await dialog.getByRole('button', { name: 'No, Cancel' }).click();
  await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(800);
  const stillThere = await isVisibleWithWait(performanceManageReviewsPage.rowFor(emp.firstName), 5_000);
  report.check('Setelah "No, Cancel", review masih ada di daftar', stillThere);

  report.step('Klik trash lagi -> klik "Yes, Delete" -> review HILANG dari daftar');
  // Re-fetch the row fresh (not reusing the pre-cancel `row` reference) -- the list can
  // re-render between the two delete attempts, confirmed live: reusing the stale reference
  // causes a 90s "element was detached from the DOM, retrying" hang.
  await performanceManageReviewsPage.clickDelete(performanceManageReviewsPage.rowFor(emp.firstName));
  const delResp = await performanceManageReviewsPage.confirmDelete();
  report.check('[API] DELETE review berhasil (200)', delResp?.status() === 200, `status=${delResp?.status()}`);
  const gone = await isHiddenWithWait(performanceManageReviewsPage.rowFor(emp.firstName), 10_000);
  report.check('Setelah "Yes, Delete", review TIDAK lagi ada di daftar', gone);

  report.print();
});
