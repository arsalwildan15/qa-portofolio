/**
 * ================================================================================
 * TC-PIM-EMERGENCY-05 — Verify XSS In Name
 * Modul    : PIM - Emergency Contacts
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-EMERGENCY-05-Verify-XSS-In-Name.spec.ts
 * Path     : tests/pim/emergency-contacts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Name tidak pernah tereksekusi (tidak ada
 *   dialog alert() terpicu) baik saat save maupun setelah tabel reload.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/emergency-contacts/TC-PIM-EMERGENCY-05-Verify-XSS-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-EMERGENCY-05: XSS payload in Name is not executed', async ({
  page,
  addEmployeePage,
  emergencyContactsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-EMERGENCY-05', 'XSS In Name', env.baseURL, page);

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step('Buat employee baru, navigate ke Emergency Contacts');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaEmerXss');
  await emergencyContactsPage.goto(empNumber);

  report.step(`Isi Name = "<script>alert('xss')</script>", Relationship, Mobile, klik Save`);
  await emergencyContactsPage.addButton.click();
  await emergencyContactsPage.nameInput.waitFor({ state: 'visible' });
  await emergencyContactsPage.nameInput.fill("<script>alert('xss')</script>");
  await emergencyContactsPage.relationshipInput.fill('Friend');
  await emergencyContactsPage.mobileInput.fill('081234567890');
  await emergencyContactsPage.save();
  await page.reload();
  await page.waitForTimeout(1500);

  report.step('Verify tidak ada dialog alert() yang terpicu');
  report.check('Tidak ada dialog alert() yang terpicu', dialogFired === false);
  const liveScriptCount = await page.locator("script:has-text(\"alert('xss')\")").count();
  report.check('count(script:has-text(alert)) === 0', liveScriptCount === 0);

  report.print();
});
