/**
 * ================================================================================
 * TC-PERF-REVIEW-04 — Verify Activate Succeeds For An Employee With A Job Title+KPI
 * Modul    : Performance - Manage Reviews
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-04-Verify-Activate-Succeeds-With-Job-Title-KPI.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi counter-case dari TC-PERF-REVIEW-03: employee dgn Job Title "QA Engineer"
 *   (sudah punya KPI di Configure > KPIs, confirmed live) berhasil Activate (200,
 *   overallStatus -> "Activated"), dan baris di daftar BERGANTI aksi dari "Edit" (pencil) jadi
 *   "Evaluate" -- review yg sudah Activated tidak lagi bisa diedit tanggal/employee-nya.
 *
 * CATATAN: bug BG-356 (404 + uncaught exception saat membuka ULANG halaman edit review yg sudah
 *   Activated) direproduksi & didokumentasikan di TC-PERF-REVIEW-10, bukan di sini. TC ini TIDAK
 *   me-revisit halaman edit, jadi harus lolos bersih. (Koreksi 2026-11-15: console 404 yg dulu
 *   muncul di sini ternyata dari setup Job Title via halaman PIM -> GET job-titles/<id>/
 *   specification 404; setup kini lewat API, lihat setupReviewableEmployee().)
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-04-Verify-Activate-Succeeds-With-Job-Title-KPI.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { setupReviewableEmployee } from '../../../src/utils/setupReviewableEmployee';

test('TC-PERF-REVIEW-04: Activate succeeds for an employee with Job Title+KPI, Evaluate action appears', async ({
  page,
  addEmployeePage,
  reportToPage,
  performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-REVIEW-04', 'Activate Succeeds With Job Title+KPI', env.baseURL, page);

  report.step('Setup: employee + supervisor + Job Title "QA Engineer" (punya KPI)');
  const { emp, supervisorSearchTerm } = await setupReviewableEmployee(page, addEmployeePage, reportToPage, 'QaRevOk', 'QA Engineer');

  report.step('Buat review utk employee tsb');
  await performanceManageReviewsPage.gotoAdd();
  await performanceManageReviewsPage.selectEmployee(emp.employeeId, emp.lastName);
  await performanceManageReviewsPage.selectSupervisorReviewer(supervisorSearchTerm);
  await performanceManageReviewsPage.fillReviewPeriod('2026-01-01', '2026-06-30', '2026-07-15');
  const saveResp = await performanceManageReviewsPage.save();
  const saveBody = await saveResp?.json().catch(() => null);
  const reviewId = saveBody?.data?.id as number | undefined;
  report.check('[API] Create review berhasil, Job Title terbawa', saveBody?.data?.jobTitle?.name === 'QA Engineer', `jobTitle=${JSON.stringify(saveBody?.data?.jobTitle)}`);

  report.step('Activate review -> harapannya BERHASIL (200, overallStatus Activated)');
  if (reviewId) {
    await performanceManageReviewsPage.gotoEdit(reviewId);
    const actResp = await performanceManageReviewsPage.activate(reviewId);
    const actBody = await actResp?.json().catch(() => null);
    report.check('[API] Activate status === 200', actResp?.status() === 200, `status=${actResp?.status()}`);
    report.check('[API] overallStatus -> Activated', actBody?.data?.overallStatus?.statusName === 'Activated', `status=${actBody?.data?.overallStatus?.statusName}`);

    report.step('Verify: baris di daftar sekarang punya aksi "Evaluate", BUKAN lagi "Edit"');
    await page.waitForLoadState('networkidle').catch(() => {});
    await performanceManageReviewsPage.goto();
    await performanceManageReviewsPage.searchByEmployeeName(emp.employeeId, emp.lastName);
    const row = performanceManageReviewsPage.rowFor(emp.firstName);
    const rowText = await row.innerText().catch(() => '');
    report.check('Status di daftar = "Activated"', rowText.includes('Activated'), `rowText=${rowText}`);
    const evaluateVisible = await isVisibleWithWait(row.locator('button[title="Evaluate"]'), 5_000);
    const editVisible = await isVisibleWithWait(row.locator('button[title="Edit"]'), 2_000);
    report.check('Tombol "Evaluate" muncul', evaluateVisible);
    report.check('Tombol "Edit" TIDAK lagi ada (review sudah Activated)', !editVisible);
  } else {
    report.check('[SETUP GAGAL] reviewId tidak didapat, skip Activate', false);
  }

  report.print();
});
