/**
 * ================================================================================
 * TC-PIM-CUSTOMFIELD-03: Verify Delete Custom Field
 * Modul    : PIM - Configuration - Custom Fields
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CUSTOMFIELD-03-Verify-Delete-Custom-Field.spec.ts
 * Path     : tests/pim/configuration/custom-fields/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menghapus custom field (via icon trash + konfirmasi
 *   "Yes, Delete") berhasil, field tidak lagi muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/custom-fields/TC-PIM-CUSTOMFIELD-03-Verify-Delete-Custom-Field.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { uniqueName } from '../../../../src/data/testData';

test('TC-PIM-CUSTOMFIELD-03: deleting a custom field removes it from the list', async ({
  page,
  customFieldsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CUSTOMFIELD-03', 'Delete Custom Field', env.baseURL, page);
  const fieldName = uniqueName('QaDeleteField');

  report.step('Buat custom field baru untuk dihapus');
  await customFieldsPage.goto();
  await customFieldsPage.addButton.click();
  await customFieldsPage.fieldNameInput.waitFor({ state: 'visible' });
  await customFieldsPage.fieldNameInput.fill(fieldName);
  await customFieldsPage.selectDropdownOption(customFieldsPage.screenSelect, 'Personal Details');
  await customFieldsPage.selectDropdownOption(customFieldsPage.typeSelect, 'Text or Number');
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/custom-fields') && r.request().method() === 'POST',
      { timeout: 10_000 },
    ),
    customFieldsPage.save(),
  ]);

  report.step('Verify field muncul di list sebelum dihapus');
  await customFieldsPage.goto();
  const row = customFieldsPage.rowByName(fieldName);
  await row.waitFor({ state: 'visible', timeout: 10_000 });
  report.check('Field terlihat sebelum delete', await row.isVisible());

  report.step('Hapus field via icon trash + konfirmasi "Yes, Delete"');
  const [deleteResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/custom-fields') && r.request().method() === 'DELETE',
      { timeout: 10_000 },
    ),
    customFieldsPage.deleteRow(row),
  ]);
  report.check('[API] status === 200', deleteResp.status() === 200, `status=${deleteResp.status()}`);

  report.step('Verify field tidak lagi muncul di list');
  await customFieldsPage.goto();
  const rowAfterDelete = customFieldsPage.rowByName(fieldName);
  const stillVisible = await rowAfterDelete.isVisible().catch(() => false);
  report.check('Field sudah tidak terlihat setelah delete', stillVisible === false);

  report.print();
});
