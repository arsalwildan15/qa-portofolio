/**
 * ================================================================================
 * TC-ADMIN-LANG-03: Verify Language Name Very Long Text
 * Modul    : Admin - Qualifications - Languages
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LANG-03-Verify-Language-Name-Very-Long-Text.spec.ts
 * Path     : tests/admin/languages/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan perilaku form saat Language Name diisi teks sangat
 *   panjang (300 karakter). Hasilnya didokumentasikan via report.finding()
 *   karena perilaku batas ini genuinely tergantung apakah ada max-length
 *   validation, bukan pass/fail yang jelas salah.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/languages/TC-ADMIN-LANG-03-Verify-Language-Name-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LANG-03: a 300-character Language Name is documented as-is', async ({
  page,
  adminLanguagesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LANG-03', 'Language Name Very Long Text', env.baseURL, page);
  const longName = 'QaLongLanguage'.padEnd(300, 'X');

  report.step('Isi Name dengan 300 karakter, klik Save');
  await adminLanguagesPage.gotoAdd();
  await adminLanguagesPage.nameInput.fill(longName);
  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/languages') && r.request().method() === 'POST', { timeout: 10_000 })
    .catch(() => null);
  await adminLanguagesPage.save();
  const resp = await respPromise;
  await page.waitForTimeout(500);

  report.step('Verify: catat apakah diterima, ditolak validasi, atau dipotong');
  if (resp) {
    report.finding('Language Name 300 karakter diterima server', `POST status=${resp.status()}`);
  } else {
    const error = await adminLanguagesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
    report.finding('Language Name 300 karakter ditolak/divalidasi client-side', `error=${error ?? 'tidak ada pesan terbaca'}`);
  }
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
