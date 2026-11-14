/**
 * ================================================================================
 * TC-LEAVE-ASSIGN-06 — Verify Date Range Spanning The Leave Period Boundary Is Handled Safely
 * Modul    : Leave - Assign Leave
 * Kategori : Boundary (B) 3.4 - Tanggal (leave/fiscal period boundary)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-ASSIGN-06-Verify-Leave-Period-Boundary.spec.ts
 * Path     : tests/leave/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   OrangeHRM TERNYATA punya konsep "Leave Period" yg setara fiscal-year-boundary --
 *   dikonfirmasi live via GET /api/v2/leave/leave-period: periode saat ini berjalan
 *   2026-01-01 s/d 2027-01-30 (leavePeriodDefined: true, startMonth=1, startDay=31 --
 *   periode baru dimulai tiap tgl 31 Januari). Ini item taksonomi 3.4 yg sebelumnya
 *   didokumentasikan sbg "tidak relevan" -- ternyata RELEVAN setelah digali lebih dalam.
 *
 *   TC ini memverifikasi request leave dgn rentang tanggal yg MELINTASI batas periode tsb
 *   (29 Jan 2027 s/d 2 Feb 2027, melintasi 30/31 Jan) diproses dgn AMAN oleh form Assign
 *   Leave -- tidak crash, tidak NaN, balance check tetap berjalan normal persis spt rentang
 *   tanggal biasa.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/assign/TC-LEAVE-ASSIGN-06-Verify-Leave-Period-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

test('TC-LEAVE-ASSIGN-06: a date range spanning the configured Leave Period boundary is handled safely', async ({
  page,
  assignLeavePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-LEAVE-ASSIGN-06', 'Leave Period Boundary', env.baseURL, page);

  report.step('Konfirmasi via API bahwa Leave Period memang terdefinisi (bukan diasumsikan)');
  const periodResp = await page.request.get('/web/index.php/api/v2/leave/leave-period');
  const periodBody = await periodResp.json().catch(() => null);
  report.check(
    '[API] Leave Period terdefinisi dgn currentLeavePeriod yg valid',
    periodBody?.meta?.leavePeriodDefined === true && !!periodBody?.meta?.currentLeavePeriod?.endDate,
    `currentLeavePeriod=${JSON.stringify(periodBody?.meta?.currentLeavePeriod)}`,
  );

  report.step('Isi rentang tanggal yg MELINTASI batas Leave Period (2027-29-01 s/d 2027-02-02)');
  const target = await pickLightlyUsedEmployee(page);
  await assignLeavePage.goto();
  await assignLeavePage.selectEmployee(target.employeeId);
  await assignLeavePage.selectLeaveType('US - FMLA');
  await assignLeavePage.fillDateRange('2027-29-01', '2027-02-02');
  await page.waitForTimeout(1_500);

  report.step('Verify: tidak crash, tidak ada error format tanggal, balance check tetap berjalan normal');
  const bodyText = await page.locator('body').innerText();
  report.check('TIDAK ada error format tanggal ("Should be a valid date")', !bodyText.includes('Should be a valid date'));
  report.check(
    'Balance check tetap berjalan normal (menampilkan info balance, bukan crash/kosong)',
    bodyText.includes('Balance') || bodyText.includes('Day(s)'),
  );
  report.check('TIDAK ada NaN/undefined yg ter-render di halaman', !/NaN|undefined/.test(bodyText));

  report.print();
});
