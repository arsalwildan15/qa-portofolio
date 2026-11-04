/**
 * ================================================================================
 * TC-PIM-LIST-07 — Verify Sort Column Ascending Descending
 * Modul    : PIM - Employee List
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-07-Verify-Sort-Column-Ascending-Descending.spec.ts
 * Path     : tests/pim/employee-list/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi sort kolom "Id" (Ascending dan Descending) mengubah
 *   sortOrder pada request GET /api/v2/pim/employees sesuai yang dipilih.
 *
 * [RESOLVED] Sebelumnya TC ini didokumentasikan sebagai finding karena
 *   elemen pemicu sort belum teridentifikasi. Dikonfirmasi live: sort
 *   BUKAN klik langsung pada header cell/teks, melainkan klik ikon kecil
 *   `.oxd-table-header-sort-icon` (panah atas-bawah) yang membuka dropdown
 *   berisi opsi "Ascending"/"Descending" eksplisit. Lihat
 *   EmployeeListPage.sortByColumn().
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/employee-list/TC-PIM-LIST-07-Verify-Sort-Column-Ascending-Descending.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PIM-LIST-07: sorting the Id column toggles sort order between Ascending and Descending', async ({
  page,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-LIST-07', 'Sort Column Ascending Descending', env.baseURL, page);

  report.step('Navigate ke Employee List, klik ikon sort kolom "Id" (index 1), pilih "Ascending"');
  await employeeListPage.goto();
  await page.waitForTimeout(1000);

  const [ascResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.url().includes('sortField')),
    employeeListPage.sortByColumn(1, 'Ascending'),
  ]);
  const ascOrder = new URL(ascResp.url()).searchParams.get('sortOrder');
  await page.waitForTimeout(800); // let the table/header re-render settle before sorting again

  report.step('Pilih sort "Descending" pada kolom yang sama');
  const [descResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.url().includes('sortField')),
    employeeListPage.sortByColumn(1, 'Descending'),
  ]);
  const descOrder = new URL(descResp.url()).searchParams.get('sortOrder');

  report.step('Verify: sortOrder berubah sesuai pilihan (ASC lalu DESC)');
  report.check('sortOrder === "ASC" setelah pilih Ascending', ascOrder === 'ASC', `sortOrder=${ascOrder}`);
  report.check('sortOrder === "DESC" setelah pilih Descending', descOrder === 'DESC', `sortOrder=${descOrder}`);

  report.print();
});
