/**
 * ================================================================================
 * TC-PIM-REPORT-01: Verify Search Existing Report
 * Modul    : PIM - Reports
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORT-01-Verify-Search-Existing-Report.spec.ts
 * Path     : tests/pim/reports/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi list Reports menampilkan report yang sudah ada
 *   (termasuk "PIM Sample Report" bawaan demo) dan pencarian by Name
 *   mempersempit hasil dengan benar.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/reports/TC-PIM-REPORT-01-Verify-Search-Existing-Report.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PIM-REPORT-01: searching for an existing report narrows the list', async ({
  page,
  pimReportsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORT-01', 'Search Existing Report', env.baseURL, page);

  report.step('Buka Reports list, verify minimal 1 report bawaan muncul');
  await pimReportsPage.goto();
  await pimReportsPage.tableRows.first().waitFor({ state: 'visible', timeout: 10_000 });
  const initialCount = await pimReportsPage.tableRows.count();
  report.check('Minimal 1 report muncul di list', initialCount >= 1, `count=${initialCount}`);

  report.step('Cari "PIM Sample Report" via filter Report Name (autocomplete), klik Search');
  await pimReportsPage.searchInput.fill('PIM Sample Report');
  await page.waitForTimeout(600); // let the async "Searching...." placeholder resolve to the real option list
  const option = page.getByRole('option').filter({ hasText: 'PIM Sample Report' }).first();
  await option.click();
  await pimReportsPage.search();
  await page.waitForTimeout(800);

  report.step('Verify hasil pencarian hanya menampilkan report yang cocok');
  const resultCount = await pimReportsPage.tableRows.count();
  const resultTexts = await pimReportsPage.tableRows.allTextContents();
  const allMatch = resultTexts.every((t) => t.includes('PIM Sample Report'));
  report.check('Semua hasil pencarian mengandung "PIM Sample Report"', resultCount > 0 && allMatch, `count=${resultCount}`);

  report.print();
});
