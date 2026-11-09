/**
 * ================================================================================
 * TC-ADMIN-ORGGI-04: Verify XSS In Organization Name
 * Modul    : Admin - Organization - General Information
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-ORGGI-04-Verify-XSS-In-Organization-Name.spec.ts
 * Path     : tests/admin/general-information/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS (`<script>alert('xss')</script>`) di
 *   Organization Name tidak tereksekusi sebagai script setelah disimpan
 *   dan direload (payload harus muncul sebagai teks biasa, bukan
 *   menjalankan alert/dialog).
 *
 *   [SAFETY] Organization Name adalah field GLOBAL yang dilihat semua
 *   user demo publik. TC ini mengembalikan nilai ke semula di akhir test.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/general-information/TC-ADMIN-ORGGI-04-Verify-XSS-In-Organization-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-ORGGI-04: an XSS payload in Organization Name is not executed after save/reload', async ({
  page,
  adminGeneralInformationPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-ORGGI-04', 'XSS In Organization Name', env.baseURL, page);
  const gi = adminGeneralInformationPage;
  const xssPayload = `<script>window.__xss=true</script>`;

  report.step('Buka General Information, snapshot nilai asli, toggle Edit, isi Organization Name dengan payload XSS, Save');
  await gi.goto();
  const original = await gi.snapshot();
  await gi.enableEdit();
  await gi.organizationNameInput.fill(xssPayload);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/organization') && r.request().method() === 'PUT', { timeout: 8_000 }).catch(() => null),
    gi.save(),
  ]);
  await page.waitForTimeout(1000);

  report.step('Verify: tidak ada eksekusi script (window.__xss tidak ter-set) setelah reload');
  await gi.goto();
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xss?: boolean }).__xss === true)
    .catch(() => false);
  report.check('Payload XSS TIDAK tereksekusi sebagai script', xssExecuted === false);

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
