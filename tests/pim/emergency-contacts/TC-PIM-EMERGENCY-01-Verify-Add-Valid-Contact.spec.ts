/**
 * ================================================================================
 * TC-PIM-EMERGENCY-01 — Verify Add Valid Contact
 * Modul    : PIM - Emergency Contacts
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-EMERGENCY-01-Verify-Add-Valid-Contact.spec.ts
 * Path     : tests/pim/emergency-contacts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah emergency contact dengan Name, Relationship,
 *   dan Mobile lengkap berhasil tersimpan dan muncul di tabel.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/emergency-contacts/TC-PIM-EMERGENCY-01-Verify-Add-Valid-Contact.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-EMERGENCY-01: add valid emergency contact succeeds', async ({
  page,
  addEmployeePage,
  emergencyContactsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-EMERGENCY-01', 'Add Valid Contact', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Emergency Contacts');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaEmerValid');
  await emergencyContactsPage.goto(empNumber);

  report.step('Klik "+ Add", isi Name/Relationship/Mobile, klik Save');
  await emergencyContactsPage.addButton.click();
  await emergencyContactsPage.nameInput.waitFor({ state: 'visible' });
  await emergencyContactsPage.nameInput.fill('Jane Doe');
  await emergencyContactsPage.relationshipInput.fill('Sister');
  await emergencyContactsPage.mobileInput.fill('081234567890');
  await emergencyContactsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify contact muncul di tabel');
  report.check('"Jane Doe" muncul di tabel', await isVisibleWithWait(page.getByText('Jane Doe')));

  report.print();
});
