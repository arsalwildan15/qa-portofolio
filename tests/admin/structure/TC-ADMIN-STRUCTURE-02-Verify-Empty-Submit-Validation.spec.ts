/**
 * ================================================================================
 * TC-ADMIN-STRUCTURE-02: Verify Empty Submit Validation
 * Modul    : Admin - Organization - Structure
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-STRUCTURE-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/structure/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form "Add Organization Unit" kosong menampilkan
 *   validasi "Required" di Name (satu-satunya field required di form
 *   ini -- Unit Id dan Description opsional, dikonfirmasi live lewat
 *   tepat 1 pesan "Required" saat submit kosong).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/structure/TC-ADMIN-STRUCTURE-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-STRUCTURE-02: submitting the Add Organization Unit form empty shows Required on Name', async ({
  page,
  adminStructurePage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-STRUCTURE-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Toggle Edit, pilih root, klik Add, klik Save tanpa isi apa pun');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  await adminStructurePage.addUnderRoot();
  await adminStructurePage.save();
  await page.waitForTimeout(1000);

  report.step('Verify: pesan Required muncul di Name');
  const errorTexts = (await adminStructurePage.fieldErrors.allTextContents()).filter((t) => t.trim() === 'Required');
  report.check('Pesan "Required" muncul (Name)', errorTexts.length >= 1, `errors=${JSON.stringify(errorTexts)}`);

  report.print();
});
