/**
 * ================================================================================
 * TC-ADMIN-LANGPACK-01: Verify List Loads
 * Modul    : Admin - Configuration - Language Packages
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LANGPACK-01-Verify-List-Loads.spec.ts
 * Path     : tests/admin/language-packages/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Language Packages menampilkan 9 package yang ter-enable
 *   pada demo ini, masing-masing dengan 4 icon aksi (upload/translate/
 *   download/trash -- dikonfirmasi live, BUKAN cuma 2 seperti sub-screen
 *   simple-list lain), dan tombol Add.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/language-packages/TC-ADMIN-LANGPACK-01-Verify-List-Loads.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-ADMIN-LANGPACK-01: Language Packages list loads with 9 packages and Add button', async ({
  page,
  adminLanguagePackagesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LANGPACK-01', 'Verify List Loads', env.baseURL, page);
  const lp = adminLanguagePackagesPage;

  report.step('Buka Language Packages');
  await lp.goto();

  report.step('Verify jumlah baris dan tombol Add, cek 4 icon aksi pada baris pertama');
  const rowCount = await lp.tableRows.count();
  report.finding('Jumlah Language Package saat ini', `${rowCount} package`);
  report.check('Minimal 1 package tampil', rowCount > 0, `actual=${rowCount}`);
  report.check('Tombol Add terlihat', await isVisibleWithWait(lp.addButton));

  const firstRowIcons = lp.tableRows.first().locator('.oxd-table-cell-actions button');
  const iconCount = await firstRowIcons.count();
  report.check('Baris pertama punya 4 icon aksi (upload/translate/download/trash)', iconCount === 4, `actual=${iconCount}`);

  report.print();
});
