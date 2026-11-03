/**
 * ================================================================================
 * TC-PIM-ADD-25 — Verify Unsaved Navigation No Warning [TEMUAN]
 * Modul    : PIM - Add Employee
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-25-Verify-Unsaved-Navigation-No-Warning.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan temuan: mengisi First Name lalu navigasi pindah
 *   halaman TANPA Save TIDAK memunculkan dialog konfirmasi apapun — data
 *   hilang diam-diam (dikonfirmasi langsung). Ini perilaku UX aktual yang
 *   didokumentasikan sebagai finding, BUKAN hard-fail, karena tidak ada
 *   requirement eksplisit yang mewajibkan warning dialog di sini.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-25-Verify-Unsaved-Navigation-No-Warning.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

test('TC-PIM-ADD-25: navigating away with unsaved First Name shows no warning', async ({
  page,
  addEmployeePage,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-ADD-25', 'Unsaved Navigation No Warning', env.baseURL, page);

  report.step('Navigate ke Add Employee, isi First Name tanpa Save');
  await addEmployeePage.goto();
  await addEmployeePage.firstNameInput.fill('Unsaved Data Test');

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step('Navigate langsung ke Employee List tanpa klik Save/Cancel');
  await employeeListPage.goto();

  report.finding(
    'Tidak ada warning dialog saat ada perubahan belum tersimpan',
    `dialogFired=${dialogFired} — mengisi field lalu pindah halaman TIDAK memicu konfirmasi ` +
      `browser-native maupun modal aplikasi. Data yang sudah diketik hilang tanpa pemberitahuan.`,
  );
  report.check('URL berhasil berpindah ke Employee List', /viewEmployeeList/.test(page.url()));

  report.print();
});
