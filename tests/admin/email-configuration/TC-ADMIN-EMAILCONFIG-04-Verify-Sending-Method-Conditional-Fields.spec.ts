/**
 * ================================================================================
 * TC-ADMIN-EMAILCONFIG-04: Verify Sending Method Conditional Fields
 * Modul    : Admin - Configuration - Email Configuration
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMAILCONFIG-04-Verify-Sending-Method-Conditional-Fields.spec.ts
 * Path     : tests/admin/email-configuration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi memilih radio Sending Method yang berbeda (Sendmail <->
 *   SMTP) menampilkan/menyembunyikan field terkait secara benar (Path to
 *   Sendmail vs SMTP Host/Port) -- PURE UI/DOM check, TIDAK PERNAH klik
 *   Save (radio selection ini client-side state saja, tidak pernah
 *   ter-persist tanpa Save, dikonfirmasi lewat reload di akhir TC).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/email-configuration/TC-ADMIN-EMAILCONFIG-04-Verify-Sending-Method-Conditional-Fields.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';

test('TC-ADMIN-EMAILCONFIG-04: switching Sending Method reveals correct conditional fields, never saved', async ({
  page,
  adminEmailConfigurationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-EMAILCONFIG-04', 'Verify Sending Method Conditional Fields', env.baseURL, page);
  const ec = adminEmailConfigurationPage;

  report.step('Buka Email Configuration (default Sending Method = Sendmail pada demo ini)');
  await ec.goto();
  report.check('Path to Sendmail terlihat saat Sendmail terpilih (default)', await isVisibleWithWait(ec.pathToSendmailText));

  report.step('Pilih radio SMTP, verify SMTP Host/Port muncul dan Path to Sendmail hilang');
  await ec.selectSendingMethod('SMTP');
  report.check('SMTP Host muncul', await isVisibleWithWait(ec.smtpHostInput));
  report.check('SMTP Port muncul', await isVisibleWithWait(ec.smtpPortInput));
  report.check('Path to Sendmail tersembunyi', await isHiddenWithWait(ec.pathToSendmailText, 3_000));

  report.step('Pilih balik radio Sendmail, verify Path to Sendmail muncul lagi (reload tanpa Save, tidak ada perubahan ter-persist)');
  await ec.selectSendingMethod('Sendmail');
  report.check('Path to Sendmail muncul lagi', await isVisibleWithWait(ec.pathToSendmailText));

  await ec.goto();
  const methodStillSendmail = await isVisibleWithWait(ec.pathToSendmailText);
  report.check('Setelah reload, Sending Method tetap Sendmail (tidak ada perubahan ter-persist karena Save tidak pernah diklik)', methodStillSendmail);

  report.print();
});
