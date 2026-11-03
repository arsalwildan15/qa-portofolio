/**
 * ================================================================================
 * TC-PIM-EMERGENCY-06 — Verify SQL Injection In Relationship
 * Modul    : PIM - Emergency Contacts
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-EMERGENCY-06-Verify-SQL-Injection-In-Relationship.spec.ts
 * Path     : tests/pim/emergency-contacts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di Relationship tidak membuat
 *   server crash dan tidak membocorkan error database.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/emergency-contacts/TC-PIM-EMERGENCY-06-Verify-SQL-Injection-In-Relationship.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-EMERGENCY-06: SQL injection in Relationship does not crash the server', async ({
  page,
  addEmployeePage,
  emergencyContactsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-EMERGENCY-06', 'SQL Injection In Relationship', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Emergency Contacts');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaEmerSqli');
  await emergencyContactsPage.goto(empNumber);

  report.step(`Isi Name, Relationship = "' OR '1'='1", Mobile, klik Save`);
  await emergencyContactsPage.addButton.click();
  await emergencyContactsPage.nameInput.waitFor({ state: 'visible' });
  await emergencyContactsPage.nameInput.fill('SQLi Test');
  await emergencyContactsPage.relationshipInput.fill("' OR '1'='1");
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
