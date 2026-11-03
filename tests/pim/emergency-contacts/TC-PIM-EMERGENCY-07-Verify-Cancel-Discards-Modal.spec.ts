/**
 * ================================================================================
 * TC-PIM-EMERGENCY-07 — Verify Cancel Discards Modal
 * Modul    : PIM - Emergency Contacts
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-EMERGENCY-07-Verify-Cancel-Discards-Modal.spec.ts
 * Path     : tests/pim/emergency-contacts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel di modal Add Emergency Contact membatalkan
 *   input — data TIDAK tersimpan, tabel tetap kosong.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/emergency-contacts/TC-PIM-EMERGENCY-07-Verify-Cancel-Discards-Modal.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-EMERGENCY-07: cancel button discards the modal without saving', async ({
  page,
  addEmployeePage,
  emergencyContactsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-EMERGENCY-07', 'Cancel Discards Modal', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Emergency Contacts');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaEmerCancel');
  await emergencyContactsPage.goto(empNumber);

  report.step('Klik "+ Add", isi Name "Cancelled Contact", klik Cancel (bukan Save)');
  await emergencyContactsPage.addButton.click();
  await emergencyContactsPage.nameInput.waitFor({ state: 'visible' });
  await emergencyContactsPage.nameInput.fill('Cancelled Contact');
  await emergencyContactsPage.cancelButton.click();
  await page.waitForTimeout(1000);

  report.step('Verify "Cancelled Contact" TIDAK muncul di tabel');
  const count = await page.getByText('Cancelled Contact').count();
  report.check('count("Cancelled Contact") === 0', count === 0, `count=${count}`);

  report.print();
});
