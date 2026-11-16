/**
 * ================================================================================
 * TC-PERF-REVIEW-02 — Verify Supervisor Reviewer Is Scoped To The Employee's Actual Supervisor
 * Modul    : Performance - Manage Reviews
 * Kategori : Positive (+) 1.4 | Negative (-) 2.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-02-Verify-Supervisor-Required-Before-Create.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi utk employee yg BELUM punya supervisor link (PIM > Report-to), field
 *   "Supervisor Reviewer" pd Add Review menunjukkan "No Records Found" utk SEMUA pencarian
 *   (bukan daftar employee umum) dan Save diblokir CLIENT-SIDE ("Invalid"), TIDAK ada POST
 *   terkirim. Ini confirmed live 2026-11-15: field ini secara sengaja di-scope ke relasi
 *   supervisor yg sudah ada, bukan pencarian employee bebas -- jadi review TIDAK BISA dibuat
 *   utk employee tanpa supervisor sama sekali.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-02-Verify-Supervisor-Required-Before-Create.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PERF-REVIEW-02: employee without a supervisor link cannot be given a Supervisor Reviewer, Save is blocked', async ({
  page,
  addEmployeePage,
  performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-REVIEW-02', 'Supervisor Required Before Create', env.baseURL, page);

  report.step('Setup: employee baru TANPA supervisor link apapun');
  const emp = await createTestEmployee(page, addEmployeePage, 'QaRevNoSup');

  report.step('Buka Add Review, pilih employee tsb, cari Supervisor Reviewer dgn query luas ("a")');
  await performanceManageReviewsPage.gotoAdd();
  await performanceManageReviewsPage.selectEmployee(emp.employeeId, emp.lastName);
  const supOptions = await performanceManageReviewsPage.selectSupervisorReviewer('a');
  report.check('Supervisor Reviewer = "No Records Found" (employee blm ada supervisor)', supOptions[0] === 'No Records Found', `options=${JSON.stringify(supOptions)}`);

  report.step('Isi tanggal lalu coba Save tanpa Supervisor Reviewer terisi');
  await performanceManageReviewsPage.fillReviewPeriod('2026-01-01', '2026-06-30', '2026-07-15');
  const resp = await performanceManageReviewsPage.save();
  report.check('TIDAK ada POST terkirim (diblokir client-side)', resp === null, `status=${resp?.status()}`);
  const bodyText = await page.locator('body').innerText();
  report.check('Pesan error "Invalid" muncul di bawah Supervisor Reviewer', bodyText.includes('Invalid'));

  report.print();
});
