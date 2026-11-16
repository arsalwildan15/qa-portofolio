/**
 * ================================================================================
 * TC-PERF-KPI-11 — Verify The KPI List Sorts By Name And Paginates At 50 Rows
 * Modul    : Performance - Configure - KPIs
 * Kategori : Positive (+) 1.6 | Boundary (B) 3.5 3.6 | API (A) 6.6 -- UI List
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-KPI-11-Verify-Sort-And-Pagination.spec.ts
 * Path     : tests/performance/kpi/
 * ================================================================================
 *
 * TUJUAN:
 *   Kolom "Key Performance Indicator" & "Job Title" punya sort (Ascending/Descending). Confirmed
 *   live: Descending pada kolom KPI -> GET performance/kpis?...sortField=kpi.title&sortOrder=DESC;
 *   daftar dibatasi 50 baris/halaman, halaman 2 -> offset=50. TC memverifikasi urutan baris UI
 *   sama dgn urutan respons server, urutan menurun, dan jumlah baris tiap halaman konsisten dgn
 *   meta.total (bukan angka tetap -- data demo publik berubah). Halaman 2 hanya diuji bila
 *   total > 50; kalau tidak, dicatat sbg finding.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/kpi/TC-PERF-KPI-11-Verify-Sort-And-Pagination.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { type Page } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

const kpiListResponse = (page: Page, predicate: (url: string) => boolean) =>
  page.waitForResponse((r) => r.url().includes('/api/v2/performance/kpis?') && r.request().method() === 'GET' && predicate(r.url()), { timeout: 15_000 }).catch(() => null);

test('TC-PERF-KPI-11: the KPI list sorts by name and paginates at 50 rows', async ({ page, performanceKpiPage }, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-KPI-11', 'KPI Sort And Pagination', env.baseURL, page);
  const firstCellTexts = async () => (await page.locator('.oxd-table-card').allInnerTexts()).map((t) => t.split('\n')[0]!.trim());

  report.step('Buka daftar KPI');
  await performanceKpiPage.goto();
  await page.locator('.oxd-table-card').first().waitFor({ state: 'visible', timeout: 15_000 });

  report.step('Sort kolom "Key Performance Indicator" -> Descending');
  const descResp = kpiListResponse(page, (u) => u.includes('sortField=kpi.title') && u.includes('sortOrder=DESC') && u.includes('offset=0'));
  // Every sortable column keeps its own dropdown in the DOM -- scope to the KPI column.
  const kpiHeader = page.locator('.oxd-table-header-cell', { hasText: 'Key Performance Indicator' });
  await kpiHeader.locator('.oxd-table-header-sort').click();
  await kpiHeader.locator('.oxd-table-header-sort-dropdown').getByText('Descending').click();
  const desc = await descResp;
  const descBody = await desc?.json().catch(() => null);
  const apiTitles = ((descBody?.data ?? []) as Array<{ title: string }>).map((k) => k.title.trim());
  const total = Number(descBody?.meta?.total ?? 0);
  report.check('[API] Request membawa sortField=kpi.title & sortOrder=DESC', desc !== null, `url=${desc?.url()}`);
  await page.locator('.oxd-table-card').nth(Math.max(apiTitles.length - 1, 0)).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  const uiTitles = await firstCellTexts();
  report.check('Urutan baris UI = urutan respons server', JSON.stringify(uiTitles) === JSON.stringify(apiTitles), `ui[0..2]=${JSON.stringify(uiTitles.slice(0, 3))}, api[0..2]=${JSON.stringify(apiTitles.slice(0, 3))}`);
  const first = apiTitles[0]?.toLowerCase() ?? '';
  const last = apiTitles[apiTitles.length - 1]?.toLowerCase() ?? '';
  report.check('Urutan menurun (judul pertama >= judul terakhir, case-insensitive)', first.localeCompare(last) >= 0, `first="${apiTitles[0]}", last="${apiTitles[apiTitles.length - 1]}"`);

  report.step('Pagination: halaman 1 maksimal 50 baris, sesuai meta.total');
  report.check('Halaman 1 = min(50, total) baris', uiTitles.length === Math.min(50, total), `rows=${uiTitles.length}, total=${total}`);
  report.check('Teks "(N) Records Found" = meta.total', await isVisibleWithWait(page.getByText(`(${total}) Records Found`), 5_000), `total=${total}`);

  if (total > 50) {
    report.step('Klik halaman 2');
    const p2Resp = kpiListResponse(page, (u) => u.includes('offset=50') && u.includes('sortOrder=DESC'));
    await page.locator('.oxd-pagination-page-item').filter({ hasText: /^2$/ }).click();
    const p2 = await p2Resp;
    const p2Body = await p2?.json().catch(() => null);
    const p2Total = Number(p2Body?.meta?.total ?? total);
    report.check('[API] Halaman 2 -> offset=50 dgn sort tetap DESC', p2 !== null, `url=${p2?.url()}`);
    const expectedRows = Math.min(50, p2Total - 50);
    await page.locator('.oxd-table-card').nth(Math.max(expectedRows - 1, 0)).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    const p2Titles = await firstCellTexts();
    report.check('Halaman 2 = min(50, total-50) baris', p2Titles.length === expectedRows, `rows=${p2Titles.length}, expected=${expectedRows}`);
    report.check('Baris halaman 2 tidak mengulang baris pertama halaman 1', !p2Titles.includes(apiTitles[0]!) || apiTitles.filter((t) => t === apiTitles[0]).length > 1, `p2[0]=${p2Titles[0]}`);
  } else {
    report.finding('Pagination tidak teruji', `meta.total=${total} <= 50, hanya ada 1 halaman pada saat run.`);
  }

  report.print();
});
