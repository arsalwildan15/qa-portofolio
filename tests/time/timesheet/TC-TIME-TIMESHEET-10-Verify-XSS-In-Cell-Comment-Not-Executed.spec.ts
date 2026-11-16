/**
 * ================================================================================
 * TC-TIME-TIMESHEET-10 — Verify An XSS Payload In A Timesheet Cell Comment Renders As Text
 * Modul    : Time - My Timesheet (ESS) / Employee Timesheet (Admin)
 * Kategori : Security (S) 5.1-XSS-Stored -- Stored XSS
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TIMESHEET-10-Verify-XSS-In-Cell-Comment-Not-Executed.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * TUJUAN:
 *   Setiap sel durasi punya komentar (ikon chat muncul saat sel di-hover/fokus). Confirmed
 *   live: simpan = PUT timesheets/<id>/entries/comment {date, comment, projectId, activityId}
 *   200 (disimpan apa adanya); dialog Comment memuat via GET entries/<entryId>/comment.
 *   Komentar ditulis karyawan dan dibaca atasan -- TC memverifikasi payload tampil sbg teks
 *   dan TIDAK tereksekusi di dialog milik ESS maupun Admin (setelah timesheet di-submit).
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TIMESHEET-10-Verify-XSS-In-Cell-Comment-Not-Executed.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { expect, type Page } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssTimesheet, getEssTimesheetEntries, PROJECT_ID, ACTIVITY_ID } from '../../../src/utils/createEssTimesheet';

/** The dialog shows the saved comment inside a (read-only) textarea, so compare its value. */
const dialogComment = async (p: Page) => {
  const ta = p.getByRole('dialog').locator('textarea');
  await expect(ta).not.toHaveValue('', { timeout: 10_000 }).catch(() => {});
  return ta.inputValue().catch(() => '');
};

const xssFired = (p: Page) => p.evaluate(() => (window as unknown as { __tsXss?: number }).__tsXss !== undefined);

/** Hovers the cell showing `duration`, opens its comment dialog, waits for the comment GET. */
async function openCellComment(p: Page, duration: string): Promise<void> {
  const table = p.locator('.orangehrm-timesheet-table');
  await table.waitFor({ state: 'visible', timeout: 20_000 });
  const cell = p.locator('.orangehrm-timesheet-table-body-cell', { hasText: duration }).first();
  await cell.waitFor({ state: 'visible', timeout: 15_000 });
  await cell.hover();
  const loaded = p.waitForResponse((r) => /\/entries\/\d+\/comment/.test(r.url()) && r.request().method() === 'GET', { timeout: 15_000 }).catch(() => null);
  await cell.locator('.orangehrm-timesheet-icon-comment').click({ force: true });
  await p.getByRole('dialog').waitFor({ state: 'visible', timeout: 10_000 });
  await loaded;
}

test('TC-TIME-TIMESHEET-10: an XSS payload in a timesheet cell comment renders as text for ESS and Admin', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-TIME-TIMESHEET-10', 'XSS In Cell Comment Not Executed', env.baseURL, page);
  const stamp = Date.now();
  const payload = `<img src=x onerror="window.__tsXss=1">C${stamp}`;

  report.step('Setup: ESS dgn timesheet (Senin 08:00), belum disubmit');
  const { ess, essPage, close, timesheetId, startDate } = await createEssTimesheet(page, browser, addEmployeePage, 'QaTimeXss', { submit: false });

  report.step('[ESS API] Simpan komentar sel Senin dgn payload XSS');
  const put = await essPage.request.put(`/web/index.php/api/v2/time/timesheets/${timesheetId}/entries/comment`, {
    data: { date: startDate, comment: payload, projectId: PROJECT_ID, activityId: ACTIVITY_ID },
  });
  report.check('[API] PUT entries/comment 200', put.status() === 200, `status=${put.status()}`);
  const stored = (await getEssTimesheetEntries(essPage, timesheetId))?.data?.[0]?.dates?.[startDate]?.comment;
  report.check('[API] Komentar tersimpan apa adanya', stored === payload, `stored=${stored}`);

  report.step('[ESS UI] My Timesheet -> buka dialog komentar sel Senin');
  await essPage.goto('/web/index.php/time/viewMyTimesheet');
  await openCellComment(essPage, '08:00');
  const essComment = await dialogComment(essPage);
  report.check('[ESS] Payload tampil utuh sbg teks di dialog', essComment === payload, `value=${essComment}`);
  report.check('[ESS] Payload TIDAK tereksekusi', !(await xssFired(essPage)));
  report.check('[ESS] Tidak ada <img src="x"> tersuntik', (await essPage.locator('img[src="x"]').count()) === 0);
  await essPage.keyboard.press('Escape');

  report.step('[ESS API] Submit, lalu Admin membuka timesheet karyawan');
  const sub = await essPage.request.put(`/web/index.php/api/v2/time/timesheets/${timesheetId}`, { data: { action: 'SUBMIT' } });
  report.check('[API] Submit 200', sub.status() === 200, `status=${sub.status()}`);
  await page.goto(`/web/index.php/time/viewTimesheet/employeeId/${ess.empNumber}?startDate=${startDate}`);
  await openCellComment(page, '08:00');
  const adminComment = await dialogComment(page);
  report.check('[Admin] Payload tampil utuh sbg teks di dialog', adminComment === payload, `value=${adminComment}`);
  report.check('[Admin] Payload TIDAK tereksekusi', !(await xssFired(page)));
  report.check('[Admin] Tidak ada <img src="x"> tersuntik', (await page.locator('img[src="x"]').count()) === 0);

  await close();
  report.print();
});
