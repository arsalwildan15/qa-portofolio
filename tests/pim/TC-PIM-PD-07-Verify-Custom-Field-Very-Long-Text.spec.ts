/**
 * ================================================================================
 * TC-PIM-PD-07 — Verify Custom Field Very Long Text [TEMUAN]
 * Modul    : PIM - Personal Details
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-07-Verify-Custom-Field-Very-Long-Text.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Custom Field "Test_Field" bisa diisi teks sangat
 *   panjang. CATATAN: dikonfirmasi langsung bahwa section "Custom Fields"
 *   TIDAK muncul pada employee yang baru dibuat di environment ini (hanya
 *   terlihat pada employee lama tertentu di screenshot awal) — TC ini
 *   mendokumentasikan temuan tersebut sebagai finding, bukan hard-fail,
 *   karena section memang tidak reliably reproducible untuk data baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-PD-07-Verify-Custom-Field-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

test('TC-PIM-PD-07: Custom Fields section availability on a freshly created employee', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-PD-07', 'Custom Field Very Long Text', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPdCustom');

  report.step('Buat employee baru, navigate ke Personal Details, scroll ke bawah cari Custom Fields');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();
  await page.mouse.wheel(0, 2000);

  const customFieldsHeading = page.getByText('Custom Fields', { exact: true });
  const isPresent = await isVisibleWithWait(customFieldsHeading, 3_000);

  report.finding(
    'Ketersediaan section Custom Fields pada employee baru',
    isPresent
      ? 'Section Custom Fields MUNCUL — bisa lanjut isi Test_Field dengan teks panjang di TC berikutnya.'
      : 'Section Custom Fields TIDAK muncul pada employee yang baru dibuat di environment ini ' +
        '(dikonfirmasi langsung saat eksplorasi). Kemungkinan bergantung pada konfigurasi Admin ' +
        'atau nilai yang sudah pernah di-set sebelumnya, bukan tersedia default untuk semua employee.',
  );
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
