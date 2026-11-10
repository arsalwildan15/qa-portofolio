/**
 * ================================================================================
 * TC-ADMIN-SOCIALAUTH-03: Verify XSS Payload In Name
 * Modul    : Admin - Configuration - Social Media Authentication
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SOCIALAUTH-03-Verify-XSS-In-Name.spec.ts
 * Path     : tests/admin/social-media-authentication/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Name (dengan Provider URL/Client ID/
 *   Client Secret diisi valid supaya Required tidak menutupi hasil) TIDAK
 *   men-trigger alert/dialog -- [VALIDATE-ONLY, PENTING].
 *
 *   [SAFETY CONSTRAINT] TC ini SENGAJA TIDAK PERNAH klik Save --
 *   menambah provider di sini berpotensi mengubah halaman login yang
 *   dilihat SEMUA user demo publik ini (lihat SAFETY CONSTRAINT di
 *   AdminSocialMediaAuthPage). Form ditutup lewat Cancel di akhir TC.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/social-media-authentication/TC-ADMIN-SOCIALAUTH-03-Verify-XSS-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const XSS_PAYLOAD = '<script>alert(1)</script>';

test('TC-ADMIN-SOCIALAUTH-03: XSS payload in Name does not trigger a dialog [VALIDATE-ONLY, never saved]', async ({
  page,
  adminSocialMediaAuthPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-SOCIALAUTH-03', 'Verify XSS In Name', env.baseURL, page);
  const sa = adminSocialMediaAuthPage;

  let dialogFired = false;
  page.on('dialog', (d) => {
    dialogFired = true;
    void d.dismiss();
  });
  const postRequests: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('auth-provider')) postRequests.push(r.url());
  });

  report.step('Buka Social Media Authentication, klik Add, isi Name dengan payload XSS + field lain valid (TIDAK klik Save)');
  await sa.goto();
  await sa.addButton.click();
  await page.waitForTimeout(800);
  await sa.fillProvider(XSS_PAYLOAD, 'https://example.com', 'test-client-id', 'test-client-secret');
  await page.waitForTimeout(500);

  report.step('Verify tidak ada alert/dialog ter-trigger, lalu tutup form lewat Cancel TANPA Save');
  report.check('TIDAK ADA JS alert/dialog ter-trigger', !dialogFired);
  report.check('TIDAK ADA POST terkirim (Save tidak pernah diklik)', postRequests.length === 0, `requests=${JSON.stringify(postRequests)}`);

  await sa.cancelButton.click().catch(() => {});

  report.print();
});
