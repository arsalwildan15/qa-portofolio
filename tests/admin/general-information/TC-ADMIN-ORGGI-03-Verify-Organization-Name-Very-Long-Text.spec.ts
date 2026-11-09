/**
 * ================================================================================
 * TC-ADMIN-ORGGI-03: Verify Organization Name Very Long Text
 * Modul    : Admin - Organization - General Information
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-ORGGI-03-Verify-Organization-Name-Very-Long-Text.spec.ts
 * Path     : tests/admin/general-information/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan perilaku saat Organization Name diisi 300 karakter
 *   (sama pola boundary dengan TC-ADMIN-JOBTITLE-03). Hasil (diterima apa
 *   adanya / ditolak / terpotong) dicatat via finding(), BUKAN hard
 *   check, karena belum ada ekspektasi batas panjang yang dikonfirmasi
 *   untuk field ini.
 *
 *   [SAFETY] Organization Name adalah field GLOBAL yang dilihat semua
 *   user demo publik. TC ini mengembalikan nilai ke semula di akhir test
 *   apa pun hasilnya (lihat restore()).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/general-information/TC-ADMIN-ORGGI-03-Verify-Organization-Name-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-ORGGI-03: a 300-character Organization Name is documented as-is', async ({
  page,
  adminGeneralInformationPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-ORGGI-03', 'Organization Name Very Long Text', env.baseURL, page);
  const gi = adminGeneralInformationPage;
  const longName = 'B'.repeat(300);

  report.step('Buka General Information, snapshot nilai asli, toggle Edit, isi Organization Name 300 char, Save');
  await gi.goto();
  const original = await gi.snapshot();
  await gi.enableEdit();
  await gi.organizationNameInput.fill(longName);

  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/organization') && r.request().method() === 'PUT', { timeout: 8_000 })
    .catch(() => null);
  await gi.save();
  const resp = await respPromise;
  await page.waitForTimeout(1000);
  const errorText = await gi.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);

  report.step('Catat hasil apa adanya (diterima / ditolak / terpotong)');
  report.finding(
    'Organization Name 300 karakter',
    resp
      ? `PUT terkirim -> status=${resp.status()} (${resp.status() === 200 ? 'DITERIMA tanpa truncation terlihat' : 'ditolak server-side'}), errorClientSide=${errorText ?? 'tidak ada'}`
      : `TIDAK ADA PUT terkirim (ditolak client-side), errorClientSide=${errorText ?? 'tidak ada'}`,
  );
  report.check('TC dijalankan tanpa exception', true);

  report.step('Restore Organization Name ke nilai asli (shared-demo hygiene)');
  await gi.restore(original);
  const nameAfterRestore = await gi.organizationNameInput.inputValue().catch(() => '');
  report.check(
    'Organization Name berhasil dikembalikan ke nilai asli',
    nameAfterRestore === original.organizationName,
    `actual="${nameAfterRestore}"`,
  );

  report.print();
});
