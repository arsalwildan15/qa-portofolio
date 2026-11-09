/**
 * ================================================================================
 * TC-ADMIN-STRUCTURE-06: Verify Cancel Discards Form
 * Modul    : Admin - Organization - Structure
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-STRUCTURE-06-Verify-Cancel-Discards-Form.spec.ts
 * Path     : tests/admin/structure/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel pada dialog "Add Organization Unit"
 *   membatalkan isian dan menutup dialog tanpa menyimpan unit apa pun.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/structure/TC-ADMIN-STRUCTURE-06-Verify-Cancel-Discards-Form.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-STRUCTURE-06: clicking Cancel discards the Add Organization Unit dialog', async ({
  page,
  adminStructurePage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-STRUCTURE-06', 'Cancel Discards Form', env.baseURL, page);
  const unitName = uniqueName('QaCancelledUnit');

  report.step('Toggle Edit, pilih root, klik Add, isi Name, klik Cancel');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  await adminStructurePage.addUnderRoot();
  await adminStructurePage.nameInput.fill(unitName);
  await adminStructurePage.cancelButton.click();
  await page.waitForTimeout(1000);

  report.step('Verify: dialog tertutup, unit TIDAK tersimpan di tree');
  report.check('Dialog "Add Organization Unit" tertutup (Save button tidak lagi ada)', (await page.getByRole('button', { name: 'Save' }).count()) === 0);
  report.check(
    `Unit "${unitName}" TIDAK muncul di tree`,
    !(await adminStructurePage.nodeByName(unitName).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
