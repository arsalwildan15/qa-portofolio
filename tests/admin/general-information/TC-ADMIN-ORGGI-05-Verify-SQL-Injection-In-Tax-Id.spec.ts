/**
 * ================================================================================
 * TC-ADMIN-ORGGI-05: Verify SQL Injection In Tax Id
 * Modul    : Admin - Organization - General Information
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-ORGGI-05-Verify-SQL-Injection-In-Tax-Id.spec.ts
 * Path     : tests/admin/general-information/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection (`' OR '1'='1`) di Tax ID
 *   ditangani dengan aman: tersimpan sebagai string literal apa adanya
 *   (atau ditolak), TANPA error 500/stack trace yang mengindikasikan
 *   query SQL rusak.
 *
 *   [SAFETY] TC ini mengembalikan Tax ID ke nilai semula di akhir test.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/general-information/TC-ADMIN-ORGGI-05-Verify-SQL-Injection-In-Tax-Id.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-ORGGI-05: a SQL injection payload in Tax ID is handled safely', async ({
  page,
  adminGeneralInformationPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-ORGGI-05', 'SQL Injection In Tax Id', env.baseURL, page);
  const gi = adminGeneralInformationPage;
  const sqlPayload = `' OR '1'='1`;

  report.step('Buka General Information, snapshot nilai asli, toggle Edit, isi Tax ID dengan payload SQLi, Save');
  await gi.goto();
  const original = await gi.snapshot();
  await gi.enableEdit();
  await gi.taxIdInput.fill(sqlPayload);
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/organization') && r.request().method() === 'PUT', { timeout: 8_000 }).catch(() => null),
    gi.save(),
  ]);

  report.step('Verify: tidak ada HTTP 500, dan payload tersimpan sebagai string literal setelah reload');
  report.check('Tidak ada response 500 (server error) dari PUT organization', !resp || resp.status() !== 500, `status=${resp?.status() ?? 'tidak ada response'}`);
  await gi.goto();
  const taxIdAfterReload = await gi.taxIdInput.inputValue().catch(() => '');
  report.finding(
    'Payload SQLi di Tax ID setelah reload',
    `Nilai Tax ID setelah reload: "${taxIdAfterReload}" (payload asli: "${sqlPayload}"). ` +
      (taxIdAfterReload === sqlPayload
        ? 'Tersimpan apa adanya sebagai string literal -- tidak ada indikasi query SQL rusak.'
        : 'Tidak tersimpan sama persis -- lihat STATUS di atas untuk apakah ini karena validasi/ditolak atau sebab lain.'),
  );

  report.step('Restore Tax ID ke nilai asli (shared-demo hygiene)');
  await gi.restore(original);
  const taxIdAfterRestore = await gi.taxIdInput.inputValue().catch(() => '');
  report.check('Tax ID berhasil dikembalikan ke nilai asli', taxIdAfterRestore === original.taxId, `actual="${taxIdAfterRestore}"`);

  report.print();
});
