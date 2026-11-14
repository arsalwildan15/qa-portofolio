/**
 * ================================================================================
 * TC-TIME-TIMESHEET-02 — Verify Duration Format Validation On My Timesheet
 * Modul    : Time - Timesheets (My Timesheet)
 * Kategori : Negative (-) 2.2 / Boundary (B) 3.2
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TIMESHEET-02-Verify-Duration-Format-Validation.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi validasi format durasi jam per hari pada My Timesheet:
 *   - "99:99" (>24 jam, format invalid): ditolak CLIENT-SIDE dgn pesan "Should Be Less Than
 *     24 and in HH:MM or Decimal Format", tidak ada POST terkirim.
 *   - "-2:00" (negatif): sama, ditolak client-side dgn pesan yg sama.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TIMESHEET-02-Verify-Duration-Format-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-TIME-TIMESHEET-02: duration >24h or negative is rejected client-side with a clear format message', async ({
  page,
  myTimesheetPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-TIME-TIMESHEET-02', 'Duration Format Validation', env.baseURL, page);

  report.step('Isi Project+Activity pada baris pertama');
  await myTimesheetPage.goto();
  await myTimesheetPage.startEdit();
  const { project, activity } = await myTimesheetPage.fillFirstRow(['ACME', 'Apache', 'Coca-Cola', 'Fresh Books', 'FreeWave']);
  report.check('Project & Activity berhasil terisi', !!project && !!activity, `project=${project}, activity=${activity}`);

  report.step('Isi durasi "99:99" (>24 jam): harapannya ditolak client-side');
  await myTimesheetPage.fillDuration(0, '99:99');
  const resp1 = await myTimesheetPage.save();
  report.check('TIDAK ada POST terkirim utk "99:99"', resp1 === null, `status=${resp1?.status()}`);
  const text1 = await page.locator('body').innerText();
  report.check('Pesan validasi format durasi muncul utk "99:99"', /Should Be Less Than 24/i.test(text1));

  report.step('Isi durasi "-2:00" (negatif): harapannya ditolak client-side dgn pesan yg sama');
  await myTimesheetPage.fillDuration(0, '-2:00');
  const resp2 = await myTimesheetPage.save();
  report.check('TIDAK ada POST terkirim utk "-2:00"', resp2 === null, `status=${resp2?.status()}`);
  const text2 = await page.locator('body').innerText();
  report.check('Pesan validasi format durasi muncul utk "-2:00"', /Should Be Less Than 24/i.test(text2));

  report.print();
});
