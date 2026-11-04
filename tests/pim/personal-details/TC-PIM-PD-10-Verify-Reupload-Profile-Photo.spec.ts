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
 * [POLA UI] <input type="file"> TIDAK melekat ke DOM sampai foto
 *   (img.employee-image) diklik dulu (dikonfirmasi live: count 0 sebelum
 *   klik, 1 sesudah). Pakai PersonalDetailsPage.revealFileInput().
 *
 * [API] Save foto profil memicu PUT /api/v2/pim/employees/<N>/picture,
 *   endpoint TERPISAH dari PUT .../personal-details (yang dipakai field
 *   teks lain) — dikonfirmasi live via network listener.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/personal-details/TC-PIM-PD-10-Verify-Reupload-Profile-Photo.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('TC-PIM-PD-10: re-uploading a profile photo from Personal Details succeeds', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-PD-10', 'Reupload Profile Photo', env.baseURL, page);

  report.step('Buat employee baru (retry otomatis kalau Employee Id collide), navigate ke Personal Details');
  await createTestEmployee(page, addEmployeePage, 'QaPdReupload');
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();

  report.step('Klik foto profil untuk reveal file input, upload foto baru, lalu Save');
  await personalDetailsPage.revealFileInput();
  await personalDetailsPage.fileInput.setInputFiles({
    name: 'new-avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
  });
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/picture') && r.request().method() === 'PUT'),
    personalDetailsPage.save(),
  ]);

  report.step('Verify: PUT employees/<N>/picture berhasil');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.print();
});
