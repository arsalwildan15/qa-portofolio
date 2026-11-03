/**
 * ================================================================================
 * TC-PIM-EMERGENCY-03 — Verify Name Without Phone
 * Modul    : PIM - Emergency Contacts
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-EMERGENCY-03-Verify-Name-Without-Phone.spec.ts
 * Path     : tests/pim/emergency-contacts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Name dan Relationship terisi tapi SEMUA field telepon
 *   kosong tetap ditolak dengan "At least one phone number is required",
 *   membuktikan validasi phone bersifat cross-field (OR dari 3 kolom),
 *   bukan optional biasa.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/emergency-contacts/TC-PIM-EMERGENCY-03-Verify-Name-Without-Phone.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-EMERGENCY-03: name and relationship without any phone is rejected', async ({
  page,
  addEmployeePage,
  emergencyContactsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-EMERGENCY-03', 'Name Without Phone', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Emergency Contacts');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaEmerNoPhone');
  await emergencyContactsPage.goto(empNumber);

  report.step('Isi Name + Relationship, biarkan semua field telepon kosong, klik Save');
  await emergencyContactsPage.addButton.click();
  await emergencyContactsPage.nameInput.waitFor({ state: 'visible' });
  await emergencyContactsPage.nameInput.fill('No Phone Contact');
  await emergencyContactsPage.relationshipInput.fill('Friend');
  await emergencyContactsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify validasi phone cross-field muncul, Name/Relationship TIDAK error');
  report.check(
    '"At least one phone number is required" muncul',
    await isVisibleWithWait(page.getByText('At least one phone number is required')),
  );
  const errors = await emergencyContactsPage.fieldErrors.allTextContents();
  report.check('count(error) === 1 (hanya phone)', errors.length === 1, `errors=${JSON.stringify(errors)}`);

  report.print();
});
