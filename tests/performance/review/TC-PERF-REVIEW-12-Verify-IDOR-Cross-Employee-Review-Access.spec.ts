/**
 * ================================================================================
 * TC-PERF-REVIEW-12 — Verify An ESS Employee Cannot Access Another Employee's Review Data (IDOR)
 * Modul    : Performance - Manage Reviews - Access Control
 * Kategori : Security (S) / Access Control
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-12-Verify-IDOR-Cross-Employee-Review-Access.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi akun ESS (Employee Self Service) TIDAK bisa membaca data review milik
 *   employee LAIN via endpoint yg sama dipakai halaman evaluasi Admin
 *   (GET /api/v2/performance/reviews/<id>/kpis dan /evaluation/employee), walau tahu reviewId-nya
 *   (sequential, mudah ditebak). Menggunakan infrastruktur Fase 1 (createEssAccount, loginAs)
 *   utk benar2 menguji dari sesi ESS terpisah, bukan asumsi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-12-Verify-IDOR-Cross-Employee-Review-Access.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { setupReviewableEmployee } from '../../../src/utils/setupReviewableEmployee';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';

test('TC-PERF-REVIEW-12: an ESS account cannot read another employee\'s review KPI/evaluation data', async ({
  page,
  browser,
  addEmployeePage,
  reportToPage,
  jobPage,
  performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PERF-REVIEW-12', 'IDOR Cross-Employee Review Access', env.baseURL, page);

  report.step('Setup: employee target (B) dgn review Activated (punya KPI utk dibaca)');
  const { emp: empB, supervisorSearchTerm } = await setupReviewableEmployee(page, addEmployeePage, reportToPage, jobPage, 'QaRevIdorB', 'QA Engineer');
  await performanceManageReviewsPage.gotoAdd();
  await performanceManageReviewsPage.selectEmployee(empB.employeeId);
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
  report.finding('BG-356', 'Kalau console-error check di akhir gagal, itu kemungkinan bug self-refresh 404 pasca-Activate yg sudah tercatat (lihat TC-PERF-REVIEW-04) -- SAH, bukan regresi script. Check IDOR di bawah tetap independen dari itu.');
  await page.waitForTimeout(1_000);

  report.step('Buat akun ESS LAIN (A, tidak terkait sama sekali dgn review B), login di sesi terpisah');
  const essA = await createEssAccount(page, addEmployeePage, 'QaRevIdorA');
  const { page: essPage, close } = await loginAs(browser, essA.username, essA.password);

  report.step('[API, sbg ESS A] Coba baca KPI + evaluasi review milik B');
  const kpisResp = await essPage.request.get(`/web/index.php/api/v2/performance/reviews/${reviewId}/kpis`);
  report.check('[API] GET kpis review orang lain TIDAK 200 (bukan 403/401/404)', kpisResp.status() !== 200, `status=${kpisResp.status()}`);

  const evalResp = await essPage.request.get(`/web/index.php/api/v2/performance/reviews/${reviewId}/evaluation/employee`);
  report.check('[API] GET evaluation/employee review orang lain TIDAK 200', evalResp.status() !== 200, `status=${evalResp.status()}`);

  const manageResp = await essPage.request.get(`/web/index.php/api/v2/performance/manage/reviews/${reviewId}`);
  report.check('[API] GET manage/reviews/<id> (endpoint khusus Admin) TIDAK 200 utk akun ESS', manageResp.status() !== 200, `status=${manageResp.status()}`);

  await close();
  report.print();
});
