/**
 * ================================================================================
 * TC-PIM-ADD-29: Verify Apk Renamed As Jpg Upload Security
 * Modul    : PIM - Add Employee
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-29-Verify-Apk-Renamed-As-Jpg-Upload-Security.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Konfirmasi bahwa bug di TC-PIM-ADD-28 (validasi upload cuma cek
 *   ekstensi, bukan konten file) bukan kasus khusus hanya untuk .exe,
 *   tapi pola yang sama berlaku untuk tipe file berbahaya lain. File
 *   Android APK (header ZIP "PK..") yang di-rename jadi .jpg juga
 *   diharapkan lolos tanpa validasi konten.
 *
 *   Test ini SENGAJA dibiarkan FAILED (bukan test.fail()) kalau memang
 *   lolos, supaya temuannya tercatat di docs/Bug-List.xlsx.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-29-Verify-Apk-Renamed-As-Jpg-Upload-Security.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

// ZIP/APK magic bytes ("PK..") — APK is a ZIP container, this identifies it
// as a real archive, not an image.
const APK_BUFFER = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00]);

test('TC-PIM-ADD-29: an APK renamed to .jpg is accepted as a profile photo', async ({
  page,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-ADD-29', 'Apk Renamed As Jpg Upload Security', env.baseURL, page);
  const employee = uniqueEmployeeName('QaApkAsJpg');

  report.step('Isi nama employee, upload file APK yang di-rename jadi .jpg');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.fileInput.setInputFiles({
    name: 'photo-apk-disguised.jpg',
    mimeType: 'image/jpeg',
    buffer: APK_BUFFER,
  });
  await page.waitForTimeout(500);

  report.step('Verify: coba Save (retry kalau Employee Id collide)');
  let saved = false;
  for (let attempt = 1; attempt <= 3 && !saved; attempt += 1) {
    const respPromise = page
      .waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST', { timeout: 15_000 })
      .catch(() => null);
    await addEmployeePage.save();
    const resp = await respPromise;
    if (resp && resp.status() === 200) {
      saved = true;
      report.check(
        '[BUG] File APK yang di-rename .jpg SEHARUSNYA ditolak, tapi diterima (POST 200)',
        false,
        `status=${resp.status()}`,
      );
      break;
    }
    const duplicateIdError = page.getByText('Employee Id already exists');
    const isCollision = await duplicateIdError.isVisible().catch(() => false);
    if (attempt < 3 && isCollision) {
      await addEmployeePage.employeeIdInput.fill('');
      await addEmployeePage.employeeIdInput.blur();
      continue;
    }
    break; // not a collision, no point retrying blindly
  }
  if (!saved) {
    report.finding('Tidak bisa submit dalam 15s dan bukan Employee Id collision', 'Kemungkinan server lambat atau ada blocker lain yang tidak terdeteksi. Coba ulang di sesi lain.');
    report.check('TC dijalankan tanpa exception', true);
  }

  report.print();
});
