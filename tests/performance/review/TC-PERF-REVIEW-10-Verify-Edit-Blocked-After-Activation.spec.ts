/**
 * ================================================================================
 * TC-PERF-REVIEW-10 — Verify Editing (Employee/Supervisor/Dates) Is Blocked After Activation
 * Modul    : Performance - Manage Reviews
 * Kategori : Negative (-) / Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-10-Verify-Edit-Blocked-After-Activation.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * TUJUAN:
 *   TC-PERF-REVIEW-04 sudah memverifikasi tombol "Edit" hilang dari UI stlh Activate. TC ini
 *   melangkah lebih jauh: memverifikasi proteksi tsb BUKAN cuma kosmetik UI.
 *
 * TEMUAN (confirmed live 2026-11-15, lihat juga docs/Execution-Plan.md Fase 2.1):
 *   - Navigasi LANGSUNG ke saveReview/<id> pasca-Activate TETAP menyajikan form "Edit Review"
 *     (route-nya sendiri tidak diblokir), tapi GET /api/v2/performance/manage/reviews/<id> 404
 *     -> uncaught exception "fe" + field form kosong/tidak ter-prefill. Ini BG-356; revisit ini
 *     adalah jalur reproduksi PALING konsisten, jadi TC ini SENGAJA dibiarkan FAILED (console-
 *     error check) supaya BG-356 tetap Open di Bug-List -- pola sama dgn TC-CLAIM-ASSIGN-06/BG-333.
 *     Detail 404 + isi field direkam sbg finding.
 *   - Proteksi SESUNGGUHNYA (deterministik) ada di level API tulis: PUT ke endpoint tsb utk field
 *     inti (employee, supervisor, tanggal, activate) ditolak 422 "Invalid Parameter" dgn field-
 *     field itu PERSIS disebut di invalidParamKeys -- jadi walau form-nya kosong & "terlihat" bisa
 *     diisi ulang, submit-nya akan ditolak server. TIDAK ada risiko data. Check ini HARUS lolos;
 *     kalau TC ini gagal di check SELAIN console-error, itu regresi baru, bukan BG-356.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-10-Verify-Edit-Blocked-After-Activation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { setupReviewableEmployee } from '../../../src/utils/setupReviewableEmployee';

test('TC-PERF-REVIEW-10: direct navigation to the edit URL after Activation does not allow changing the review', async ({
  page,
  addEmployeePage,
  reportToPage,
  jobPage,
  performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  // R3: TIDAK di-whitelist. Revisit ke saveReview/<id> pasca-Activate mereproduksi BG-356 paling
  // konsisten -- TC ini SENGAJA jadi "TC yg tetap FAILED" yg menjaga BG-356 tetap Open di
  // Bug-List (pola sama dgn TC-CLAIM-ASSIGN-06 utk BG-333).
  const report = new TestReport('TC-PERF-REVIEW-10', 'Edit Blocked After Activation', env.baseURL, page);

  report.step('Setup: employee + supervisor + Job Title, buat + activate review');
  const { emp, supervisorSearchTerm } = await setupReviewableEmployee(page, addEmployeePage, reportToPage, jobPage, 'QaRevEditLock', 'QA Engineer');
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
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);

  report.step('Navigasi LANGSUNG ke URL edit (saveReview/<id>) setelah Activated');
  const got404 = await page
    .waitForResponse((r) => r.status() === 404 && r.url().includes(`/api/v2/performance/manage/reviews/${reviewId}`), { timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  await page.goto(`/web/index.php/performance/saveReview/${reviewId}`);
  const got404Nav = await page
    .waitForResponse((r) => r.status() === 404 && r.url().includes(`/api/v2/performance/manage/reviews/${reviewId}`), { timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_200);

  const employeeField = await page.getByPlaceholder('Type for hints...').nth(0).inputValue().catch(() => '');
  report.finding(
    '[Observasi, intermiten] GET self-data 404 + field Employee Name tidak ter-prefill saat buka ulang Edit Review utk review Activated',
    `got404=${got404 || got404Nav}, employeeFieldValue="${employeeField}"`,
  );

  report.step('Verify proteksi SESUNGGUHNYA: PUT field inti review Activated ditolak 422 "Invalid Parameter"');
  const putResp = await page.request.put(`/web/index.php/api/v2/performance/manage/reviews/${reviewId}`, {
    data: { empNumber: emp.empNumber, reviewPeriodStart: '2025-01-01', reviewPeriodEnd: '2025-06-30', dueDate: '2025-07-15' },
  });
  const putBody = await putResp.json().catch(() => null);
  report.check('[API] PUT field inti ditolak dgn 422', putResp.status() === 422, `status=${putResp.status()}`);
  report.check(
    '[API] invalidParamKeys menyebut field tanggal inti (reviewPeriodStart/reviewPeriodEnd)',
    Array.isArray(putBody?.error?.data?.invalidParamKeys) &&
      putBody.error.data.invalidParamKeys.includes('reviewPeriodStart') &&
      putBody.error.data.invalidParamKeys.includes('reviewPeriodEnd'),
    `invalidParamKeys=${JSON.stringify(putBody?.error?.data?.invalidParamKeys)}`,
  );

  report.print();
});
