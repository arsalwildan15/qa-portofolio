/**
 * ================================================================================
 * TC-ADMIN-LDAP-01: Verify Form Loads
 * Modul    : Admin - Configuration - LDAP Configuration
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LDAP-01-Verify-Form-Loads.spec.ts
 * Path     : tests/admin/ldap-configuration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi form LDAP Configuration termuat dengan field Host/
 *   Port, tombol Test Connection + Save, dan teks peringatan eksplisit
 *   soal backup sebelum mengaktifkan LDAP (mengonfirmasi live screen ini
 *   HIGH-RISK, bukan diasumsikan). [VALIDATE-ONLY] TC ini TIDAK PERNAH
 *   klik Save.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/ldap-configuration/TC-ADMIN-LDAP-01-Verify-Form-Loads.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-ADMIN-LDAP-01: LDAP Configuration form loads with Host/Port, Test Connection, Save, and backup warning [VALIDATE-ONLY]', async ({
  page,
  adminLdapConfigurationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LDAP-01', 'Verify Form Loads', env.baseURL, page);
  const ldap = adminLdapConfigurationPage;

  report.step('Buka LDAP Configuration');
  await ldap.goto();

  report.step('Verify Host/Port terlihat, tombol Test Connection + Save, dan teks peringatan backup');
  report.check('Host input terlihat', await isVisibleWithWait(ldap.hostInput));
  report.check('Port input terlihat', await isVisibleWithWait(ldap.portInput));
  report.check('Tombol Test Connection terlihat', await isVisibleWithWait(ldap.testConnectionButton));
  report.check('Tombol Save terlihat', await isVisibleWithWait(ldap.saveButton));
  report.check('Teks peringatan backup sebelum aktivasi LDAP terlihat (mengonfirmasi HIGH-RISK)', await isVisibleWithWait(ldap.warningText));

  const currentHost = await ldap.hostInput.inputValue().catch(() => '');
  const currentPort = await ldap.portInput.inputValue().catch(() => '');
  report.finding('Nilai Host/Port default saat ini', `Host="${currentHost}", Port="${currentPort}"`);

  report.print();
});
