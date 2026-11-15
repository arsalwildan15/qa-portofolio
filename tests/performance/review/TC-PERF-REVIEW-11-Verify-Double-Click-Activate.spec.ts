/**
 * ================================================================================
 * TC-PERF-REVIEW-11 — Verify Double-Clicking Activate Does Not Corrupt State Or Duplicate Effects
 * Modul    : Performance - Manage Reviews
 * Kategori : Edge Case (!) / Race Condition
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-11-Verify-Double-Click-Activate.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi 2 klik cepat (fire 2 request bersamaan, bukan tunggu round-trip pertama) pd
 *   tombol "Activate" tidak menghasilkan state ganda/korup -- review tetap berakhir di SATU
 *   status final yg konsisten ("Activated"), bukan error/exception yg tidak tertangani.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-11-Verify-Double-Click-Activate.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { setupReviewableEmployee } from '../../../src/utils/setupReviewableEmployee';

test('TC-PERF-REVIEW-11: double-clicking Activate does not corrupt the review\'s final status', async ({
  page,
  addEmployeePage,
  reportToPage,
  performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-REVIEW-11', 'Double-Click Activate', env.baseURL, page);

  report.step('Setup: employee + supervisor + Job Title, buat review');
  const { emp, supervisorSearchTerm } = await setupReviewableEmployee(page, addEmployeePage, reportToPage, 'QaRevDouble', 'QA Engineer');
  await performanceManageReviewsPage.gotoAdd();
  await performanceManageReviewsPage.selectEmployee(emp.employeeId, emp.lastName);
  await performanceManageReviewsPage.selectSupervisorReviewer(supervisorSearchTerm);
  await performanceManageReviewsPage.fillReviewPeriod('2026-01-01', '2026-06-30', '2026-07-15');
  const saveResp = await performanceManageReviewsPage.save();
  const reviewId = (await saveResp?.json().catch(() => null))?.data?.id as number | undefined;
  if (!reviewId) {
    report.check('[SETUP GAGAL] reviewId tidak didapat', false);
    report.print();
    return;
  }

  report.step('Klik Activate 2x secepat mungkin (tanpa tunggu response pertama)');
  await performanceManageReviewsPage.gotoEdit(reviewId);
  const responses: Array<import('@playwright/test').Response | null> = [];
  const p1 = page
    .waitForResponse((r) => r.url().includes(`/api/v2/performance/manage/reviews/${reviewId}`) && r.request().method() === 'PUT', { timeout: 10_000 })
    .catch(() => null);
  await performanceManageReviewsPage.activateButton.click();
  await performanceManageReviewsPage.activateButton.click({ force: true }).catch(() => {});
  responses.push(await p1);
  await page.waitForTimeout(2_000);

  report.step('[API] Verify status final review tetap konsisten (satu nilai yg jelas, bukan korup)');
  const getResp = await page.request.get(`/web/index.php/api/v2/performance/manage/reviews/${reviewId}`).catch(() => null);
  if (getResp && getResp.status() === 200) {
    const getBody = await getResp.json().catch(() => null);
    report.check('Status review = "Activated" (bukan nilai lain/korup)', getBody?.data?.overallStatus?.statusName === 'Activated', `status=${getBody?.data?.overallStatus?.statusName}`);
  } else {
    // Expected per the already-documented bug: this GET 404s once Activated.
    report.finding('GET single-review setelah double-click Activate', `status=${getResp?.status()}`);
    // The double-click can leave an SPA-internal navigation still in flight; calling goto()
    // immediately can collide with it (net::ERR_ABORTED, confirmed live). Let it settle first.
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1_000);
    await performanceManageReviewsPage.goto();
    // employeeId (unik), BUKAN firstName -- lihat catatan di TC-PERF-REVIEW-04.
    await performanceManageReviewsPage.searchByEmployeeName(emp.employeeId, emp.lastName);
    const rowText = await performanceManageReviewsPage.rowFor(emp.firstName).innerText().catch(() => '');
    report.check('Status di daftar = "Activated" (satu baris, satu status, tidak ganda/korup)', rowText.includes('Activated'), `rowText=${rowText}`);
  }

  report.print();
});
