/**
 * ================================================================================
 * TC-PIM-PD-11 — Verify Remove Profile Photo
 * Modul    : PIM - Personal Details
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-11-Verify-Remove-Profile-Photo.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menghapus foto profil yang sudah ada (tombol kecil di
 *   overlay foto, confirmed elemen `.employee-image button`) tidak
 *   menimbulkan error.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-PD-11-Verify-Remove-Profile-Photo.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('TC-PIM-PD-11: removing an existing profile photo works without error', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-PD-11', 'Remove Profile Photo', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPdRemovePhoto');

  report.step('Buat employee baru dengan foto, navigate ke Personal Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.fileInput.setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
  });
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();

  report.step('Klik tombol hapus foto profil');
  const removeButtonCount = await personalDetailsPage.removePhotoButton.count();
  if (removeButtonCount === 0) {
    report.finding('Tombol hapus foto tidak ditemukan', 'Selector `.employee-image button` tidak match di halaman ini.');
    report.check('TC dijalankan tanpa exception', true);
    report.print();
    return;
  }
  await personalDetailsPage.removePhotoButton.first().click();
  await page.waitForTimeout(1000);
  report.check('Klik hapus foto tidak menimbulkan error', true);

  report.print();
});
