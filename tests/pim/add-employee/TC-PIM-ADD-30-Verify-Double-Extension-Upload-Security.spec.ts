/**
 * ================================================================================
 * TC-PIM-ADD-30: Verify Double Extension Upload Security
 * Modul    : PIM - Add Employee
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-30-Verify-Double-Extension-Upload-Security.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Variasi teknik bypass lain dari TC-PIM-ADD-28: nama file dengan
 *   DOUBLE EXTENSION ("photo.jpg.exe", ekstensi TERAKHIR tetap .exe).
 *   Teknik ini menguji apakah validator cuma cek SUBSTRING ".jpg" di
 *   nama file (yang akan ketipu), bukan ekstensi TERAKHIR yang
 *   sebenarnya menentukan bagaimana OS membuka file tsb.
 *
 *   Test ini SENGAJA dibiarkan FAILED (bukan test.fail()) kalau memang
 *   lolos, supaya temuannya tercatat di docs/Bug-List.xlsx.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-30-Verify-Double-Extension-Upload-Security.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-PIM-ADD-30: a file named "photo.jpg.exe" (double extension) is handled by the upload validator', async ({
  page,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-ADD-30', 'Double Extension Upload Security', env.baseURL, page);
  const employee = uniqueEmployeeName('QaDoubleExt');

  report.step('Isi nama employee, upload file "photo.jpg.exe" (ekstensi terakhir .exe)');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.fileInput.setInputFiles({
    name: 'photo.jpg.exe',
    mimeType: 'application/octet-stream',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(500);

  const errorAfterSelect = await page.locator('.oxd-input-group .oxd-text--span').first().textContent({ timeout: 2_000 }).catch(() => null);
  report.step('Verify: cek error setelah pilih file (ekstensi akhir .exe seharusnya ditolak seperti TC-PIM-ADD-31)');
  report.check(
    'Validator menolak berdasarkan ekstensi TERAKHIR (.exe), bukan tertipu substring ".jpg"',
    errorAfterSelect !== null && /not allowed|invalid/i.test(errorAfterSelect),
    `errorAfterSelect=${errorAfterSelect ?? 'tidak ada error, file diterima'}`,
  );

  report.print();
});
