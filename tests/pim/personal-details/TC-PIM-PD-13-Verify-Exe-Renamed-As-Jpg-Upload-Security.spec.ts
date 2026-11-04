/**
 * ================================================================================
 * TC-PIM-PD-13: Verify Exe Renamed As Jpg Upload Security
 * Modul    : PIM - Personal Details
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-13-Verify-Exe-Renamed-As-Jpg-Upload-Security.spec.ts
 * Path     : tests/pim/personal-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Konfirmasi apakah bug di TC-PIM-ADD-28 (upload foto Add Employee
 *   cuma validasi ekstensi, bukan konten) berulang di titik upload foto
 *   YANG BERBEDA: re-upload foto dari halaman Personal Details (bukan
 *   saat create employee baru). Kedua form tampak serupa tapi bisa saja
 *   dirender komponen berbeda dengan validasi berbeda, jadi tetap perlu
 *   diverifikasi live, bukan diasumsikan sama.
 *
 * [POLA UI] Berbeda dari Add Employee, <input type="file"> di Personal
 *   Details TIDAK melekat ke DOM sampai foto (img.employee-image) diklik
 *   dulu (dikonfirmasi live: count 0 sebelum klik, 1 sesudah). Pakai
 *   PersonalDetailsPage.revealFileInput() untuk ini.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/personal-details/TC-PIM-PD-13-Verify-Exe-Renamed-As-Jpg-Upload-Security.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-PIM-PD-13: re-uploading an exe renamed to .jpg from Personal Details', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-PD-13', 'Exe Renamed As Jpg Upload Security', env.baseURL, page);

  report.step('Buat employee baru (retry otomatis kalau Employee Id collide), navigate ke Personal Details');
  await createTestEmployee(page, addEmployeePage, 'QaPdExeAsJpg');
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();

  report.step('Klik foto profil untuk reveal file input, lalu upload file executable yang di-rename jadi .jpg');
  await personalDetailsPage.revealFileInput();
  await personalDetailsPage.fileInput.setInputFiles({
    name: 'reupload-spoofed.jpg',
    mimeType: 'image/jpeg',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(500);
  const errorAfterSelect = await page.locator('.oxd-input-group .oxd-text--span').first().textContent({ timeout: 2_000 }).catch(() => null);

  report.step('Verify: file executable yang di-rename .jpg seharusnya ditolak dengan pesan error');
  const wasRejected = errorAfterSelect !== null && /not allowed|invalid/i.test(errorAfterSelect);
  report.check(
    'File executable yang di-rename .jpg ditolak dengan pesan error',
    wasRejected,
    `errorAfterSelect=${errorAfterSelect ?? 'tidak ada error, file diterima begitu saja'}`,
  );

  report.print();
});
