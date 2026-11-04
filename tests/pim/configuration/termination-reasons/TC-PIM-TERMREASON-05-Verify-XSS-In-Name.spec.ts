/**
 * ================================================================================
 * TC-PIM-TERMREASON-05: Verify XSS In Name
 * Modul    : PIM - Configuration - Termination Reasons
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-TERMREASON-05-Verify-XSS-In-Name.spec.ts
 * Path     : tests/pim/configuration/termination-reasons/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS (<script>alert(1)</script>) di Name tidak
 *   dieksekusi sebagai script saat ditampilkan kembali di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/termination-reasons/TC-PIM-TERMREASON-05-Verify-XSS-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

test('TC-PIM-TERMREASON-05: XSS payload in name is not executed', async ({
  page,
  terminationReasonsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-TERMREASON-05', 'XSS In Name', env.baseURL, page);
  const xssPayload = '<script>alert(1)</script>';

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step('Isi Name dengan payload XSS, klik Save');
  await terminationReasonsPage.goto();
  await terminationReasonsPage.addButton.click();
  await terminationReasonsPage.nameInput.waitFor({ state: 'visible' });
  await terminationReasonsPage.nameInput.fill(xssPayload);
  await terminationReasonsPage.save();
  await page.waitForTimeout(800);

  report.step('Reload list, verify tidak ada dialog alert yang terpicu');
  await terminationReasonsPage.goto();
  await page.waitForTimeout(500);
  report.check('Tidak ada dialog alert terpicu (XSS tidak dieksekusi)', dialogFired === false);

  report.print();
});
