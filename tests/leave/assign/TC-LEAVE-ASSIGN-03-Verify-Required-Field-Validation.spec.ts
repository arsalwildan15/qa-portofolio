/**
 * ================================================================================
 * TC-LEAVE-ASSIGN-03 — Verify Required Field Validation (No Employee/Date Selected)
 * Modul    : Leave - Assign Leave
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-ASSIGN-03-Verify-Required-Field-Validation.spec.ts
 * Path     : tests/leave/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Assign tanpa memilih Employee Name (field wajib)
 *   menampilkan error validasi client-side dan TIDAK mengirim POST ke
 *   server.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/assign/TC-LEAVE-ASSIGN-03-Verify-Required-Field-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-LEAVE-ASSIGN-03: clicking Assign without selecting an employee shows a required-field error and sends no POST', async ({
  page,
  assignLeavePage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-LEAVE-ASSIGN-03', 'Required Field Validation', env.baseURL, page);

  report.step('Buka Assign Leave, JANGAN pilih employee/tanggal apapun, klik Assign langsung');
  await assignLeavePage.goto();
  let postFired = false;
  page.on('request', (req) => {
    if (req.url().includes('/api/v2/leave/employees/leave-requests') && req.method() === 'POST') postFired = true;
  });
  await assignLeavePage.assignButton.click();
  await page.waitForTimeout(1_500);

  report.step('Verify: muncul error "Required" dan tidak ada POST yang terkirim');
  const requiredError = assignLeavePage.fieldErrors.filter({ hasText: 'Required' }).first();
  const errorVisible = await requiredError.isVisible().catch(() => false);
  report.check('Pesan error "Required" tampil (minimal utk Employee Name)', errorVisible);
  report.check('TIDAK ada POST assign leave terkirim (form tidak lolos validasi client-side)', postFired === false);
  report.check('URL tetap di assignLeave (tidak ada navigasi submit)', page.url().includes('/leave/assignLeave'));

  report.print();
});
