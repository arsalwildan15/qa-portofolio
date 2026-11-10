/**
 * ================================================================================
 * TC-ADMIN-LDAP-04: Verify Host Very Long Text
 * Modul    : Admin - Configuration - LDAP Configuration
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LDAP-04-Verify-Host-Very-Long-Text.spec.ts
 * Path     : tests/admin/ldap-configuration/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan perilaku Host 300 karakter via Test Connection
 *   (BUKAN Save) -- [VALIDATE-ONLY].
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/ldap-configuration/TC-ADMIN-LDAP-04-Verify-Host-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LDAP-04: 300-char Host via Test Connection is documented, never saved [VALIDATE-ONLY]', async ({
  page,
  adminLdapConfigurationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LDAP-04', 'Verify Host Very Long Text', env.baseURL, page);
  const ldap = adminLdapConfigurationPage;
  const longHost = 'a'.repeat(300);

  const mutatingRequests: string[] = [];
  page.on('request', (r) => {
    if (['POST', 'PUT'].includes(r.method()) && !r.url().includes('/events/push')) mutatingRequests.push(`${r.method()} ${r.url()}`);
  });

  report.step('Buka LDAP Configuration, isi Host dengan 300 karakter, klik Test Connection (TIDAK klik Save)');
  await ldap.goto();
  await ldap.hostInput.fill(longHost);
  await ldap.testConnection();
  await page.waitForTimeout(2000);

  report.step('Catat hasil, verify TIDAK ADA Save yang terkirim');
  const errorText = await ldap.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  const toastText = await page.locator('.oxd-toast').first().textContent({ timeout: 2_000 }).catch(() => null);
  report.finding('Hasil Test Connection dengan Host 300 karakter', `fieldError="${errorText}", toast="${toastText}"`);
  report.check('TIDAK ADA POST/PUT (Save-equivalent) terkirim ke server', mutatingRequests.length === 0, `requests=${JSON.stringify(mutatingRequests)}`);

  report.print();
});
