/**
 * ================================================================================
 * TC-ADMIN-LDAP-03: Verify XSS/SQLi Payload In Distinguished Name
 * Modul    : Admin - Configuration - LDAP Configuration
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LDAP-03-Verify-XSS-SQLi-In-Distinguished-Name.spec.ts
 * Path     : tests/admin/ldap-configuration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS/SQLi/LDAP-injection di Distinguished Name,
 *   dicoba via "Test Connection" (BUKAN Save), tidak men-trigger alert
 *   dan tidak ada network request Save-equivalent yang terkirim.
 *
 *   [SAFETY] [VALIDATE-ONLY] TC ini TIDAK PERNAH klik Save -- lihat
 *   SAFETY CONSTRAINT di AdminLdapConfigurationPage.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/ldap-configuration/TC-ADMIN-LDAP-03-Verify-XSS-SQLi-In-Distinguished-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const PAYLOAD = `<script>alert(1)</script>*)(uid=*))(|(uid=*`;

test('TC-ADMIN-LDAP-03: XSS/SQLi/LDAP-injection payload via Test Connection is handled safely, never saved [VALIDATE-ONLY]', async ({
  page,
  adminLdapConfigurationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LDAP-03', 'Verify XSS SQLi In Distinguished Name', env.baseURL, page);
  const ldap = adminLdapConfigurationPage;

  let dialogFired = false;
  page.on('dialog', (d) => {
    dialogFired = true;
    void d.dismiss();
  });
  const mutatingRequests: string[] = [];
  page.on('request', (r) => {
    if (['POST', 'PUT'].includes(r.method()) && !r.url().includes('/events/push')) mutatingRequests.push(`${r.method()} ${r.url()}`);
  });

  report.step('Buka LDAP Configuration, isi Distinguished Name dengan payload XSS/SQLi/LDAP-injection, klik Test Connection (TIDAK klik Save)');
  await ldap.goto();
  await ldap.distinguishedNameInput.fill(PAYLOAD);
  await ldap.testConnection();
  await page.waitForTimeout(2000);

  report.step('Verify tidak ada alert/dialog ter-trigger dan tidak ada Save yang terkirim');
  report.check('TIDAK ADA JS alert/dialog ter-trigger', !dialogFired);
  report.check('TIDAK ADA POST/PUT (Save-equivalent) terkirim ke server', mutatingRequests.length === 0, `requests=${JSON.stringify(mutatingRequests)}`);

  report.print();
});
