/**
 * ================================================================================
 * TC-ADMIN-MODULES-04: Verify Toggle Not Saved Without Save
 * Modul    : Admin - Configuration - Modules
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-MODULES-04-Verify-Toggle-Not-Saved-Without-Save.spec.ts
 * Path     : tests/admin/modules/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi men-toggle switch "Buzz" secara client-side TANPA klik
 *   Save tidak mengubah state di server, dan TIDAK ADA POST/PUT yang
 *   terkirim ke server sama sekali selama TC ini berjalan.
 *
 *   [SAFETY CONSTRAINT -- PENTING] Men-disable module apa pun di screen
 *   ini akan menghilangkannya dari sidebar SEMUA user demo publik ini.
 *   TC ini SENGAJA TIDAK PERNAH klik Save -- toggle switch cuma diubah
 *   secara visual (client-side state Vue), lalu dibuktikan tidak
 *   ter-persist lewat reload dan lewat network listener yang mencatat
 *   SEMUA request selama test berjalan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/modules/TC-ADMIN-MODULES-04-Verify-Toggle-Not-Saved-Without-Save.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-MODULES-04: toggling Buzz switch without Save never persists or fires a request [VALIDATE-ONLY]', async ({
  page,
  adminModulesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-MODULES-04', 'Verify Toggle Not Saved Without Save', env.baseURL, page);
  const mo = adminModulesPage;

  const mutatingRequests: string[] = [];
  page.on('request', (r) => {
    if (['POST', 'PUT'].includes(r.method())) mutatingRequests.push(`${r.method()} ${r.url()}`);
  });

  report.step('Buka Modules, klik switch Buzz (TIDAK klik Save)');
  await mo.goto();
  const buzzRow = mo.rowByLabel('Buzz');
  const buzzSwitch = mo.switchInput(buzzRow);
  const originalChecked = await buzzSwitch.isChecked();
  await buzzSwitch.click({ force: true });
  await page.waitForTimeout(500);
  const afterClickChecked = await buzzSwitch.isChecked();
  report.finding('Efek klik switch Buzz secara visual (belum Save)', `original=${originalChecked} afterClick=${afterClickChecked}`);

  report.step('Reload halaman TANPA klik Save, verify state kembali ke semula dan tidak ada POST/PUT terkirim');
  await mo.goto();
  const afterReloadChecked = await mo.switchInput(mo.rowByLabel('Buzz')).isChecked();
  report.check('State Buzz di server TIDAK berubah (Save tidak pernah diklik)', afterReloadChecked === originalChecked, `original=${originalChecked} afterReload=${afterReloadChecked}`);
  report.check('TIDAK ADA POST/PUT terkirim ke server sepanjang TC ini', mutatingRequests.length === 0, `requests=${JSON.stringify(mutatingRequests)}`);

  report.print();
});
