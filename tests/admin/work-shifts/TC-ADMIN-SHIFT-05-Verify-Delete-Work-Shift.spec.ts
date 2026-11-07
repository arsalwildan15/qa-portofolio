/**
 * ================================================================================
 * TC-ADMIN-SHIFT-05: Verify Delete Work Shift
 * Modul    : Admin - Work Shifts
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SHIFT-05-Verify-Delete-Work-Shift.spec.ts
 * Path     : tests/admin/work-shifts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Work Shift yang baru dibuat bisa dihapus lewat tombol
 *   aksi pertama di row (trash/delete).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/work-shifts/TC-ADMIN-SHIFT-05-Verify-Delete-Work-Shift.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-SHIFT-05: a newly created Work Shift can be deleted', async ({
  page,
  adminWorkShiftsPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-SHIFT-05', 'Delete Work Shift', env.baseURL, page);
  const shiftName = uniqueName('QaDeleteShift');

  report.step('Buat Work Shift baru untuk dihapus');
  await adminWorkShiftsPage.gotoAdd();
  await adminWorkShiftsPage.shiftNameInput.fill(shiftName);
  await adminWorkShiftsPage.fromTimeInput.fill('09:00 AM');
  await adminWorkShiftsPage.toTimeInput.fill('05:00 PM');
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/work-shifts') && r.request().method() === 'POST'),
    adminWorkShiftsPage.save(),
  ]);
  await adminWorkShiftsPage.goto();
  await page.waitForTimeout(1200);

  report.step('Hapus Work Shift yang baru dibuat');
  const row = adminWorkShiftsPage.rowByName(shiftName).first();
  report.check('Work shift muncul sebelum dihapus', await row.isVisible({ timeout: 5_000 }).catch(() => false));
  await adminWorkShiftsPage.deleteRow(row);
  await page.waitForTimeout(1200);

  report.step('Verify: work shift tidak lagi muncul di list');
  report.check(
    `Work shift "${shiftName}" sudah terhapus`,
    !(await adminWorkShiftsPage.rowByName(shiftName).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
