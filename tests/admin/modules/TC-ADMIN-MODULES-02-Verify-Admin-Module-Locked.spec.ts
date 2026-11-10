/**
 * ================================================================================
 * TC-ADMIN-MODULES-02: Verify Admin Module Is Locked
 * Modul    : Admin - Configuration - Modules
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-MODULES-02-Verify-Admin-Module-Locked.spec.ts
 * Path     : tests/admin/modules/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi switch "Admin Module" ter-disable (tidak bisa
 *   di-toggle) -- aplikasi sendiri mengunci module ini supaya admin
 *   tidak bisa mengunci diri sendiri keluar dari Admin. [VALIDATE-ONLY]
 *   TC ini TIDAK PERNAH klik Save.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/modules/TC-ADMIN-MODULES-02-Verify-Admin-Module-Locked.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-MODULES-02: Admin Module switch is disabled (self-lock) [VALIDATE-ONLY]', async ({
  page,
  adminModulesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-MODULES-02', 'Verify Admin Module Locked', env.baseURL, page);
  const mo = adminModulesPage;

  report.step('Buka Modules, cek switch Admin Module');
  await mo.goto();
  const adminRow = mo.rowByLabel('Admin Module');
  const adminSwitch = mo.switchInput(adminRow);

  report.step('Verify switch Admin Module disabled dan checked (enabled, tidak bisa diubah)');
  report.check('Switch Admin Module ter-disable', await adminSwitch.isDisabled());
  report.check('Switch Admin Module dalam state checked/enabled', await adminSwitch.isChecked());

  report.print();
});
