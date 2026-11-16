/**
 * ================================================================================
 * TC-PERF-KPI-10 — Verify Deleting A KPI Removes It From The List
 * Modul    : Performance - Configure - KPIs
 * Kategori : Positive (+) 1.1-D | API (A) 6.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-KPI-10-Verify-Delete-KPI.spec.ts
 * Path     : tests/performance/kpi/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi KPI bisa dihapus via ikon trash pd baris (ditarget via class `bi-trash`, sama
 *   seperti ikon edit `bi-pencil-fill` -- baris KPI tidak punya atribut title="..." seperti
 *   baris Review) dan hilang dari daftar setelah konfirmasi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/kpi/TC-PERF-KPI-10-Verify-Delete-KPI.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-PERF-KPI-10: deleting a KPI removes it from the list', async ({
  page,
  performanceKpiPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PERF-KPI-10', 'Delete KPI', env.baseURL, page);
  const kpiName = uniqueName('QaKpiDelete');

  report.step('Buat KPI baru utk dihapus');
  await performanceKpiPage.gotoAdd();
  await performanceKpiPage.kpiNameInput.fill(kpiName);
  await performanceKpiPage.selectJobTitle('QA Engineer');
  await performanceKpiPage.minRatingInput.fill('0');
  await performanceKpiPage.maxRatingInput.fill('100');
  await performanceKpiPage.save();

  report.step('Klik ikon trash pd baris KPI tsb, konfirmasi delete');
  await performanceKpiPage.goto();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  const row = performanceKpiPage.tableRows.filter({ hasText: kpiName }).first();
  await row.locator('.bi-trash').click();
  const dialog = page.getByRole('dialog');
  const dialogVisible = await isVisibleWithWait(dialog, 5_000);
  report.check('Modal konfirmasi delete muncul', dialogVisible);

  const deleteResponsePromise = page.waitForResponse(
    (r) => r.url().includes('/api/v2/performance/kpis') && r.request().method() === 'DELETE',
    { timeout: 10_000 },
  ).catch(() => null);
  await dialog.getByRole('button', { name: 'Yes, Delete' }).click();
  const delResp = await deleteResponsePromise;
  report.check('[API] DELETE kpi berhasil (200)', delResp?.status() === 200, `status=${delResp?.status()}`);

  report.step('Verify: KPI tsb TIDAK lagi ada di daftar');
  await performanceKpiPage.goto();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  const gone = await isHiddenWithWait(performanceKpiPage.tableRows.filter({ hasText: kpiName }).first(), 5_000);
  report.check('KPI TIDAK lagi muncul di daftar', gone);

  report.print();
});
