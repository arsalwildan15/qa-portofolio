/**
 * ================================================================================
 * TC-PERF-KPI-09 — Verify Editing An Existing KPI's Rating Range Succeeds
 * Modul    : Performance - Configure - KPIs
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-KPI-09-Verify-Edit-KPI-Valid.spec.ts
 * Path     : tests/performance/kpi/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi KPI yg sudah ada bisa di-edit (Min/Max Rating) via ikon pensil pd baris
 *   (baris KPI TIDAK punya atribut title="Edit" seperti baris Review -- harus ditarget via
 *   class ikon `bi-pencil-fill`, confirmed live) dan perubahan tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/kpi/TC-PERF-KPI-09-Verify-Edit-KPI-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-PERF-KPI-09: editing an existing KPI\'s Min/Max rating succeeds', async ({
  page,
  performanceKpiPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PERF-KPI-09', 'Edit KPI Valid', env.baseURL, page);
  const kpiName = uniqueName('QaKpiEdit');

  report.step('Buat KPI baru utk diedit');
  await performanceKpiPage.gotoAdd();
  await performanceKpiPage.kpiNameInput.fill(kpiName);
  await performanceKpiPage.selectJobTitle('QA Engineer');
  await performanceKpiPage.minRatingInput.fill('0');
  await performanceKpiPage.maxRatingInput.fill('100');
  const createResp = await performanceKpiPage.save();
  report.check('[API] KPI awal tersimpan', createResp?.status() === 200, `status=${createResp?.status()}`);

  report.step('Klik ikon edit (pensil) pd baris KPI tsb, ubah Max Rating jadi 80');
  await performanceKpiPage.goto();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  const row = performanceKpiPage.tableRows.filter({ hasText: kpiName }).first();
  await row.locator('.bi-pencil-fill').click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);

  const prefilledName = await performanceKpiPage.kpiNameInput.inputValue();
  report.check('Form edit terisi otomatis dgn nama KPI yg benar', prefilledName === kpiName, `prefilled=${prefilledName}`);

  await performanceKpiPage.maxRatingInput.fill('');
  await performanceKpiPage.maxRatingInput.fill('80');
  const editResponsePromise = page.waitForResponse(
    (r) => /\/api\/v2\/performance\/kpis\/\d+$/.test(r.url()) && r.request().method() === 'PUT',
    { timeout: 10_000 },
  ).catch(() => null);
  await performanceKpiPage.saveButton.click();
  const editResp = await editResponsePromise;
  const editBody = await editResp?.json().catch(() => null);
  report.check('[API] PUT kpis/<id> status === 200', editResp?.status() === 200, `status=${editResp?.status()}`);
  report.check('[API] maxRating tersimpan sbg 80', editBody?.data?.maxRating === 80, `maxRating=${editBody?.data?.maxRating}`);

  report.step('Verify di daftar: Max Rating KPI ini sekarang 80');
  await performanceKpiPage.goto();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  const rowText = await performanceKpiPage.tableRows.filter({ hasText: kpiName }).first().innerText();
  report.check('Baris KPI di daftar menunjukkan Max=80', rowText.includes('80'), `rowText=${JSON.stringify(rowText)}`);

  report.print();
});
