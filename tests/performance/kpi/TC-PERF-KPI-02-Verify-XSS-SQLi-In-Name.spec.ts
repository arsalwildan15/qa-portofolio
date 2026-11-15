/**
 * ================================================================================
 * TC-PERF-KPI-02 — Verify XSS/SQLi Payload In KPI Name Does Not Break The App
 * Modul    : Performance - Configure - KPIs
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-KPI-02-Verify-XSS-SQLi-In-Name.spec.ts
 * Path     : tests/performance/kpi/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS dan SQL injection di kolom Key
 *   Performance Indicator tersimpan sbg string literal, tidak
 *   tereksekusi sbg script, dan tidak merusak daftar KPI setelahnya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/kpi/TC-PERF-KPI-02-Verify-XSS-SQLi-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-PERF-KPI-02: an XSS/SQLi payload in KPI name does not execute and does not break the app', async ({
  page,
  performanceKpiPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PERF-KPI-02', 'XSS/SQLi In Name', env.baseURL, page);
  const payload = `${uniqueName('QaXss')}<script>window.__xssKpi=true</script>' OR '1'='1'; DROP TABLE ohrm_kpi;--`;

  report.step('Isi Key Performance Indicator dgn payload XSS/SQLi, Save');
  await performanceKpiPage.gotoAdd();
  await performanceKpiPage.kpiNameInput.fill(payload);
  await performanceKpiPage.selectJobTitle('QA Engineer');
  await performanceKpiPage.minRatingInput.fill('0');
  await performanceKpiPage.maxRatingInput.fill('100');
  const resp = await performanceKpiPage.save();
  report.check('[API] POST kpis status === 200 (payload diterima sbg string literal)', resp?.status() === 200, `status=${resp?.status()}`);

  report.step('Verify: payload TIDAK tereksekusi sbg script, dan list KPI masih berfungsi normal');
  await page.waitForTimeout(500);
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xssKpi?: boolean }).__xssKpi === true)
    .catch(() => false);
  report.check('Payload XSS di Name TIDAK tereksekusi sbg script', xssExecuted === false);

  await performanceKpiPage.goto();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_500);
  const listStillWorks = await isVisibleWithWait(performanceKpiPage.tableRows.first(), 10_000);
  report.check('List KPI masih berfungsi normal setelah payload XSS/SQLi tersimpan', listStillWorks);

  report.print();
});
