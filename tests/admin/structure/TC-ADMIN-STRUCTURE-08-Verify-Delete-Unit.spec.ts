/**
 * ================================================================================
 * TC-ADMIN-STRUCTURE-08: Verify Delete Unit
 * Modul    : Admin - Organization - Structure
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-STRUCTURE-08-Verify-Delete-Unit.spec.ts
 * Path     : tests/admin/structure/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menghapus Organization Unit yang baru dibuat (lewat
 *   ikon trash -- ikon PERTAMA per node, dikonfirmasi live, sama
 *   delete-first convention dengan sub-screen lain) berhasil via
 *   konfirmasi "Yes, Delete", dan node-nya tidak lagi muncul di tree.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/structure/TC-ADMIN-STRUCTURE-08-Verify-Delete-Unit.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-STRUCTURE-08: deleting a freshly-created organization unit removes it from the tree', async ({
  page,
  adminStructurePage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-STRUCTURE-08', 'Delete Unit', env.baseURL, page);
  const unitName = uniqueName('QaDeleteUnit');

  report.step('Buat unit baru');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  await adminStructurePage.addUnderRoot();
  await adminStructurePage.nameInput.fill(unitName);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/subunits') && r.request().method() === 'POST'),
    adminStructurePage.save(),
  ]);
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();

  report.step('Hapus unit yang baru dibuat (ikon trash, ikon pertama)');
  const node = adminStructurePage.nodeByName(unitName).first();
  await node.waitFor({ state: 'visible', timeout: 5_000 });
  await adminStructurePage.deleteNode(node);
  await page.waitForTimeout(1200);

  report.step('Verify: unit tidak lagi muncul di tree setelah refresh');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  report.check(
    `Unit "${unitName}" TIDAK lagi muncul di tree`,
    !(await adminStructurePage.nodeByName(unitName).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
