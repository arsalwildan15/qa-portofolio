/**
 * ================================================================================
 * TC-ADMIN-USER-06: Verify Cancel Discards Form
 * Modul    : Admin - User Management - Users
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-USER-06-Verify-Cancel-Discards-Form.spec.ts
 * Path     : tests/admin/users/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel pada form Add User membatalkan isian dan
 *   kembali ke list tanpa menyimpan user apa pun.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/users/TC-ADMIN-USER-06-Verify-Cancel-Discards-Form.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-USER-06: clicking Cancel discards the Add User form', async ({
  page,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-USER-06', 'Cancel Discards Form', env.baseURL, page);
  const username = uniqueName('QaCancelledUser');

  report.step('Isi Username, klik Cancel');
  await adminUsersPage.gotoAdd();
  await adminUsersPage.usernameInput.fill(username);
  await adminUsersPage.cancelButton.click();
  await page.waitForTimeout(1200);

  report.step('Verify: kembali ke list Users, username TIDAK tersimpan');
  report.check('Kembali ke list Users', page.url().includes('SystemUsers'));
  report.check(
    `Username "${username}" TIDAK muncul di list`,
    !(await adminUsersPage.rowByUsername(username).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
