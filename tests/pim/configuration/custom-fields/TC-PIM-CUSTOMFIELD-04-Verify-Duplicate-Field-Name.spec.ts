/**
 * ================================================================================
 * TC-PIM-CUSTOMFIELD-04: Verify Duplicate Field Name
 * Modul    : PIM - Configuration - Custom Fields
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CUSTOMFIELD-04-Verify-Duplicate-Field-Name.spec.ts
 * Path     : tests/pim/configuration/custom-fields/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah custom field dengan Field Name yang sudah ada
 *   (sama persis dengan field existing) ditolak dengan error "Already
 *   exists" (dikonfirmasi live: behavior ini deterministik, bukan
 *   diterima sebagai duplikat).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/custom-fields/TC-PIM-CUSTOMFIELD-04-Verify-Duplicate-Field-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { uniqueName } from '../../../../src/data/testData';

test('TC-PIM-CUSTOMFIELD-04: adding a duplicate field name', async ({
  page,
  customFieldsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CUSTOMFIELD-04', 'Duplicate Field Name', env.baseURL, page);
  const fieldName = uniqueName('QaDupField');

  report.step('Buat custom field pertama');
  await customFieldsPage.goto();
  await customFieldsPage.addButton.click();
  await customFieldsPage.fieldNameInput.waitFor({ state: 'visible' });
  await customFieldsPage.fieldNameInput.fill(fieldName);
  await customFieldsPage.selectDropdownOption(customFieldsPage.screenSelect, 'Personal Details');
  await customFieldsPage.selectDropdownOption(customFieldsPage.typeSelect, 'Text or Number');
  await customFieldsPage.save();
  await page.waitForTimeout(500);

  report.step('Coba buat custom field kedua dengan Field Name yang sama persis');
  await customFieldsPage.goto();
  await customFieldsPage.addButton.click();
  await customFieldsPage.fieldNameInput.waitFor({ state: 'visible' });
  await customFieldsPage.fieldNameInput.fill(fieldName);
  await customFieldsPage.selectDropdownOption(customFieldsPage.screenSelect, 'Personal Details');
  await customFieldsPage.selectDropdownOption(customFieldsPage.typeSelect, 'Text or Number');
  await customFieldsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify ditolak dengan error "Already exists"');
  const errorText = await customFieldsPage.fieldErrors.allTextContents();
  report.check('Error "Already exists" muncul', errorText.some((t) => t.includes('Already exists')), `errorText=${JSON.stringify(errorText)}`);

  await customFieldsPage.goto();
  const matchingRows = customFieldsPage.rowByName(fieldName);
  await matchingRows.first().waitFor({ state: 'visible', timeout: 10_000 });
  const duplicateCount = await matchingRows.count();
  report.check('Hanya ada 1 field dengan nama ini (duplikat tidak tersimpan)', duplicateCount === 1, `count=${duplicateCount}`);

  report.print();
});
