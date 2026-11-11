/**
 * ================================================================================
 * TC-ADMIN-OAUTH-04: Verify Cancel Discards Add Client Form
 * Modul    : Admin - Configuration - OAuth Client
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-OAUTH-04-Verify-Cancel-Discards.spec.ts
 * Path     : tests/admin/oauth-client/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Cancel pada form Add membatalkan, jumlah OAuth Client
 *   tidak berubah.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/oauth-client/TC-ADMIN-OAUTH-04-Verify-Cancel-Discards.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-OAUTH-04: Cancel on Add Client form discards without saving', async ({
  page,
  adminOAuthClientPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-OAUTH-04', 'Verify Cancel Discards', env.baseURL, page);
  const oc = adminOAuthClientPage;
  const clientName = uniqueName('QaCancelOAuth');

  report.step('Buka OAuth Client, catat jumlah client, klik Add, isi form, klik Cancel');
  await oc.goto();
  const baselineCount = await oc.tableRows.count();
  await oc.addButton.click();
  await page.waitForTimeout(800);
  await oc.fillClient(clientName, 'com.example.qa://oauthredirect');
  await oc.cancelButton.click();
  await page.waitForTimeout(3000);

  report.step('Verify jumlah client tidak berubah dan client baru tidak muncul');
  const afterCancelCount = await oc.tableRows.count();
  report.check('Jumlah OAuth Client tidak berubah setelah Cancel', afterCancelCount === baselineCount, `baseline=${baselineCount} afterCancel=${afterCancelCount}`);
  const bodyText = await page.locator('body').innerText();
  report.check('Client baru TIDAK muncul di list', !bodyText.includes(clientName));

  report.print();
});
