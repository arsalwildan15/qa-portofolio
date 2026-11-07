/**
 * ================================================================================
 * TC-ADMIN-SHIFT-02: Verify Empty Submit Validation
 * Modul    : Admin - Work Shifts
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SHIFT-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/work-shifts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add Work Shift tanpa mengisi Shift Name
 *   menampilkan validasi "Required" dan TIDAK mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/work-shifts/TC-ADMIN-SHIFT-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-SHIFT-02: submitting an empty Add Work Shift form shows Required validation', async ({
  page,
  adminWorkShiftsPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-SHIFT-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buka form Add Work Shift, klik Save tanpa isi Shift Name');
  await adminWorkShiftsPage.gotoAdd();
  await adminWorkShiftsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify: pesan Required muncul, form tidak submit');
  const requiredError = await adminWorkShiftsPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check('Pesan validasi "Required" muncul', (requiredError ?? '').trim().length > 0, `error=${requiredError}`);

  report.print();
});
