/**
 * ================================================================================
 * TC-PIM-EMERGENCY-04 — Verify Name Very Long Text
 * Modul    : PIM - Emergency Contacts
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-EMERGENCY-04-Verify-Name-Very-Long-Text.spec.ts
 * Path     : tests/pim/emergency-contacts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Name dengan 300 karakter tidak membuat server crash —
 *   diterima atau ditolak dengan validasi, tapi tidak pernah 5xx.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/emergency-contacts/TC-PIM-EMERGENCY-04-Verify-Name-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-EMERGENCY-04: name with 300 characters does not crash the server', async ({
  page,
  addEmployeePage,
  emergencyContactsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-EMERGENCY-04', 'Name Very Long Text', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Emergency Contacts');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaEmerLong');
  await emergencyContactsPage.goto(empNumber);

  report.step('Isi Name = 300x "a", Relationship, Mobile, klik Save');
  await emergencyContactsPage.addButton.click();
  await emergencyContactsPage.nameInput.waitFor({ state: 'visible' });
  await emergencyContactsPage.nameInput.fill('a'.repeat(300));
  await emergencyContactsPage.relationshipInput.fill('Friend');
  await emergencyContactsPage.mobileInput.fill('081234567890');
  let serverErrorStatus: number | null = null;
  page.on('response', (r) => {
    if (r.status() >= 500) serverErrorStatus = r.status();
  });
  await emergencyContactsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify server tidak crash');
  report.check('Tidak ada response 5xx', serverErrorStatus === null, `status=${serverErrorStatus}`);

  report.print();
});
