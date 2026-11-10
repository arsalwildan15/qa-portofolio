/**
 * ================================================================================
 * TC-ADMIN-LDAP-02: Verify Empty Host Via Test Connection
 * Modul    : Admin - Configuration - LDAP Configuration
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LDAP-02-Verify-Empty-Host-Test-Connection.spec.ts
 * Path     : tests/admin/ldap-configuration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengosongkan Host lalu klik "Test Connection" (BUKAN
 *   Save) memunculkan error/hasil yang wajar, dan TIDAK ADA network
 *   request Save-equivalent (POST/PUT) yang terkirim sepanjang TC.
 *
 *   [SAFETY -- PENTING] LDAP Configuration adalah screen PALING BERISIKO
 *   di suite ini (lihat warning aplikasi sendiri soal backup database).
 *   TC ini SENGAJA TIDAK PERNAH klik Save -- "Test Connection" dipakai
 *   sebagai probe aman (dikonfirmasi terpisah dari Save, lihat SAFETY
 *   CONSTRAINT di AdminLdapConfigurationPage).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/ldap-configuration/TC-ADMIN-LDAP-02-Verify-Empty-Host-Test-Connection.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LDAP-02: empty Host via Test Connection is handled, never saved [VALIDATE-ONLY]', async ({
  page,
  adminLdapConfigurationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LDAP-02', 'Verify Empty Host Test Connection', env.baseURL, page);
  const ldap = adminLdapConfigurationPage;

  const mutatingRequests: string[] = [];
  page.on('request', (r) => {
    if (['POST', 'PUT'].includes(r.method()) && !r.url().includes('/events/push')) mutatingRequests.push(`${r.method()} ${r.url()}`);
  });

  report.step('Buka LDAP Configuration, kosongkan Host, klik Test Connection (TIDAK klik Save)');
  await ldap.goto();
  await ldap.hostInput.fill('');
  await ldap.testConnection();
  await page.waitForTimeout(2000);

  report.step('Catat hasil (error Required ATAU hasil test-connection gagal), dan verify TIDAK ADA Save yang terkirim');
  const errorText = await ldap.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  const toastText = await page.locator('.oxd-toast').first().textContent({ timeout: 2_000 }).catch(() => null);
  report.finding('Hasil Test Connection dengan Host kosong', `fieldError="${errorText}", toast="${toastText}"`);
  report.check('TIDAK ADA POST/PUT (Save-equivalent) terkirim ke server', mutatingRequests.length === 0, `requests=${JSON.stringify(mutatingRequests)}`);

  report.print();
});
