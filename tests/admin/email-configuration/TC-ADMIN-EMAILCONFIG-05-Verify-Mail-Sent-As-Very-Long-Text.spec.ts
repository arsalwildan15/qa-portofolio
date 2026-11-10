/**
 * ================================================================================
 * TC-ADMIN-EMAILCONFIG-05: Verify Mail Sent As Very Long Text
 * Modul    : Admin - Configuration - Email Configuration
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMAILCONFIG-05-Verify-Mail-Sent-As-Very-Long-Text.spec.ts
 * Path     : tests/admin/email-configuration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Mail Sent As 300 karakter (syntactically email valid,
 *   hanya local-part-nya sangat panjang) ditolak oleh validasi panjang
 *   on-blur ("Should not exceed 100 characters", sama pola dengan
 *   Organization Name di General Information) -- [VALIDATE-ONLY,
 *   PENTING].
 *
 *   [SAFETY] Mail Sent As DIKONFIRMASI punya validasi panjang on-blur
 *   yang benar, tapi screen ini TETAP diperlakukan validate-only by
 *   policy karena mengatur SMTP global demo publik ini -- TC ini SENGAJA
 *   TIDAK PERNAH klik Save sama sekali, konsisten dengan screen HIGH-RISK
 *   lain di suite ini (sama constraint dengan Corporate Branding: validate
 *   sampai sebelum titik commit, bukan sampai commit).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/email-configuration/TC-ADMIN-EMAILCONFIG-05-Verify-Mail-Sent-As-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-EMAILCONFIG-05: 300-char Mail Sent As is never saved [VALIDATE-ONLY]', async ({
  page,
  adminEmailConfigurationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-EMAILCONFIG-05', 'Verify Mail Sent As Very Long Text', env.baseURL, page);
  const ec = adminEmailConfigurationPage;
  const longLocal = 'a'.repeat(290);
  const longValue = `${longLocal}@mail.com`; // ~300 chars, syntactically a valid email but far beyond normal length

  report.step('Buka Email Configuration, catat nilai asli, isi Mail Sent As dengan 300 karakter (TIDAK klik Save)');
  await ec.goto();
  const originalValue = await ec.snapshotMailSentAs();
  await ec.mailSentAsInput.fill(longValue);
  await page.waitForTimeout(500);

  report.step('Catat apakah ada validasi length/format client-side yang muncul TANPA Save (mis. on-blur)');
  await ec.mailSentAsInput.blur();
  await page.waitForTimeout(500);
  const errorText = await ec.fieldErrors.first().textContent({ timeout: 1_500 }).catch(() => null);
  report.check('Pesan error panjang muncul on-blur (payload ditolak)', (errorText ?? '').trim().length > 0, `error="${errorText}"`);

  report.step('[SAFETY] Reload TANPA Save, verify nilai server tidak berubah');
  await ec.goto();
  const afterReload = await ec.snapshotMailSentAs();
  report.check('Mail Sent As di server TIDAK berubah (Save tidak pernah diklik)', afterReload === originalValue, `expected="${originalValue}" actual="${afterReload}"`);

  report.print();
});
