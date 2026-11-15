/**
 * ================================================================================
 * TC-PERF-REVIEW-08 — Verify Manage Reviews List Search/Filter By Employee Name And Review Status
 * Modul    : Performance - Manage Reviews
 * Kategori : Positive (+) / UI
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-08-Verify-Search-Filter-List.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi filter Employee Name mengembalikan hanya baris yg cocok, dan filter Review
 *   Status "Inactive" tidak menampilkan review yg sudah "Activated" utk employee yg sama.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-08-Verify-Search-Filter-List.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { setupReviewableEmployee } from '../../../src/utils/setupReviewableEmployee';

test('TC-PERF-REVIEW-08: list search by Employee Name and Review Status filter correctly', async ({
  page,
  addEmployeePage,
  reportToPage,
  performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-REVIEW-08', 'Search Filter List', env.baseURL, page);

  report.step('Setup: employee + supervisor + Job Title, buat + activate review (status akan jadi Activated)');
  const { emp, supervisorSearchTerm } = await setupReviewableEmployee(page, addEmployeePage, reportToPage, 'QaRevSearch', 'QA Engineer');
  await performanceManageReviewsPage.gotoAdd();
  await performanceManageReviewsPage.selectEmployee(emp.employeeId, emp.lastName);
  await performanceManageReviewsPage.selectSupervisorReviewer(supervisorSearchTerm);
  await performanceManageReviewsPage.fillReviewPeriod('2026-01-01', '2026-06-30', '2026-07-15');
  const saveResp = await performanceManageReviewsPage.save();
  const reviewId = (await saveResp?.json().catch(() => null))?.data?.id as number | undefined;
  if (reviewId) {
    await performanceManageReviewsPage.gotoEdit(reviewId);
    await performanceManageReviewsPage.activate(reviewId);
    await page.waitForLoadState('networkidle').catch(() => {});
  }

  report.step('Search by Employee Name -> harapannya hanya baris employee ini muncul');
  await performanceManageReviewsPage.goto();
  // employeeId (unik), BUKAN firstName -- lihat catatan di TC-PERF-REVIEW-04.
  await performanceManageReviewsPage.searchByEmployeeName(emp.employeeId, emp.lastName);
  // count() does not auto-wait: wait for this employee's row to render first, otherwise a
  // slow table yields 0 rows and the "every row matches" check passes vacuously.
  await performanceManageReviewsPage.rowFor(emp.firstName).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const rowCount = await performanceManageReviewsPage.tableRows.count();
  const allRowsMatch = await performanceManageReviewsPage.tableRows.allInnerTexts();
  report.check('Semua baris hasil search mengandung nama employee tsb', allRowsMatch.every((t) => t.includes(emp.firstName)), `rows=${JSON.stringify(allRowsMatch)}`);
  report.check('Minimal 1 baris ditemukan', rowCount >= 1, `count=${rowCount}`);

  report.step('Reset lalu filter Review Status = "Inactive" -> review employee ini (Activated) TIDAK boleh muncul');
  await performanceManageReviewsPage.resetButton.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  // Employee Name di search form adalah autocomplete yg SAMA (lihat fix di searchByEmployeeName)
  // -- raw fill() saja TIDAK mem-bind nilainya, harus pilih suggestion dulu.
  await performanceManageReviewsPage.employeeNameFilterInput.fill(emp.employeeId);
  await page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  // Pick the suggestion for THIS employee (unique last name) -- see selectEmployee() note.
  await page.locator('.oxd-autocomplete-option').filter({ hasText: emp.lastName }).first().click({ timeout: 10_000 });
  const statusSelect = page.locator('.oxd-select-text').filter({ hasText: '-- Select --' }).nth(1);
  await statusSelect.click();
  await page.getByRole('option', { name: 'Inactive', exact: true }).click();
  await performanceManageReviewsPage.searchButton.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  const inactiveFilterText = await page.locator('body').innerText();
  report.check(
    'Review yg sudah Activated TIDAK muncul saat filter Review Status=Inactive',
    !inactiveFilterText.includes(`${emp.firstName} ${emp.lastName}`) || /No Records Found/i.test(inactiveFilterText),
    `bodyHasEmployee=${inactiveFilterText.includes(emp.firstName)}`,
  );

  report.print();
});
