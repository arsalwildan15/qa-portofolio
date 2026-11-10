/**
 * ================================================================================
 * TC-ADMIN-LDAP-05: Verify Test Connection Is Non-Mutating
 * Modul    : Admin - Configuration - LDAP Configuration
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LDAP-05-Verify-Test-Connection-Non-Mutating.spec.ts
 * Path     : tests/admin/ldap-configuration/
 * ================================================================================
 *
 * TUJUAN:
 *   TC PALING PENTING untuk safety screen ini: membuktikan klik "Test
 *   Connection" dengan nilai default yang TIDAK diubah (Host/Port asli)
 *   TIDAK mengubah apa pun di server dan TIDAK mengirim POST/PUT
 *   Save-equivalent -- membuktikan asumsi "Test Connection aman dipakai
 *   berulang di TC lain" benar-benar valid, bukan cuma diasumsikan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/ldap-configuration/TC-ADMIN-LDAP-05-Verify-Test-Connection-Non-Mutating.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LDAP-05: clicking Test Connection with unmodified defaults never persists anything', async ({
  page,
  adminLdapConfigurationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LDAP-05', 'Verify Test Connection Non Mutating', env.baseURL, page);
  const ldap = adminLdapConfigurationPage;

  const mutatingRequests: string[] = [];
  page.on('request', (r) => {
    if (['POST', 'PUT'].includes(r.method()) && !r.url().includes('/events/push')) mutatingRequests.push(`${r.method()} ${r.url()}`);
  });

  report.step('Buka LDAP Configuration, catat Host/Port asli, klik Test Connection TANPA mengubah apa pun');
  await ldap.goto();
  const originalHost = await ldap.hostInput.inputValue();
  const originalPort = await ldap.portInput.inputValue();
  await ldap.testConnection();
  await page.waitForTimeout(2500);

  report.step('Catat hasil Test Connection (informasional, environment-dependent), verify TIDAK ADA Save yang terkirim');
  const toastText = await page.locator('.oxd-toast').first().textContent({ timeout: 2_000 }).catch(() => null);
  report.finding(
    'Hasil Test Connection dengan Host/Port default (localhost:389 kemungkinan tidak reachable dari backend demo)',
    `toast="${toastText}"`,
  );
  report.check('TIDAK ADA POST/PUT (Save-equivalent) terkirim ke server', mutatingRequests.length === 0, `requests=${JSON.stringify(mutatingRequests)}`);

  report.step('Reload halaman, verify Host/Port di server tidak berubah');
  await ldap.goto();
  const afterHost = await ldap.hostInput.inputValue();
  const afterPort = await ldap.portInput.inputValue();
  report.check('Host tidak berubah', afterHost === originalHost, `original="${originalHost}" after="${afterHost}"`);
  report.check('Port tidak berubah', afterPort === originalPort, `original="${originalPort}" after="${afterPort}"`);

  report.print();
});
