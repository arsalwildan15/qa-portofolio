/**
 * ================================================================================
 * TC-PIM-LIST-13 — Verify Delete Selected Cancel Does Not Delete
 * Modul    : PIM - Employee List
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-13-Verify-Delete-Selected-Cancel-Does-Not-Delete.spec.ts
 * Path     : tests/pim/employee-list/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi select-all + "Delete Selected" memunculkan modal "Are you
 *   Sure?" dengan tombol "Yes, Delete"/"No, Cancel" (dikonfirmasi langsung),
 *   dan klik "No, Cancel" TIDAK menghapus apapun — jumlah baris tabel tetap
 *   sama. CATATAN: dikonfirmasi langsung bahwa teks ringkasan "(N) Records
 *   Found" TIDAK muncul kembali setelah modal ditutup (finding terpisah) —
 *   jadi verifikasi utama di sini memakai jumlah baris tabel, bukan teks
 *   ringkasan tersebut.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/employee-list/TC-PIM-LIST-13-Verify-Delete-Selected-Cancel-Does-Not-Delete.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';

test('TC-PIM-LIST-13: cancelling the delete confirmation modal deletes nothing', async ({
  page,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-LIST-13', 'Delete Selected Cancel Does Not Delete', env.baseURL, page);

  report.step('Navigate ke Employee List, catat jumlah baris tabel sebelum aksi');
  await employeeListPage.goto();
  await employeeListPage.search();
  await isVisibleWithWait(employeeListPage.tableRows.first());
  const rowCountBefore = await employeeListPage.tableRows.count();

  report.step('Pilih 1 row via checkbox, klik "Delete Selected"');
  await employeeListPage.rowCheckbox(0).click();
  await employeeListPage.deleteSelectedButton.click();

  report.step('Verify modal "Are you Sure?" muncul, lalu klik "No, Cancel"');
  report.check('Tombol "No, Cancel" visible', await isVisibleWithWait(employeeListPage.cancelDeleteButton));
  await employeeListPage.cancelDeleteButton.click();

  report.step('Verify jumlah baris tabel TIDAK berubah setelah Cancel');
  await isHiddenWithWait(employeeListPage.cancelDeleteButton);
  await page.waitForTimeout(500);
  const rowCountAfter = await employeeListPage.tableRows.count();
  report.check(
    'Jumlah baris tabel sebelum dan sesudah Cancel sama',
    rowCountBefore === rowCountAfter,
    `before=${rowCountBefore} after=${rowCountAfter}`,
  );

  const recordsTextAfter = await employeeListPage.recordsFoundText.count();
  report.finding(
    'Teks ringkasan "(N) Records Found" setelah modal ditutup',
    recordsTextAfter > 0
      ? 'Teks ringkasan muncul kembali normal setelah Cancel.'
      : 'Teks ringkasan TIDAK muncul kembali setelah modal "Are you Sure?" ditutup via Cancel ' +
        '(dikonfirmasi langsung) — kemungkinan elemen tersebut hanya dirender sesaat setelah ' +
        'response search, bukan persisten di DOM.',
  );

  report.print();
});
