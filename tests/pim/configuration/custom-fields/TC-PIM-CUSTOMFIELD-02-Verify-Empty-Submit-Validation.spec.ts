/**
 * ================================================================================
 * TC-PIM-CUSTOMFIELD-02: Verify Empty Submit Validation
 * Modul    : PIM - Configuration - Custom Fields
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CUSTOMFIELD-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/pim/configuration/custom-fields/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add Custom Field kosong menampilkan
 *   validasi required untuk Field Name, Screen, dan Type.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/custom-fields/TC-PIM-CUSTOMFIELD-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

test('TC-PIM-CUSTOMFIELD-02: empty submit shows required validation', async ({
  page,
  customFieldsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CUSTOMFIELD-02', 'Empty Submit Validation', env.baseURL, page);

  let saveRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('custom-field')) saveRequestFired = true;
  });

  report.step('Buka Custom Fields, klik Add, langsung klik Save tanpa isi apapun');
  await customFieldsPage.goto();
  await customFieldsPage.addButton.click();
  await customFieldsPage.fieldNameInput.waitFor({ state: 'visible' });
  await customFieldsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify validasi muncul dan save tidak terkirim');
  const errorCount = await customFieldsPage.fieldErrors.count();
  report.check('count(error) >= 3 (Field Name, Screen, Type)', errorCount >= 3, `count=${errorCount}`);
  report.check('POST custom-field TIDAK terkirim', saveRequestFired === false);

  report.print();
});
