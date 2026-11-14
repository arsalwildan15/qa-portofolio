/**
 * ================================================================================
 * TC-LEAVE-ASSIGN-05 — Verify Leap Year Date Boundary (Feb 29) On Assign Leave
 * Modul    : Leave - Assign Leave
 * Kategori : Boundary (B) 3.4 - Tanggal (leap year)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-ASSIGN-05-Verify-Leap-Year-Date-Boundary.spec.ts
 * Path     : tests/leave/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi penanganan tanggal 29 Februari:
 *   - 2028-29-02 (2028 ADALAH leap year, tanggal valid): diterima, form berlanjut normal
 *     (balance check jalan, bukan error format tanggal).
 *   - 2027-29-02 (2027 BUKAN leap year, tanggal TIDAK EKSIS): ditolak dgn pesan "Should be a
 *     valid date in yyyy-dd-mm format" (dikonfirmasi live muncul; jumlah pesan persis di 1
 *     atau 2 field bisa bervariasi tergantung timing re-render, jadi dicek minimal 1 field
 *     utk stabilitas, bukan exact count).
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/assign/TC-LEAVE-ASSIGN-05-Verify-Leap-Year-Date-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

test('TC-LEAVE-ASSIGN-05: Feb 29 on a leap year is accepted, Feb 29 on a non-leap year is rejected as an invalid date', async ({
  page,
  assignLeavePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-LEAVE-ASSIGN-05', 'Leap Year Date Boundary', env.baseURL, page, [
    /Failed to load resource.*4\d\d/,
  ]);

  report.step('2028-29-02 (leap year, valid): isi tanggal, harapannya diterima tanpa error format');
  const target = await pickLightlyUsedEmployee(page);
  await assignLeavePage.goto();
  await assignLeavePage.selectEmployee(target.employeeId);
  await assignLeavePage.selectLeaveType('US - FMLA');
  await assignLeavePage.fillDateRange('2028-29-02', '2028-29-02');
  await page.waitForTimeout(1_000);
  const text1 = await page.locator('body').innerText();
  report.check(
    'TIDAK ada pesan error format tanggal utk 2028-29-02 (leap year valid)',
    !text1.includes('Should be a valid date'),
  );
  report.check(
    'Balance check tetap jalan normal (bukan diblokir di level validasi tanggal)',
    text1.includes('Balance') || text1.includes('Day(s)'),
  );

  report.step('2027-29-02 (BUKAN leap year, tanggal tidak eksis): harapannya ditolak dgn pesan format invalid');
  await assignLeavePage.fillDateRange('2027-29-02', '2027-29-02');
  await page.waitForTimeout(2_000);
  const text2 = await page.locator('body').innerText();
  const invalidDateCount = (text2.match(/Should be a valid date/g) ?? []).length;
  report.check('Pesan "Should be a valid date" muncul minimal utk 1 field (From/To)', invalidDateCount >= 1, `count=${invalidDateCount}`);

  report.print();
});
