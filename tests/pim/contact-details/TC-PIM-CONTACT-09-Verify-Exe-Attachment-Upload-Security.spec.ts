/**
 * ================================================================================
 * TC-PIM-CONTACT-09: Verify Exe Attachment Upload Security
 * Modul    : PIM - Contact Details
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CONTACT-09-Verify-Exe-Attachment-Upload-Security.spec.ts
 * Path     : tests/pim/contact-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Konfirmasi apakah bug di TC-PIM-ADD-28 (upload foto cuma validasi
 *   ekstensi, bukan konten) berulang di titik upload YANG BERBEDA JENIS:
 *   section Attachments (upload dokumen generik, bukan foto profil).
 *   Attachments dan foto profil kemungkinan pakai komponen upload yang
 *   berbeda dengan aturan tipe file yang berbeda pula (Attachments
 *   biasanya terima banyak jenis dokumen, bukan cuma gambar), jadi
 *   tetap perlu diverifikasi live, bukan diasumsikan sama polanya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/contact-details/TC-PIM-CONTACT-09-Verify-Exe-Attachment-Upload-Security.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-PIM-CONTACT-09: an executable uploaded via the Attachments section', async ({
  page,
  addEmployeePage,
  contactDetailsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CONTACT-09', 'Exe Attachment Upload Security', env.baseURL, page);

  report.step('Buat employee baru (retry otomatis kalau Employee Id collide), navigate ke Contact Details');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaContactExe');
  await contactDetailsPage.goto(empNumber);

  report.step('Klik "+ Add" di section Attachments, upload file executable dengan nama "document.exe"');
  await contactDetailsPage.attachmentsAddButton.click();
  await page.waitForTimeout(1000);
  const fileInput = page.locator('input[type="file"]').last();
  await fileInput.setInputFiles({
    name: 'document.exe',
    mimeType: 'application/octet-stream',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(500);
  const errorAfterSelect = await page.locator('.oxd-input-group .oxd-text--span').first().textContent({ timeout: 2_000 }).catch(() => null);

  report.step('Verify: coba Save attachment, cek apakah ditolak');
  let uploadRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/attachment')) uploadRequestFired = true;
  });
  await page.getByRole('button', { name: 'Save' }).last().click();
  await page.waitForTimeout(1500);

  const wasRejected = (errorAfterSelect !== null && /not allowed|invalid/i.test(errorAfterSelect)) || !uploadRequestFired;
  report.check(
    'File executable "document.exe" ditolak oleh Attachments (error terlihat ATAU tidak ada POST attachment)',
    wasRejected,
    `errorAfterSelect=${errorAfterSelect ?? 'tidak ada'}, uploadRequestFired=${uploadRequestFired}`,
  );

  report.print();
});
