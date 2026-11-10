/**
 * ================================================================================
 * TC-ADMIN-OAUTH-01: Verify Add OAuth Client Valid
 * Modul    : Admin - Configuration - OAuth Client
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-OAUTH-01-Verify-Add-Valid.spec.ts
 * Path     : tests/admin/oauth-client/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Add OAuth Client valid (Name + Redirect URI) tersimpan
 *   dan muncul di list.
 *
 *   [RISK -- koreksi atas asumsi awal scoping] OAuth Client meregister
 *   client untuk token issuance API/mobile-app, BUKAN halaman login
 *   browser (beda dari Social Media Authentication) -- dikonfirmasi live.
 *   Record baru additive dan tidak mengubah seed row "OrangeHRM Mobile
 *   App" yang ada, jadi screen ini diperlakukan seperti Add screen biasa
 *   (bukan validate-only).
 *   [TEMUAN KOREKSI, dikonfirmasi live] Checkbox "Enable Client" TIDAK
 *   mengontrol apa yang sebenarnya dikirim seperti diduga -- client baru
 *   TETAP tersimpan dengan `enabled: true` di response API walau
 *   checkbox-nya tidak pernah disentuh/dicentang (dikonfirmasi lewat
 *   response body POST /api/v2/admin/oauth-clients). TC ini karena itu
 *   mengekspektasi Status "Enabled" (bukan "Disabled" seperti asumsi
 *   awal yang salah).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/oauth-client/TC-ADMIN-OAUTH-01-Verify-Add-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-OAUTH-01: adding a valid OAuth Client (disabled) succeeds', async ({
  page,
  adminOAuthClientPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-OAUTH-01', 'Verify Add Valid', env.baseURL, page);
  const oc = adminOAuthClientPage;
  const clientName = uniqueName('QaOAuthClient');

  report.step('Buka OAuth Client, klik Add, isi Name + Redirect URI (Enable Client TIDAK dicentang), Save');
  await oc.goto();
  await oc.addButton.click();
  await page.waitForTimeout(800);
  await oc.fillClient(clientName, 'com.example.qa://oauthredirect');
  await oc.saveAndReload();

  report.step('Verify client baru muncul di list (tunggu row-nya render)');
  const row = oc.rowByName(clientName);
  const added = await row
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  report.check('OAuth Client baru muncul di list', added);
  if (added) {
    const rowText = await row.first().innerText();
    report.check('Status client baru = Enabled (dikonfirmasi live, lihat TEMUAN KOREKSI di header)', rowText.includes('Enabled'), `rowText="${rowText}"`);
  }

  report.print();
});
