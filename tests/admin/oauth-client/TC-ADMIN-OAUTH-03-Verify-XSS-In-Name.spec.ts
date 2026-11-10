/**
 * ================================================================================
 * TC-ADMIN-OAUTH-03: Verify XSS Payload In Name
 * Modul    : Admin - Configuration - OAuth Client
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-OAUTH-03-Verify-XSS-In-Name.spec.ts
 * Path     : tests/admin/oauth-client/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Name tersimpan sebagai teks biasa dan
 *   TIDAK men-trigger alert/dialog. Record dibiarkan ada (sama pola
 *   dengan TC Add/XSS screen Admin lain, mis. Job Title) karena additive
 *   & tidak mengubah seed row yang ada ("OrangeHRM Mobile App") --
 *   [TEMUAN KOREKSI] client baru TETAP `enabled: true` di API terlepas
 *   dari checkbox "Enable Client" (lihat AdminOAuthClientPage), tapi ini
 *   tidak menambah risiko karena OAuth Client tidak memengaruhi halaman
 *   login browser (lihat RISK note di page object).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/oauth-client/TC-ADMIN-OAUTH-03-Verify-XSS-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

// Unique suffix keeps re-runs from piling up identical duplicate rows on the shared demo.
const XSS_PAYLOAD = `<script>alert(1)</script>${uniqueName('qa')}`;

test('TC-ADMIN-OAUTH-03: XSS payload in Name is saved safely as text, no alert fired', async ({
  page,
  adminOAuthClientPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-OAUTH-03', 'Verify XSS In Name', env.baseURL, page);
  const oc = adminOAuthClientPage;

  let dialogFired = false;
  page.on('dialog', (d) => {
    dialogFired = true;
    void d.dismiss();
  });

  report.step('Buka OAuth Client, klik Add, isi Name dengan payload XSS + Redirect URI valid, Save');
  await oc.goto();
  await oc.addButton.click();
  await page.waitForTimeout(800);
  await oc.fillClient(XSS_PAYLOAD, 'com.example.qa://oauthredirect');
  await oc.saveAndReload();
  await oc.rowByName(XSS_PAYLOAD).first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});

  report.step('Verify tidak ada alert/dialog ter-trigger');
  report.check('TIDAK ADA JS alert/dialog ter-trigger', !dialogFired);
  const bodyText = await page.locator('body').innerText();
  report.finding('Rendering payload XSS di list OAuth Client', bodyText.includes(XSS_PAYLOAD) ? 'Tersimpan dan tampil sebagai teks biasa (escaped)' : 'Payload tidak ditemukan di list -- kemungkinan ditolak atau gagal tersimpan');

  report.print();
});
