/**
 * ================================================================================
 * TC-ADMIN-EMAILCONFIG-02: Verify Empty Mail Sent As Validation
 * Modul    : Admin - Configuration - Email Configuration
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMAILCONFIG-02-Verify-Empty-Mail-Sent-As-Validation.spec.ts
 * Path     : tests/admin/email-configuration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengosongkan Mail Sent As (required) memunculkan
 *   validasi "Required" on-blur -- [VALIDATE-ONLY, PENTING].
 *
 *   [SAFETY] Mail Sent As DIKONFIRMASI punya validasi on-blur yang benar
 *   (pesan "Required" muncul), tapi screen ini TETAP diperlakukan
 *   validate-only by policy karena mengatur SMTP global demo publik ini
 *   -- TC ini SENGAJA TIDAK PERNAH klik Save sama sekali, konsisten
 *   dengan screen HIGH-RISK lain di suite ini (Corporate Branding/LDAP/
 *   Modules/dst). Field dikosongkan, validasi on-blur dicek, lalu halaman
 *   di-reload TANPA Save untuk membuktikan tidak ada perubahan
 *   ter-persist.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/email-configuration/TC-ADMIN-EMAILCONFIG-02-Verify-Empty-Mail-Sent-As-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-EMAILCONFIG-02: emptying Mail Sent As is never saved [VALIDATE-ONLY]', async ({
  page,
  adminEmailConfigurationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-EMAILCONFIG-02', 'Verify Empty Mail Sent As Validation', env.baseURL, page);
  const ec = adminEmailConfigurationPage;

  report.step('Buka Email Configuration, catat nilai asli, kosongkan Mail Sent As (TIDAK klik Save)');
  await ec.goto();
  const originalValue = await ec.snapshotMailSentAs();
  await ec.mailSentAsInput.fill('');
  await ec.mailSentAsInput.blur();
  await page.waitForTimeout(800);

  report.step('Catat apakah ada validasi Required on-blur TANPA Save');
  const errorText = await ec.fieldErrors.first().textContent({ timeout: 1_500 }).catch(() => null);
  const validationShown = (errorText ?? '').trim().length > 0;
  report.check('Pesan error "Required" muncul on-blur', validationShown, `error="${errorText}"`);

  report.step('[SAFETY] Reload TANPA Save, verify nilai server tidak berubah');
  await ec.goto();
  const afterReload = await ec.snapshotMailSentAs();
  report.check('Mail Sent As di server TIDAK berubah (Save tidak pernah diklik)', afterReload === originalValue, `expected="${originalValue}" actual="${afterReload}"`);

  report.print();
});
