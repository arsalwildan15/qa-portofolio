/**
 * ================================================================================
 * TC-PIM-REPORTMETHOD-05: Verify XSS In Name
 * Modul    : PIM - Configuration - Reporting Methods
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTMETHOD-05-Verify-XSS-In-Name.spec.ts
 * Path     : tests/pim/configuration/reporting-methods/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS (<script>alert(1)</script>) di Name tidak
 *   dieksekusi sebagai script saat ditampilkan kembali di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/reporting-methods/TC-PIM-REPORTMETHOD-05-Verify-XSS-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

test('TC-PIM-REPORTMETHOD-05: XSS payload in name is not executed', async ({
  page,
  reportingMethodsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORTMETHOD-05', 'XSS In Name', env.baseURL, page);
  const xssPayload = '<script>alert(1)</script>';

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step('Isi Name dengan payload XSS, klik Save');
  await reportingMethodsPage.goto();
  await reportingMethodsPage.addButton.click();
  await reportingMethodsPage.nameInput.waitFor({ state: 'visible' });
  await reportingMethodsPage.nameInput.fill(xssPayload);
  await reportingMethodsPage.save();
  await page.waitForTimeout(800);

  report.step('Reload list, verify tidak ada dialog alert yang terpicu');
  await reportingMethodsPage.goto();
  await page.waitForTimeout(500);
  report.check('Tidak ada dialog alert terpicu (XSS tidak dieksekusi)', dialogFired === false);

  report.print();
});
