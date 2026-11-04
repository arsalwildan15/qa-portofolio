/**
 * ================================================================================
 * TC-PIM-CUSTOMFIELD-06: Verify XSS In Field Name
 * Modul    : PIM - Configuration - Custom Fields
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CUSTOMFIELD-06-Verify-XSS-In-Field-Name.spec.ts
 * Path     : tests/pim/configuration/custom-fields/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS (<script>alert(1)</script>) di Field Name
 *   tidak dieksekusi sebagai script saat ditampilkan kembali di list
 *   (tidak memicu dialog alert dari browser).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/custom-fields/TC-PIM-CUSTOMFIELD-06-Verify-XSS-In-Field-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

test('TC-PIM-CUSTOMFIELD-06: XSS payload in field name is not executed', async ({
  page,
  customFieldsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CUSTOMFIELD-06', 'XSS In Field Name', env.baseURL, page);
  const xssPayload = '<script>alert(1)</script>';

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step('Isi Field Name dengan payload XSS, pilih Screen/Type, klik Save');
  await customFieldsPage.goto();
  await customFieldsPage.addButton.click();
  await customFieldsPage.fieldNameInput.waitFor({ state: 'visible' });
  await customFieldsPage.fieldNameInput.fill(xssPayload);
  await customFieldsPage.selectDropdownOption(customFieldsPage.screenSelect, 'Personal Details');
  await customFieldsPage.selectDropdownOption(customFieldsPage.typeSelect, 'Text or Number');
  await customFieldsPage.save();
  await page.waitForTimeout(800);

  report.step('Reload list, verify tidak ada dialog alert yang terpicu');
  await customFieldsPage.goto();
  await page.waitForTimeout(500);
  report.check('Tidak ada dialog alert terpicu (XSS tidak dieksekusi)', dialogFired === false);

  report.print();
});
