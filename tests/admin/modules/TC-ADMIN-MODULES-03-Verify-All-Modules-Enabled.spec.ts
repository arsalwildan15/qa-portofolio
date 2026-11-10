/**
 * ================================================================================
 * TC-ADMIN-MODULES-03: Verify All Modules Currently Enabled
 * Modul    : Admin - Configuration - Modules
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-MODULES-03-Verify-All-Modules-Enabled.spec.ts
 * Path     : tests/admin/modules/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi (baseline, read-only) semua 11 module saat ini dalam
 *   state enabled (checked) pada demo ini. [VALIDATE-ONLY] TC ini TIDAK
 *   PERNAH klik Save.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/modules/TC-ADMIN-MODULES-03-Verify-All-Modules-Enabled.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const EXPECTED_MODULES = [
  'Admin Module',
  'Pim Module',
  'Leave Module',
  'Time Module',
  'Recruitment Module',
  'Performance Module',
  'Directory Module',
  'Maintenance Module',
  'Mobile',
  'Claim Module',
  'Buzz',
];

test('TC-ADMIN-MODULES-03: all 11 modules are currently enabled (baseline, read-only) [VALIDATE-ONLY]', async ({
  page,
  adminModulesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-MODULES-03', 'Verify All Modules Enabled', env.baseURL, page);
  const mo = adminModulesPage;

  report.step('Buka Modules, cek state checked untuk setiap module');
  await mo.goto();
  for (const label of EXPECTED_MODULES) {
    const row = mo.rowByLabel(label);
    const checked = await mo.switchInput(row).isChecked().catch(() => false);
    report.check(`Module "${label}" dalam state enabled`, checked);
  }

  report.print();
});
