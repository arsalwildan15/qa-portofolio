/**
 * ================================================================================
 * TC-ADMIN-SHIFT-03: Verify From Equals To Duration
 * Modul    : Admin - Work Shifts
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SHIFT-03-Verify-From-Equals-To-Duration.spec.ts
 * Path     : tests/admin/work-shifts/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan perilaku saat From dan To diisi waktu yang SAMA
 *   (durasi shift ambigu: 0 jam atau 24 jam?). Didokumentasikan via
 *   report.finding() karena perilaku ini genuinely ambigu dan tergantung
 *   interpretasi aplikasi, bukan pass/fail yang jelas salah.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/work-shifts/TC-ADMIN-SHIFT-03-Verify-From-Equals-To-Duration.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-SHIFT-03: a work shift with From equal to To is documented as-is', async ({
  page,
  adminWorkShiftsPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-SHIFT-03', 'From Equals To Duration', env.baseURL, page);
  const shiftName = uniqueName('QaShiftSameTime');

  report.step('Isi Shift Name, From = To = 09:00 AM, klik Save');
  await adminWorkShiftsPage.gotoAdd();
  await adminWorkShiftsPage.shiftNameInput.fill(shiftName);
  await adminWorkShiftsPage.fromTimeInput.fill('09:00 AM');
  await adminWorkShiftsPage.toTimeInput.fill('09:00 AM');
  await page.waitForTimeout(300);

  const durationText = await page
    .locator('.oxd-input-group', { has: page.getByText('Duration Per Day', { exact: true }) })
    .textContent()
    .catch(() => null);

  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/work-shifts') && r.request().method() === 'POST', { timeout: 10_000 })
    .catch(() => null);
  await adminWorkShiftsPage.save();
  const resp = await respPromise;

  report.step('Verify: catat Duration Per Day yang dihitung dan apakah tersimpan');
  report.finding('Duration Per Day saat From = To', `durationText="${durationText}", postStatus=${resp?.status() ?? 'tidak ada response'}`);
  report.check('TC dijalankan tanpa exception', true);

  if (resp && resp.status() === 200) {
    await adminWorkShiftsPage.goto();
    await page.waitForTimeout(1200);
    const row = adminWorkShiftsPage.rowByName(shiftName).first();
    if (await row.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await adminWorkShiftsPage.deleteRow(row);
    }
  }

  report.print();
});
