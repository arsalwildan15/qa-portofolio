/**
 * ================================================================================
 * TC-PERF-REVIEW-03 — Verify Activate Is Blocked For An Employee Without A Job Title+KPI
 * Modul    : Performance - Manage Reviews
 * Kategori : Negative (-) / Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-03-Verify-Activate-Blocked-Without-Job-Title-KPI.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi review utk employee TANPA Job Title (atau Job Title tsb tidak punya KPI
 *   apapun di Configure > KPIs) GAGAL di-Activate dgn 400 dan pesan error yg jelas dari API,
 *   serta overallStatus TETAP "Inactive" (tidak berubah). Ini adalah gap coverage yg
 *   ditemukan via eksplorasi live Fase 2 (sebelumnya cuma hipotesis di laporan audit).
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-03-Verify-Activate-Blocked-Without-Job-Title-KPI.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { setupReviewableEmployee } from '../../../src/utils/setupReviewableEmployee';

test('TC-PERF-REVIEW-03: Activate fails with 400 for an employee with no Job Title+KPI, status stays Inactive', async ({
  page,
  addEmployeePage,
  reportToPage,
  performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport(
    'TC-PERF-REVIEW-03',
    'Activate Blocked Without Job Title+KPI',
    env.baseURL,
    page,
    [/Failed to load resource.*400/],
  );

  report.step('Setup: employee + supervisor, TANPA Job Title (default kosong dari createTestEmployee)');
  const { emp, supervisorSearchTerm } = await setupReviewableEmployee(page, addEmployeePage, reportToPage, 'QaRevNoKpi');

  report.step('Buat review utk employee tsb (harus bisa, Create tidak mensyaratkan Job Title)');
  await performanceManageReviewsPage.gotoAdd();
  await performanceManageReviewsPage.selectEmployee(emp.employeeId, emp.lastName);
  await performanceManageReviewsPage.selectSupervisorReviewer(supervisorSearchTerm);
  await performanceManageReviewsPage.fillReviewPeriod('2026-01-01', '2026-06-30', '2026-07-15');
  const saveResp = await performanceManageReviewsPage.save();
  const saveBody = await saveResp?.json().catch(() => null);
  const reviewId = saveBody?.data?.id as number | undefined;
  report.check('[API] Create review berhasil walau tanpa Job Title', saveResp?.status() === 200 && !!reviewId, `status=${saveResp?.status()}, reviewId=${reviewId}`);
  report.check('[API] jobTitle memang null (prasyarat kasus ini)', saveBody?.data?.jobTitle?.id === null, `jobTitle=${JSON.stringify(saveBody?.data?.jobTitle)}`);

  report.step('Coba Activate review tsb -> harapannya DITOLAK API dgn 400');
  if (reviewId) {
    await performanceManageReviewsPage.gotoEdit(reviewId);
    const actResp = await performanceManageReviewsPage.activate(reviewId);
    const actBody = await actResp?.json().catch(() => null);
    report.check('[API] Activate ditolak dgn status 400', actResp?.status() === 400, `status=${actResp?.status()}`);
    report.check(
      '[API] Pesan error menjelaskan sebab (Job Title tanpa KPI)',
      /Job Title with KPI/i.test(actBody?.error?.message ?? ''),
      `message=${actBody?.error?.message}`,
    );

    report.step('Verify: overallStatus review TETAP Inactive (tidak berubah jadi Activated)');
    await performanceManageReviewsPage.goto();
    // employeeId (unik), BUKAN firstName -- lihat catatan di TC-PERF-REVIEW-04.
    await performanceManageReviewsPage.searchByEmployeeName(emp.employeeId, emp.lastName);
    const rowText = await performanceManageReviewsPage.rowFor(emp.firstName).innerText().catch(() => '');
    report.check('Status di daftar masih "Inactive"', rowText.includes('Inactive'), `rowText=${rowText}`);
  } else {
    report.check('[SETUP GAGAL] reviewId tidak didapat, skip Activate', false);
  }

  report.print();
});
