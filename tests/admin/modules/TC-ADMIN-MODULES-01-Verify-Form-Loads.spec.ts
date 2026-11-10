/**
 * ================================================================================
 * TC-ADMIN-MODULES-01: Verify Form Loads
 * Modul    : Admin - Configuration - Modules
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-MODULES-01-Verify-Form-Loads.spec.ts
 * Path     : tests/admin/modules/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Modules menampilkan ke-11 module (Admin, Pim, Leave,
 *   Time, Recruitment, Performance, Directory, Maintenance, Mobile,
 *   Claim, Buzz) dengan switch masing-masing, dan tombol Save. TC ini
 *   TIDAK PERNAH klik Save -- [VALIDATE-ONLY], lihat SAFETY CONSTRAINT
 *   di AdminModulesPage.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/modules/TC-ADMIN-MODULES-01-Verify-Form-Loads.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { isVisibleWithWait } from '../../../src/utils/testReport';

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

test('TC-ADMIN-MODULES-01: Modules form loads with all 11 modules and Save button [VALIDATE-ONLY]', async ({
  page,
  adminModulesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-MODULES-01', 'Verify Form Loads', env.baseURL, page);
  const mo = adminModulesPage;

  report.step('Buka Modules');
  await mo.goto();

  report.step('Verify ke-11 module tampil dan tombol Save terlihat');
  const rowCount = await mo.moduleRows.count();
  report.check('Jumlah module = 11', rowCount === 11, `actual=${rowCount}`);
  for (const label of EXPECTED_MODULES) {
    const visible = (await mo.rowByLabel(label).count()) > 0;
    report.check(`Module "${label}" tampil`, visible);
  }
  report.check('Tombol Save terlihat', await isVisibleWithWait(mo.saveButton));

  report.print();
});
