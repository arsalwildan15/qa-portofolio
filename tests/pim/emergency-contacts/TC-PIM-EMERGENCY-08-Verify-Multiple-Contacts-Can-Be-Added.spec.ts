/**
 * ================================================================================
 * TC-PIM-EMERGENCY-08 — Verify Multiple Contacts Can Be Added
 * Modul    : PIM - Emergency Contacts
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-EMERGENCY-08-Verify-Multiple-Contacts-Can-Be-Added.spec.ts
 * Path     : tests/pim/emergency-contacts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi satu employee bisa punya LEBIH DARI SATU emergency
 *   contact — menambah 2 contact berbeda keduanya muncul di tabel.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/emergency-contacts/TC-PIM-EMERGENCY-08-Verify-Multiple-Contacts-Can-Be-Added.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-EMERGENCY-08: more than one emergency contact can be added', async ({
  page,
  addEmployeePage,
  emergencyContactsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-EMERGENCY-08', 'Multiple Contacts Can Be Added', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Emergency Contacts');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaEmerMulti');
  await emergencyContactsPage.goto(empNumber);

  report.step('Tambah contact pertama: "Contact Alpha"');
  await emergencyContactsPage.addButton.click();
  await emergencyContactsPage.nameInput.waitFor({ state: 'visible' });
  await emergencyContactsPage.nameInput.fill('Contact Alpha');
  await emergencyContactsPage.relationshipInput.fill('Brother');
  await emergencyContactsPage.mobileInput.fill('081111111111');
  await emergencyContactsPage.save();
  await isHiddenWithWait(page.locator('.oxd-form-loader'));
  await page.waitForTimeout(500);

  report.step('Tambah contact kedua: "Contact Beta"');
  await emergencyContactsPage.addButton.click();
  await emergencyContactsPage.nameInput.waitFor({ state: 'visible' });
  await emergencyContactsPage.nameInput.fill('Contact Beta');
  await emergencyContactsPage.relationshipInput.fill('Sister');
  await emergencyContactsPage.mobileInput.fill('082222222222');
  await emergencyContactsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify kedua contact muncul di tabel');
  report.check('"Contact Alpha" muncul', await isVisibleWithWait(page.getByText('Contact Alpha')));
  report.check('"Contact Beta" muncul', await isVisibleWithWait(page.getByText('Contact Beta')));

  report.print();
});
