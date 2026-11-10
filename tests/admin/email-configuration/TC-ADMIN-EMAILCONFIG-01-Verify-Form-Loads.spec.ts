/**
 * ================================================================================
 * TC-ADMIN-EMAILCONFIG-01: Verify Form Loads
 * Modul    : Admin - Configuration - Email Configuration
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMAILCONFIG-01-Verify-Form-Loads.spec.ts
 * Path     : tests/admin/email-configuration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi form Email Configuration termuat dengan field Mail Sent
 *   As, 3 radio Sending Method (SECURE SMTP/SMTP/Sendmail), dan tombol
 *   Reset/Save. TC ini TIDAK mengubah atau menyimpan apa pun.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/email-configuration/TC-ADMIN-EMAILCONFIG-01-Verify-Form-Loads.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-ADMIN-EMAILCONFIG-01: Email Configuration form loads with expected fields and buttons', async ({
  page,
  adminEmailConfigurationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-EMAILCONFIG-01', 'Verify Form Loads', env.baseURL, page);
  const ec = adminEmailConfigurationPage;

  report.step('Buka Email Configuration');
  await ec.goto();

  report.step('Verify field Mail Sent As, radio Sending Method, dan tombol Reset/Save tampil');
  report.check('Mail Sent As input terlihat', await isVisibleWithWait(ec.mailSentAsInput));
  report.check('Radio "SECURE SMTP" terlihat', await isVisibleWithWait(ec.secureSmtpRadioLabel.first()));
  report.check('Radio "SMTP" terlihat', await isVisibleWithWait(ec.smtpRadioLabel.first()));
  report.check('Radio "Sendmail" terlihat', await isVisibleWithWait(ec.sendmailRadioLabel.first()));
  report.check('Tombol Reset terlihat', await isVisibleWithWait(ec.resetButton));
  report.check('Tombol Save terlihat', await isVisibleWithWait(ec.saveButton));

  const currentMailSentAs = await ec.mailSentAsInput.inputValue().catch(() => '');
  report.finding(
    'Nilai Mail Sent As saat ini',
    `"${currentMailSentAs}" -- field ini satu-satunya yang label-nya sendiri menampilkan tanda "*" (required), dikonfirmasi lewat page snapshot live.`,
  );

  report.print();
});
