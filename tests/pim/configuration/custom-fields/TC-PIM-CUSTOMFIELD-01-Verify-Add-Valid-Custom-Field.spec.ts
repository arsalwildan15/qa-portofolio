/**
 * ================================================================================
 * TC-PIM-CUSTOMFIELD-01: Verify Add Valid Custom Field
 * Modul    : PIM - Configuration - Custom Fields
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CUSTOMFIELD-01-Verify-Add-Valid-Custom-Field.spec.ts
 * Path     : tests/pim/configuration/custom-fields/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah custom field baru (Field Name, Screen, Type)
 *   berhasil tersimpan dan muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/custom-fields/TC-PIM-CUSTOMFIELD-01-Verify-Add-Valid-Custom-Field.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { uniqueName } from '../../../../src/data/testData';

test('TC-PIM-CUSTOMFIELD-01: adding a valid custom field succeeds', async ({
  page,
  customFieldsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CUSTOMFIELD-01', 'Add Valid Custom Field', env.baseURL, page);
  const fieldName = uniqueName('QaCustomField');

  report.step('Buka Custom Fields, klik Add, isi Field Name/Screen/Type');
  await customFieldsPage.goto();
  await customFieldsPage.addButton.click();
  await customFieldsPage.fieldNameInput.waitFor({ state: 'visible' });
  await customFieldsPage.fieldNameInput.fill(fieldName);
  await customFieldsPage.selectDropdownOption(customFieldsPage.screenSelect, 'Personal Details');
  await customFieldsPage.selectDropdownOption(customFieldsPage.typeSelect, 'Text or Number');

  report.step('Klik Save, verify response sukses');
  const [saveResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/custom-fields') && r.request().method() === 'POST',
      { timeout: 10_000 },
    ),
    customFieldsPage.save(),
  ]);
  report.check('[API] status === 200', saveResp.status() === 200, `status=${saveResp.status()}`);

  report.step('Verify field baru muncul di list');
  await customFieldsPage.goto();
  const row = customFieldsPage.rowByName(fieldName);
  await row.waitFor({ state: 'visible', timeout: 10_000 });
  report.check('Custom field baru terlihat di list', await row.isVisible());

  report.print();
});
