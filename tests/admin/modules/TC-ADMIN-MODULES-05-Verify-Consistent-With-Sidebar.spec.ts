/**
 * ================================================================================
 * TC-ADMIN-MODULES-05: Verify Enabled Modules Consistent With Sidebar
 * Modul    : Admin - Configuration - Modules
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-MODULES-05-Verify-Consistent-With-Sidebar.spec.ts
 * Path     : tests/admin/modules/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi (read-only cross-screen check) module yang tampil
 *   enabled di screen ini konsisten dengan menu yang tampil di sidebar
 *   navigasi (Admin, PIM, Leave, Time, Recruitment, Performance,
 *   Dashboard, Directory, Maintenance, Claim, Buzz). [VALIDATE-ONLY]
 *   TC ini TIDAK PERNAH klik Save.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/modules/TC-ADMIN-MODULES-05-Verify-Consistent-With-Sidebar.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-ADMIN-MODULES-05: enabled modules are consistent with sidebar navigation items (read-only)', async ({
  page,
  adminModulesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-MODULES-05', 'Verify Consistent With Sidebar', env.baseURL, page);
  const mo = adminModulesPage;

  report.step('Buka Dashboard, cek apakah link "Buzz" dan "Claim" tampil di sidebar');
  await page.goto('/web/index.php/dashboard/index');
  await page.waitForTimeout(1000);
  const buzzInSidebar = await isVisibleWithWait(page.getByRole('link', { name: 'Buzz', exact: true }), 5_000);
  const claimInSidebar = await isVisibleWithWait(page.getByRole('link', { name: 'Claim', exact: true }), 5_000);
  report.finding('Sidebar saat ini', `Buzz link visible=${buzzInSidebar}, Claim link visible=${claimInSidebar}`);

  report.step('Buka Modules, cek module yang enabled');
  await mo.goto();
  const buzzEnabled = await mo.switchInput(mo.rowByLabel('Buzz')).isChecked();
  const claimEnabled = await mo.switchInput(mo.rowByLabel('Claim Module')).isChecked();

  report.check('Buzz enabled di Modules -> konsisten dengan link "Buzz" muncul di sidebar', buzzEnabled === buzzInSidebar);
  report.check('Claim enabled di Modules -> konsisten dengan link "Claim" muncul di sidebar', claimEnabled === claimInSidebar);

  report.print();
});
