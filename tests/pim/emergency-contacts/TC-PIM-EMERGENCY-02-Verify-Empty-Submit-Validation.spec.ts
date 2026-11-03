/**
 * ================================================================================
 * TC-PIM-EMERGENCY-02 — Verify Empty Submit Validation
 * Modul    : PIM - Emergency Contacts
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-EMERGENCY-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/pim/emergency-contacts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit modal Add Emergency Contact kosong menampilkan
 *   TEPAT 3 error: "Required" (Name), "Required" (Relationship), dan
 *   "At least one phone number is required" (validasi cross-field untuk
 *   3 kolom telepon sekaligus) — dikonfirmasi langsung.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/emergency-contacts/TC-PIM-EMERGENCY-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-EMERGENCY-02: empty submit shows required and phone validation', async ({
  page,
  addEmployeePage,
  emergencyContactsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-EMERGENCY-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Emergency Contacts');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaEmerEmpty');
  await emergencyContactsPage.goto(empNumber);

  report.step('Klik "+ Add", langsung klik Save tanpa isi apapun');
  await emergencyContactsPage.addButton.click();
  await emergencyContactsPage.nameInput.waitFor({ state: 'visible' });
  await emergencyContactsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify 3 pesan validasi muncul');
  const errors = await emergencyContactsPage.fieldErrors.allTextContents();
  report.check('count(error) === 3', errors.length === 3, `errors=${JSON.stringify(errors)}`);
  report.check(
    '"At least one phone number is required" muncul',
    await isVisibleWithWait(page.getByText('At least one phone number is required')),
  );

  report.print();
});
