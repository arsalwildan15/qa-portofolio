/**
 * ================================================================================
 * TC-TIME-TIMESHEET-04 — Verify Day And Week Totals Add Up Across Multiple Timesheet Rows
 * Modul    : Time - My Timesheet (ESS)
 * Kategori : Positive (+) 1.1-D 1.1-U | API (A) 6.1 -- Calculation
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TIMESHEET-04-Verify-Multi-Row-Totals.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * TUJUAN:
 *   Timesheet ESS punya baris 1 (ACME Ltd / Administration: Sen 08:00, Sel 07:30). Baris ke-2
 *   (activity lain, Sen 02:00) ditambahkan -> PUT timesheets/<id>/entries 200. Server
 *   menjumlah per hari (meta.columns: Sen 10:00) & per minggu (meta.sum 17:30), dan baris
 *   "Total" di halaman My Timesheet menampilkan angka yg sama. Sebaliknya, menghapus baris
 *   (deletedEntries [{projectId, activityId}]) mengembalikan total ke 15:30.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TIMESHEET-04-Verify-Multi-Row-Totals.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { type Page } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssTimesheet, getEssTimesheetEntries, otherSeedActivityId, PROJECT_ID } from '../../../src/utils/createEssTimesheet';

/** Opens My Timesheet and returns the footer "Total" line split into cells. */
async function myTimesheetTotals(essPage: Page, expectedSum: string): Promise<{ rows: number; footer: string[] }> {
  await essPage.goto('/web/index.php/time/viewMyTimesheet');
  const table = essPage.locator('.orangehrm-timesheet-table');
  await table.getByText(expectedSum).first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
  const lines = (await table.innerText()).split('\n').map((l) => l.trim());
  const footer = (lines.find((l) => l.startsWith('Total') && /\d\d:\d\d/.test(l)) ?? '').split(/\t+/).map((c) => c.trim()).filter(Boolean);
  // The footer "Total" line shares the body-row class -- count only project rows.
  const bodyRows = await essPage.locator('.orangehrm-timesheet-table-body-row').allInnerTexts();
  return { rows: bodyRows.filter((t) => !t.trim().startsWith('Total')).length, footer };
}

test('TC-TIME-TIMESHEET-04: day and week totals add up across multiple timesheet rows', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-TIME-TIMESHEET-04', 'Multi-Row Totals', env.baseURL, page);

  report.step('Setup: ESS dgn timesheet (baris 1: Sen 08:00, Sel 07:30), belum disubmit');
  const { essPage, close, timesheetId, startDate } = await createEssTimesheet(page, browser, addEmployeePage, 'QaTimeMulti', { submit: false });
  const activity2 = await otherSeedActivityId(page);

  report.step('[ESS API] Tambah baris 2 (activity lain, Sen 02:00)');
  const put = await essPage.request.put(`/web/index.php/api/v2/time/timesheets/${timesheetId}/entries`, {
    data: { entries: [{ projectId: PROJECT_ID, activityId: activity2, dates: { [startDate]: { duration: '02:00' } } }], deletedEntries: [] },
  });
  report.check('[API] PUT entries 200', put.status() === 200, `status=${put.status()}`);
  const two = await getEssTimesheetEntries(essPage, timesheetId);
  report.check('[API] Timesheet punya 2 baris', two?.data?.length === 2, `rows=${two?.data?.length}`);
  report.check('[API] Total Senin = 10:00', two?.meta?.columns?.[startDate]?.total?.label === '10:00', `mon=${two?.meta?.columns?.[startDate]?.total?.label}`);
  report.check('[API] Total minggu = 17:30', two?.meta?.sum?.label === '17:30', `sum=${two?.meta?.sum?.label}`);

  report.step('[ESS UI] My Timesheet: 2 baris + baris Total');
  const ui2 = await myTimesheetTotals(essPage, '17:30');
  report.check('2 baris tampil', ui2.rows === 2, `rows=${ui2.rows}`);
  report.check('Baris Total: Senin 10:00, Selasa 07:30, total 17:30', ui2.footer[1] === '10:00' && ui2.footer[2] === '07:30' && ui2.footer[ui2.footer.length - 1] === '17:30', `footer=${JSON.stringify(ui2.footer)}`);

  report.step('[ESS API] Hapus baris 2 (deletedEntries)');
  const del = await essPage.request.put(`/web/index.php/api/v2/time/timesheets/${timesheetId}/entries`, {
    data: { entries: [], deletedEntries: [{ projectId: PROJECT_ID, activityId: activity2 }] },
  });
  const one = await getEssTimesheetEntries(essPage, timesheetId);
  report.check('[API] Hapus baris 200, sisa 1 baris, total kembali 15:30', del.status() === 200 && one?.data?.length === 1 && one?.meta?.sum?.label === '15:30', `status=${del.status()}, rows=${one?.data?.length}, sum=${one?.meta?.sum?.label}`);
  const ui1 = await myTimesheetTotals(essPage, '15:30');
  report.check('[UI] 1 baris, total 15:30', ui1.rows === 1 && ui1.footer[ui1.footer.length - 1] === '15:30', `rows=${ui1.rows}, footer=${JSON.stringify(ui1.footer)}`);

  await close();
  report.print();
});
