/**
 * ================================================================================
 * TC-PERF-TRACKER-06 — Verify XSS Payloads In A Tracker Log Render As Text For Employee And Reviewer
 * Modul    : Performance - Tracker Logs
 * Kategori : Security (S) 5.1-XSS-Stored -- Stored XSS
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-TRACKER-06-Verify-XSS-In-Tracker-Log-Not-Executed.spec.ts
 * Path     : tests/performance/tracker/
 * ================================================================================
 *
 * TUJUAN:
 *   Log tracker ditulis karyawan lalu dibaca reviewer (dan sebaliknya) -- stored XSS di sini
 *   berdampak lintas role. Payload di field Log DAN Comment disimpan (200, confirmed live) lalu
 *   diverifikasi TIDAK tereksekusi di halaman tracker milik ESS maupun reviewer (Admin).
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/tracker/TC-PERF-TRACKER-06-Verify-XSS-In-Tracker-Log-Not-Executed.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { type Page } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { PerformanceTrackerPage } from '../../../src/pages';
import { createEssTracker } from '../../../src/utils/createEssReview';

const xssFired = (p: Page) => p.evaluate(() => (window as unknown as { __trkXss?: number }).__trkXss !== undefined);

test('TC-PERF-TRACKER-06: XSS payloads in a tracker log render as text for employee and reviewer', async ({
  page,
  browser,
  addEmployeePage,
  performanceTrackerPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PERF-TRACKER-06', 'XSS In Tracker Log Not Executed', env.baseURL, page);
  const stamp = Date.now();
  const logPayload = `<img src=x onerror="window.__trkXss=1">L${stamp}`;
  const commentPayload = `<svg onload="window.__trkXss=2">C${stamp}`;

  report.step('Setup: ESS + tracker (via API)');
  const { essPage, close, trackerId } = await createEssTracker(page, browser, addEmployeePage, 'QaPerfTrkXss');

  report.step('[ESS UI] Add Log dgn payload di Log & Comment');
  const essTracker = new PerformanceTrackerPage(essPage);
  await essTracker.gotoLogs(trackerId, 'my');
  const post = await essTracker.addLog(trackerId, logPayload, commentPayload, 'Positive');
  report.check('[API] Log tersimpan 200', post?.status() === 200, `status=${post?.status()}`);
  report.check('[ESS] Payload Log tampil sbg teks', await isVisibleWithWait(essPage.getByText(`L${stamp}`), 10_000));
  report.check('[ESS] Payload TIDAK tereksekusi', !(await xssFired(essPage)));
  report.check('[ESS] Tidak ada <img src="x"> / <svg onload> tersuntik', (await essPage.locator('img[src="x"], svg[onload]').count()) === 0);

  report.step('[Admin UI] Reviewer membuka tracker');
  await performanceTrackerPage.gotoLogs(trackerId);
  report.check('[Admin] Payload Log & Comment tampil sbg teks', await isVisibleWithWait(page.getByText(`L${stamp}`), 15_000) && await isVisibleWithWait(page.getByText(`C${stamp}`), 5_000));
  report.check('[Admin] Payload TIDAK tereksekusi', !(await xssFired(page)));
  report.check('[Admin] Tidak ada <img src="x"> / <svg onload> tersuntik', (await page.locator('img[src="x"], svg[onload]').count()) === 0);

  await close();
  report.print();
});
