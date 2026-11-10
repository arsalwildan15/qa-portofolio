/**
 * ================================================================================
 * TC-ADMIN-EMAILCONFIG-03: Verify XSS/Invalid-Format Payload In Mail Sent As
 * Modul    : Admin - Configuration - Email Configuration
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMAILCONFIG-03-Verify-XSS-Invalid-Format-Mail-Sent-As.spec.ts
 * Path     : tests/admin/email-configuration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS (bukan format email valid) di Mail Sent As
 *   ditolak oleh validasi format on-blur -- [VALIDATE-ONLY, PENTING].
 *
 *   [SAFETY] Mail Sent As DIKONFIRMASI punya validasi format on-blur yang
 *   benar (pesan "Expected format: admin@example.com" muncul untuk
 *   payload non-email), tapi screen ini TETAP diperlakukan validate-only
 *   by policy karena mengatur SMTP global demo publik ini -- TC ini
 *   SENGAJA TIDAK PERNAH klik Save sama sekali, konsisten dengan screen
 *   HIGH-RISK lain di suite ini. Payload diisi ke field, dicek apakah ada
 *   dialog/alert ter-trigger dan validasi format on-blur, lalu halaman
 *   di-reload TANPA Save untuk membuktikan tidak ada perubahan
 *   ter-persist.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/email-configuration/TC-ADMIN-EMAILCONFIG-03-Verify-XSS-Invalid-Format-Mail-Sent-As.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const XSS_PAYLOAD = '<script>alert(1)</script>@mail.com';

test('TC-ADMIN-EMAILCONFIG-03: XSS payload in Mail Sent As is never saved [VALIDATE-ONLY]', async ({
  page,
  adminEmailConfigurationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-EMAILCONFIG-03', 'Verify XSS Invalid Format Mail Sent As', env.baseURL, page);
  const ec = adminEmailConfigurationPage;

  let dialogFired = false;
  page.on('dialog', (d) => {
    dialogFired = true;
    void d.dismiss();
  });

  report.step('Buka Email Configuration, catat nilai asli, isi Mail Sent As dengan payload XSS (TIDAK klik Save)');
  await ec.goto();
  const originalValue = await ec.snapshotMailSentAs();
  await ec.mailSentAsInput.fill(XSS_PAYLOAD);
  await ec.mailSentAsInput.blur();
  await page.waitForTimeout(800);

  report.step('Verify tidak ada dialog/alert ter-trigger, catat apakah ada validasi format on-blur TANPA Save');
  report.check('TIDAK ADA JS alert/dialog ter-trigger', !dialogFired);
  const errorText = await ec.fieldErrors.first().textContent({ timeout: 1_500 }).catch(() => null);
  report.check('Pesan error format email muncul on-blur (payload ditolak)', (errorText ?? '').trim().length > 0, `error="${errorText}"`);

  report.step('[SAFETY] Reload TANPA Save, verify nilai server tidak berubah');
  await ec.goto();
  const afterReload = await ec.snapshotMailSentAs();
  report.check('Mail Sent As di server TIDAK berubah (Save tidak pernah diklik)', afterReload === originalValue, `expected="${originalValue}" actual="${afterReload}"`);

  report.print();
});
