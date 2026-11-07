/**
 * ================================================================================
 * TC-ADMIN-SHIFT-01: Verify Add Work Shift Valid
 * Modul    : Admin - Work Shifts
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SHIFT-01-Verify-Add-Work-Shift-Valid.spec.ts
 * Path     : tests/admin/work-shifts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Work Shift baru (Shift Name, From 09:00 AM,
 *   To 05:00 PM) berhasil tersimpan via POST /api/v2/admin/work-shifts
 *   dan muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/work-shifts/TC-ADMIN-SHIFT-01-Verify-Add-Work-Shift-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-SHIFT-01: adding a work shift with valid From < To succeeds', async ({
  page,
  adminWorkShiftsPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-SHIFT-01', 'Add Work Shift Valid', env.baseURL, page);
  const shiftName = uniqueName('QaShift');

  report.step('Isi Shift Name, From 09:00 AM, To 05:00 PM, klik Save');
  await adminWorkShiftsPage.gotoAdd();
  await adminWorkShiftsPage.shiftNameInput.fill(shiftName);
  await adminWorkShiftsPage.fromTimeInput.fill('09:00 AM');
  await adminWorkShiftsPage.toTimeInput.fill('05:00 PM');

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/work-shifts') && r.request().method() === 'POST'),
    adminWorkShiftsPage.save(),
  ]);

  report.step('Verify response POST work-shifts, dan shift muncul di list');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await adminWorkShiftsPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `Work shift "${shiftName}" muncul di list`,
    await adminWorkShiftsPage.rowByName(shiftName).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.print();
});
