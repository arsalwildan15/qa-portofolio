/**
 * ================================================================================
 * TC-LEAVE-APPLY-03 — Verify Required Field Validation (Date Not Filled)
 * Modul    : Leave - Apply
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPLY-03-Verify-Required-Field-Validation.spec.ts
 * Path     : tests/leave/apply/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Apply tanpa mengisi tanggal From Date menampilkan
 *   error validasi client-side "Required" dan TIDAK mengirim POST ke
 *   server (tidak ada leave request yang tercipta dari form kosong).
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/apply/TC-LEAVE-APPLY-03-Verify-Required-Field-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createLeaveEntitlement } from '../../../src/utils/createLeaveEntitlement';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';

test('TC-LEAVE-APPLY-03: clicking Apply without filling From Date shows a required-field error and sends no POST', async ({
  page,
  leaveEntitlementPage,
  applyLeavePage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-LEAVE-APPLY-03', 'Required Field Validation', env.baseURL, page);

  report.step('Assign entitlement agar form Apply Leave bisa diakses');
  const me = await getLoggedInEmployeeName(page);
  await createLeaveEntitlement(leaveEntitlementPage, me.employeeId, 'US - Vacation', '10');

  report.step('Buka Apply Leave, pilih leave type, JANGAN isi tanggal, klik Apply');
  await applyLeavePage.goto();
  await applyLeavePage.selectLeaveType('US - Vacation');
  let postFired = false;
  page.on('request', (req) => {
    if (req.url().includes('/api/v2/leave/leave-requests') && req.method() === 'POST') postFired = true;
  });
  await applyLeavePage.applyButton.click();
  await page.waitForTimeout(1_500);

  report.step('Verify: muncul error "Required" dan tidak ada POST yang terkirim');
  const requiredError = await applyLeavePage.fieldErrors.filter({ hasText: 'Required' }).first();
  const errorVisible = await requiredError.isVisible().catch(() => false);
  report.check('Pesan error "Required" tampil utk From Date', errorVisible);
  report.check('TIDAK ada POST leave-requests terkirim (form tidak lolos validasi client-side)', postFired === false);
  report.check('URL tetap di applyLeave (tidak ada navigasi submit)', page.url().includes('/leave/applyLeave'));

  report.print();
});
