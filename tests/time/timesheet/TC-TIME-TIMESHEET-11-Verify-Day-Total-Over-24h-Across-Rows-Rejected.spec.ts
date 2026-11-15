/**
 * ================================================================================
 * TC-TIME-TIMESHEET-11 — Verify A Day Cannot Total More Than 24 Hours Across Timesheet Rows
 * Modul    : Time - My Timesheet (ESS)
 * Kategori : Boundary (B) / Data Integrity
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TIMESHEET-11-Verify-Day-Total-Over-24h-Across-Rows-Rejected.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * TUJUAN:
 *   Satu hari hanya punya 24 jam. Server SUDAH menolak satu sel > 24 jam (25:00 -> 422
 *   [entries], confirmed live), jadi aturannya ada -- TC ini memeriksa apakah aturan yg sama
 *   berlaku utk JUMLAH beberapa baris di hari yg sama: baris 1 Senin 08:00 + baris 2 Senin
 *   20:00 = 28:00 seharusnya ditolak.
 *   Confirmed live 15 Nov 2026: DITERIMA 200, total Senin tersimpan 28:00 dan tampil di
 *   My Timesheet -> BUG (validasi per-hari hanya per sel, tidak per hari). TC sengaja FAILED.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TIMESHEET-11-Verify-Day-Total-Over-24h-Across-Rows-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createEssTimesheet, getEssTimesheetEntries, otherSeedActivityId, PROJECT_ID } from '../../../src/utils/createEssTimesheet';

test('TC-TIME-TIMESHEET-11: a day cannot total more than 24 hours across timesheet rows', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-TIME-TIMESHEET-11', 'Day Total Over 24h Across Rows', env.baseURL, page);

  report.step('Setup: ESS dgn timesheet (baris 1: Senin 08:00), belum disubmit');
  const { essPage, close, timesheetId, startDate } = await createEssTimesheet(page, browser, addEmployeePage, 'QaTime24h', { submit: false });
  const activity2 = await otherSeedActivityId(page);
  const entriesUrl = `/web/index.php/api/v2/time/timesheets/${timesheetId}/entries`;

  report.step('[ESS API] Kontrol: satu sel 25:00 ditolak');
  const single = await essPage.request.put(entriesUrl, {
    data: { entries: [{ projectId: PROJECT_ID, activityId: activity2, dates: { [startDate]: { duration: '25:00' } } }], deletedEntries: [] },
  });
  report.check('[API] Sel tunggal 25:00 -> 422 (aturan 24 jam ADA)', single.status() === 422, `status=${single.status()}`);

  report.step('[ESS API] Baris 2 Senin 20:00 (08:00 + 20:00 = 28:00 di hari yg sama)');
  const over = await essPage.request.put(entriesUrl, {
    data: { entries: [{ projectId: PROJECT_ID, activityId: activity2, dates: { [startDate]: { duration: '20:00' } } }], deletedEntries: [] },
  });
  const after = await getEssTimesheetEntries(essPage, timesheetId);
  const monday = after?.meta?.columns?.[startDate]?.total?.label;
  report.finding('Respons & total Senin', `status=${over.status()}, totalSenin=${monday}`);
  report.check('[API] Total harian > 24 jam ditolak (4xx)', over.status() >= 400 && over.status() < 500, `status=${over.status()}`);
  report.check('[API] Total Senin tidak melebihi 24:00', !!monday && Number(monday.split(':')[0]) < 24 || monday === '24:00', `totalSenin=${monday}`);

  report.step('[ESS UI] My Timesheet tidak menampilkan hari > 24 jam');
  await essPage.goto('/web/index.php/time/viewMyTimesheet');
  await essPage.locator('.orangehrm-timesheet-table').waitFor({ state: 'visible', timeout: 20_000 });
  report.check('Teks "28:00" TIDAK tampil', !(await isVisibleWithWait(essPage.locator('.orangehrm-timesheet-table').getByText('28:00').first(), 5_000)));

  await close();
  report.print();
});
