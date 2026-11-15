/**
 * ================================================================================
 * TC-PERF-KPI-07 — Verify "Make Default Scale" Is Silently Exclusive Per Job Title
 * Modul    : Performance - Configure - KPIs
 * Kategori : Boundary (B) / Edge Case (E)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-KPI-07-Verify-Default-Scale-Is-Exclusive-Per-Job-Title.spec.ts
 * Path     : tests/performance/kpi/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menandai KPI B sbg "Make Default Scale" utk Job Title yg SAMA dgn KPI A
 *   (yg sudah default) DITERIMA (200), dan secara DIAM-DIAM meng-un-default-kan KPI A --
 *   BUKAN ditolak, BUKAN membuat 2 default sekaligus. Confirmed live 2026-11-15: respons
 *   save KPI A sendiri tetap bilang isDefault:true (snapshot saat itu), tapi saat daftar
 *   dibaca ulang setelah KPI B disimpan, hanya KPI B yg tampil "Yes" di kolom Is Default.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/kpi/TC-PERF-KPI-07-Verify-Default-Scale-Is-Exclusive-Per-Job-Title.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PERF-KPI-07: setting a 2nd default-scale KPI for the same Job Title silently un-defaults the first', async ({
  page,
  performanceKpiPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-KPI-07', 'Default Scale Exclusive Per Job Title', env.baseURL, page);
  const suffix = Date.now();
  const nameA = `DefaultScaleA ${suffix}`;
  const nameB = `DefaultScaleB ${suffix}`;

  report.step('Buat KPI A dgn Make Default Scale = ON, utk Job Title "QA Lead"');
  await performanceKpiPage.gotoAdd();
  await performanceKpiPage.kpiNameInput.fill(nameA);
  await performanceKpiPage.selectJobTitle('QA Lead');
  await performanceKpiPage.minRatingInput.fill('0');
  await performanceKpiPage.maxRatingInput.fill('100');
  await performanceKpiPage.defaultScaleToggle.click();
  const respA = await performanceKpiPage.save();
  const bodyA = await respA?.json().catch(() => null);
  report.check('[API] KPI A tersimpan dgn isDefault=true', respA?.status() === 200 && bodyA?.data?.isDefault === true, `status=${respA?.status()}, isDefault=${bodyA?.data?.isDefault}`);

  report.step('Buat KPI B dgn Make Default Scale = ON, Job Title SAMA ("QA Lead")');
  await performanceKpiPage.gotoAdd();
  await performanceKpiPage.kpiNameInput.fill(nameB);
  await performanceKpiPage.selectJobTitle('QA Lead');
  await performanceKpiPage.minRatingInput.fill('0');
  await performanceKpiPage.maxRatingInput.fill('100');
  await performanceKpiPage.defaultScaleToggle.click();
  const respB = await performanceKpiPage.save();
  const bodyB = await respB?.json().catch(() => null);
  report.check('[API] KPI B DITERIMA (200), bukan ditolak krn Job Title sudah ada default', respB?.status() === 200, `status=${respB?.status()}`);
  report.check('[API] KPI B tersimpan dgn isDefault=true', bodyB?.data?.isDefault === true, `isDefault=${bodyB?.data?.isDefault}`);

  report.step('Verify di daftar: KPI A TIDAK LAGI "Yes" di kolom Is Default, KPI B YA');
  await performanceKpiPage.goto();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_200);
  const rowAText = await performanceKpiPage.tableRows.filter({ hasText: nameA }).first().innerText();
  const rowBText = await performanceKpiPage.tableRows.filter({ hasText: nameB }).first().innerText();
  report.check('KPI A tidak lagi "Yes" (default-nya diambil alih KPI B)', !rowAText.includes('Yes'), `rowA=${JSON.stringify(rowAText)}`);
  report.check('KPI B sekarang "Yes" (default scale aktif)', rowBText.includes('Yes'), `rowB=${JSON.stringify(rowBText)}`);

  report.print();
});
