/**
 * ================================================================================
 * TC-PERF-KPI-08 — Verify KPI List Search By Job Title Filters Correctly
 * Modul    : Performance - Configure - KPIs
 * Kategori : Positive (+) 1.6 -- UI
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-KPI-08-Verify-Search-By-Job-Title.spec.ts
 * Path     : tests/performance/kpi/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi filter "Job Title" pd daftar KPI hanya menampilkan KPI milik Job Title yg
 *   dipilih (semua baris hasil filter punya kolom Job Title yg sama).
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/kpi/TC-PERF-KPI-08-Verify-Search-By-Job-Title.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PERF-KPI-08: filtering the KPI list by Job Title returns only that Job Title\'s KPIs', async ({
  page,
  performanceKpiPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PERF-KPI-08', 'Search By Job Title', env.baseURL, page);

  report.step('Buka daftar KPI, filter Job Title = "QA Engineer", Search');
  await performanceKpiPage.goto();
  await performanceKpiPage.selectJobTitle('QA Engineer');
  await performanceKpiPage.searchButton.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);

  const rows = await performanceKpiPage.tableRows.allInnerTexts();
  report.check('Minimal 1 baris ditemukan utk Job Title "QA Engineer"', rows.length > 0, `count=${rows.length}`);
  report.check('SEMUA baris hasil filter mengandung "QA Engineer" sbg Job Title-nya', rows.every((r) => r.includes('QA Engineer')), `rows=${JSON.stringify(rows)}`);

  report.step('Reset lalu filter Job Title = "HR Manager" -> himpunan baris harus BEDA (tidak mengandung "QA Engineer")');
  await performanceKpiPage.goto();
  await performanceKpiPage.selectJobTitle('HR Manager');
  await performanceKpiPage.searchButton.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  const rows2 = await performanceKpiPage.tableRows.allInnerTexts();
  report.check('SEMUA baris hasil filter "HR Manager" TIDAK mengandung "QA Engineer"', rows2.every((r) => !r.includes('QA Engineer')), `rows=${JSON.stringify(rows2)}`);

  report.print();
});
