/**
 * ================================================================================
 * TC-PIM-ADD-28: Verify Exe Renamed As Jpg Upload Security
 * Modul    : PIM - Add Employee
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-28-Verify-Exe-Renamed-As-Jpg-Upload-Security.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan bug security nyata: file upload foto profil cuma
 *   memvalidasi EKSTENSI nama file, bukan konten/magic bytes file itu
 *   sendiri. File executable (header PE "MZ") yang di-rename jadi .jpg
 *   LOLOS validasi tanpa error, dan berhasil tersimpan via POST
 *   /api/v2/pim/employees (dikonfirmasi live: status 200, employee
 *   tersimpan dengan "foto" yang sebenarnya file executable). Bandingkan
 *   dengan TC-PIM-ADD-31 yang membuktikan file .exe dengan ekstensi ASLI
 *   memang ditolak, jadi ini murni soal validasi ekstensi yang bisa
 *   di-bypass dengan rename, bukan validasi yang sama sekali tidak ada.
 *
 *   Test ini SENGAJA dibiarkan FAILED (bukan test.fail()) karena ini
 *   temuan sah yang layak masuk docs/Bug-List.xlsx.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-28-Verify-Exe-Renamed-As-Jpg-Upload-Security.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

// Minimal PE header bytes ("MZ...") — identifies as a real Windows executable,
// not a disguised text file. Harmless payload, just enough to be a genuine exe.
const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-PIM-ADD-28: an executable renamed to .jpg is accepted as a profile photo', async ({
  page,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-ADD-28', 'Exe Renamed As Jpg Upload Security', env.baseURL, page);
  const employee = uniqueEmployeeName('QaExeAsJpg');

  report.step('Isi nama employee, upload file executable yang di-rename jadi .jpg');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.fileInput.setInputFiles({
    name: 'photo-spoofed.jpg',
    mimeType: 'image/jpeg',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(500);

  // Explicit short timeout: this locator matches zero elements when (as
  // expected for this bug) no validation error appears, and textContent()
  // with no timeout auto-retries against a zero-match locator for the full
  // default ~30s before giving up, eating most of the test's time budget.
  const errorAfterSelect = await page
    .locator('.oxd-input-group .oxd-text--span')
    .first()
    .textContent({ timeout: 2_000 })
    .catch(() => null);
  report.step('Verify: tidak ada error setelah pilih file, lalu coba Save (retry kalau Employee Id collide)');

  // Only re-click Save when a CONFIRMED Employee Id collision is visible,
  // never on a bare response-wait timeout: retrying blindly risks a second
  // click landing mid-navigation from a first click whose response was just
  // slow (not failed), which closes the page mid-action.
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
        '[BUG] File executable yang di-rename .jpg SEHARUSNYA ditolak, tapi diterima (POST 200)',
        false,
        `status=${resp.status()}, selectError=${errorAfterSelect ?? 'tidak ada'}`,
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
