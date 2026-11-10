/**
 * ================================================================================
 * TC-ADMIN-SOCIALAUTH-04: Verify Cancel Discards Add Provider Form
 * Modul    : Admin - Configuration - Social Media Authentication
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SOCIALAUTH-04-Verify-Cancel-Discards.spec.ts
 * Path     : tests/admin/social-media-authentication/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Cancel pada form Add Provider membatalkan, jumlah
 *   provider terdaftar tidak berubah.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/social-media-authentication/TC-ADMIN-SOCIALAUTH-04-Verify-Cancel-Discards.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-SOCIALAUTH-04: Cancel on Add Provider discards without saving', async ({
  page,
  adminSocialMediaAuthPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-SOCIALAUTH-04', 'Verify Cancel Discards', env.baseURL, page);
  const sa = adminSocialMediaAuthPage;
  const providerName = uniqueName('QaProvider');

  report.step('Buka Social Media Authentication, catat jumlah provider, klik Add, isi form, klik Cancel');
  await sa.goto();
  const baselineCount = await sa.tableRows.count();
  await sa.addButton.click();
  await page.waitForTimeout(800);
  await sa.fillProvider(providerName, 'https://example.com', 'test-client-id', 'test-client-secret');
  await sa.cancelButton.click();
  await page.waitForTimeout(1000);

  report.step('Verify kembali ke list, jumlah provider tidak berubah');
  const afterCancelCount = await sa.tableRows.count();
  report.check('Jumlah provider tidak berubah setelah Cancel', afterCancelCount === baselineCount, `baseline=${baselineCount} afterCancel=${afterCancelCount}`);
  const bodyText = await page.locator('body').innerText();
  report.check('Provider baru TIDAK muncul di list', !bodyText.includes(providerName));

  report.print();
});
