/**
 * ================================================================================
 * TC-PERF-KPI-01 — Verify Adding A KPI With Valid Data Succeeds
 * Modul    : Performance - Configure - KPIs
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-KPI-01-Verify-Add-KPI-Valid.spec.ts
 * Path     : tests/performance/kpi/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi penambahan KPI baru (Key Performance Indicator, Job
 *   Title, Minimum/Maximum Rating) dgn data valid berhasil tersimpan dan
 *   muncul di daftar KPI.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/kpi/TC-PERF-KPI-01-Verify-Add-KPI-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-PERF-KPI-01: adding a KPI with valid data succeeds and appears in the list', async ({
  page,
  performanceKpiPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PERF-KPI-01', 'Add KPI Valid', env.baseURL, page);
  const kpiName = uniqueName('QaKpi');

  report.step('Buka Add KPI, isi Key Performance Indicator, Job Title, Min/Max Rating, Save');
  await performanceKpiPage.gotoAdd();
  await performanceKpiPage.kpiNameInput.fill(kpiName);
  await performanceKpiPage.selectJobTitle('QA Engineer');
  await performanceKpiPage.minRatingInput.fill('0');
  await performanceKpiPage.maxRatingInput.fill('100');
  const resp = await performanceKpiPage.save();
  report.check('[API] POST kpis status === 200', resp?.status() === 200, `status=${resp?.status()}`);

  report.step('Verify: KPI baru muncul di daftar');
  await performanceKpiPage.goto();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_500);
  const found = await performanceKpiPage.tableRows.filter({ hasText: kpiName }).first().isVisible({ timeout: 10_000 }).catch(() => false);
  report.check('KPI baru ditemukan di daftar KPI', found, `kpiName=${kpiName}`);

  report.print();
});
