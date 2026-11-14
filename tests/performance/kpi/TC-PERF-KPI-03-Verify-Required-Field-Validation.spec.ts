/**
 * ================================================================================
 * TC-PERF-KPI-03 — Verify Required Field Validation On Add KPI
 * Modul    : Performance - Configure - KPIs
 * Kategori : Negative (-) 2.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-KPI-03-Verify-Required-Field-Validation.spec.ts
 * Path     : tests/performance/kpi/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add KPI tanpa isi field apapun menampilkan error "Required"
 *   dan tidak mengirim POST ke server.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/kpi/TC-PERF-KPI-03-Verify-Required-Field-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PERF-KPI-03: submitting Add KPI with no fields filled shows Required errors and sends no POST', async ({
  page,
  performanceKpiPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PERF-KPI-03', 'Required Field Validation', env.baseURL, page);

  report.step('Buka form Add KPI, langsung klik Save tanpa isi apapun');
  let postFired = false;
  page.on('request', (r) => {
    if (r.url().includes('/api/v2/performance/kpis') && r.method() === 'POST') postFired = true;
  });
  await performanceKpiPage.gotoAdd();
  await page.waitForTimeout(1_000);
  await performanceKpiPage.saveButton.click();
  await page.waitForTimeout(1_000);

  report.step('Verify: error "Required" muncul, tidak ada POST terkirim');
  const bodyText = await page.locator('body').innerText();
  const requiredCount = (bodyText.match(/Required/g) ?? []).length;
  report.check('Minimal 1 pesan "Required" muncul', requiredCount >= 1, `requiredCount=${requiredCount}`);
  report.check('TIDAK ada POST /api/v2/performance/kpis terkirim', postFired === false);

  report.print();
});
