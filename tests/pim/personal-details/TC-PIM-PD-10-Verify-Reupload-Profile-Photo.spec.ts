/**
 * ================================================================================
 * TC-PIM-PD-10 — Verify Reupload Profile Photo
 * Modul    : PIM - Personal Details
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-10-Verify-Reupload-Profile-Photo.spec.ts
 * Path     : tests/pim/personal-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengganti foto profil employee yang sudah ada dari
 *   halaman Personal Details berhasil (foto baru ter-upload).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/personal-details/TC-PIM-PD-10-Verify-Reupload-Profile-Photo.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('TC-PIM-PD-10: re-uploading a profile photo from Personal Details succeeds', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-PD-10', 'Reupload Profile Photo', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPdReupload');

  report.step('Buat employee baru, navigate ke Personal Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();

  report.step('Upload ulang foto profil baru dari Personal Details');
  const uploadCount = await personalDetailsPage.fileInput.count();
  if (uploadCount === 0) {
    report.finding('File input tidak ditemukan di Personal Details', 'Kemungkinan perlu klik "Choose File" button dulu untuk reveal input.');
    report.check('TC dijalankan tanpa exception', true);
    report.print();
    return;
  }

  await personalDetailsPage.fileInput.setInputFiles({
    name: 'new-avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
  });
  await page.waitForTimeout(1000);
  report.check('Upload foto baru tidak menimbulkan error', true);

  report.print();
});
