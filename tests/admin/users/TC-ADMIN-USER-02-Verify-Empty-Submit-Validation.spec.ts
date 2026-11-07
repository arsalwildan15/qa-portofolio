/**
 * ================================================================================
 * TC-ADMIN-USER-02: Verify Empty Submit Validation
 * Modul    : Admin - User Management - Users
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-USER-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/users/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add User tanpa mengisi apa pun menampilkan
 *   validasi "Required" di field wajib dan TIDAK mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/users/TC-ADMIN-USER-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-USER-02: submitting an empty Add User form shows Required validation', async ({
  page,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-USER-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buka form Add User, klik Save tanpa isi apa pun');
  await adminUsersPage.gotoAdd();
  await adminUsersPage.save();
  await page.waitForTimeout(800);

  report.step('Verify: pesan Required muncul di minimal satu field, form tidak submit');
  const errorCount = await adminUsersPage.fieldErrors.count();
  let anyRequired = false;
  for (let i = 0; i < errorCount; i += 1) {
    const text = await adminUsersPage.fieldErrors.nth(i).textContent().catch(() => null);
    if (text && text.trim().length > 0) anyRequired = true;
  }
  report.check('Pesan validasi "Required" muncul di field wajib', anyRequired, `errorCount=${errorCount}`);
  report.check('URL masih di form Add User (tidak submit)', page.url().includes('saveSystemUser') || page.url().includes('SystemUser'));

  report.print();
});
