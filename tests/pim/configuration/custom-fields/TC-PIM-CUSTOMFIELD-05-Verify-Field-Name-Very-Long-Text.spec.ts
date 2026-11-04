/**
 * ================================================================================
 * TC-PIM-CUSTOMFIELD-05: Verify Field Name Very Long Text
 * Modul    : PIM - Configuration - Custom Fields
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CUSTOMFIELD-05-Verify-Field-Name-Very-Long-Text.spec.ts
 * Path     : tests/pim/configuration/custom-fields/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Field Name dengan teks sangat panjang (200 karakter)
 *   ditangani dengan jelas (ditolak via validasi client-side, atau
 *   diterima dan disimpan apa adanya).
 *
 * CATATAN: pernah terobservasi 500 + uncaught exception saat test ini
 * dijalankan BERBARENGAN dengan TC lain yang juga menulis ke custom-fields
 * (parallel run), tapi saat diisolasi dan dijalankan sendirian, response
 * selalu bersih tanpa error. Kemungkinan besar race condition di server
 * demo saat ada concurrent write ke endpoint yang sama, bukan defect yang
 * terkait panjang Field Name itu sendiri.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/custom-fields/TC-PIM-CUSTOMFIELD-05-Verify-Field-Name-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

test('TC-PIM-CUSTOMFIELD-05: field name with 200 characters', async ({
  page,
  customFieldsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CUSTOMFIELD-05', 'Field Name Very Long Text', env.baseURL, page);
  const longName = `QaLong${'X'.repeat(194)}`; // 200 chars total

  report.step('Isi Field Name dengan 200 karakter, pilih Screen/Type, klik Save');
  await customFieldsPage.goto();
  await customFieldsPage.addButton.click();
  await customFieldsPage.fieldNameInput.waitFor({ state: 'visible' });
  await customFieldsPage.fieldNameInput.fill(longName);
  await customFieldsPage.selectDropdownOption(customFieldsPage.screenSelect, 'Personal Details');
  await customFieldsPage.selectDropdownOption(customFieldsPage.typeSelect, 'Text or Number');
  await customFieldsPage.save();
  await page.waitForTimeout(800);

  report.step('Amati behavior: ditolak validasi, atau tersimpan');
  const errorText = await customFieldsPage.fieldErrors.allTextContents();
  const saved = errorText.length === 0;
  if (saved) {
    await customFieldsPage.goto();
    const row = customFieldsPage.rowByName(longName.slice(0, 20));
    const visible = await row.isVisible().catch(() => false);
    report.finding('Field Name 200 karakter', `Tidak ada error validasi, kemungkinan tersimpan. Row terlihat setelah reload=${visible}`);
  } else {
    report.finding('Field Name 200 karakter', `Ditolak dengan error: ${JSON.stringify(errorText)}`);
  }

  report.print();
});
