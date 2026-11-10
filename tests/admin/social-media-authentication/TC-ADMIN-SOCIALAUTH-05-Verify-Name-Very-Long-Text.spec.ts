/**
 * ================================================================================
 * TC-ADMIN-SOCIALAUTH-05: Verify Name Very Long Text
 * Modul    : Admin - Configuration - Social Media Authentication
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SOCIALAUTH-05-Verify-Name-Very-Long-Text.spec.ts
 * Path     : tests/admin/social-media-authentication/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan perilaku Name 300 karakter di form Add Provider --
 *   [VALIDATE-ONLY, PENTING]. TC ini TIDAK PERNAH klik Save (lihat
 *   SAFETY CONSTRAINT di AdminSocialMediaAuthPage); hanya mengisi field
 *   dan mengecek validasi on-blur, lalu Cancel.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/social-media-authentication/TC-ADMIN-SOCIALAUTH-05-Verify-Name-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-SOCIALAUTH-05: 300-char Name is documented via on-blur check, never saved [VALIDATE-ONLY]', async ({
  page,
  adminSocialMediaAuthPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-SOCIALAUTH-05', 'Verify Name Very Long Text', env.baseURL, page);
  const sa = adminSocialMediaAuthPage;
  const longName = 'A'.repeat(300);

  report.step('Buka Social Media Authentication, klik Add, isi Name 300 karakter (TIDAK klik Save)');
  await sa.goto();
  await sa.addButton.click();
  await page.waitForTimeout(800);
  await sa.nameInput.fill(longName);
  await sa.nameInput.blur();
  await page.waitForTimeout(500);

  report.step('Catat apakah ada validasi length on-blur, lalu Cancel TANPA Save');
  const errorText = await sa.fieldErrors.first().textContent({ timeout: 1_500 }).catch(() => null);
  report.finding(
    'Validasi on-blur untuk Name 300 karakter (tanpa Save)',
    (errorText ?? '').trim().length > 0 ? `Ada pesan error on-blur: "${errorText}"` : 'TIDAK ADA pesan error on-blur sebelum Save -- SENGAJA tidak dites sampai Save karena SAFETY CONSTRAINT di screen ini.',
  );
  report.check('TC dijalankan tanpa exception', true);

  await sa.cancelButton.click().catch(() => {});

  report.print();
});
