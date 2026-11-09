/**
 * ================================================================================
 * TC-ADMIN-STRUCTURE-01: Verify Add Unit Under Root Valid
 * Modul    : Admin - Organization - Structure
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-STRUCTURE-01-Verify-Add-Unit-Under-Root-Valid.spec.ts
 * Path     : tests/admin/structure/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Organization Unit baru langsung di bawah
 *   root ("OrangeHRM") berhasil tersimpan via POST /api/v2/admin/
 *   subunits dan muncul di tree setelah di-refresh.
 *
 *   [TEMUAN TEKNIS] Tree TIDAK auto-refresh sendiri setelah Save --
 *   dikonfirmasi live bahwa node baru belum muncul tanpa reload. TC ini
 *   karena itu reload (goto() + enableEdit() lagi, yang men-trigger GET
 *   /api/v2/admin/subunits?mode=tree ulang) sebelum assert node muncul.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/structure/TC-ADMIN-STRUCTURE-01-Verify-Add-Unit-Under-Root-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-STRUCTURE-01: adding an organization unit under root succeeds', async ({
  page,
  adminStructurePage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-STRUCTURE-01', 'Add Unit Under Root Valid', env.baseURL, page);
  const unitName = uniqueName('QaUnit');

  report.step('Toggle Edit, pilih root, klik Add, isi Name, Save');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  await adminStructurePage.addUnderRoot();
  await adminStructurePage.nameInput.fill(unitName);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/subunits') && r.request().method() === 'POST'),
    adminStructurePage.save(),
  ]);

  report.step('Verify response POST subunits, dan unit muncul di tree setelah refresh');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  report.check(
    `Unit "${unitName}" muncul di tree`,
    await adminStructurePage.nodeByName(unitName).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.step('Cleanup: hapus unit yang baru dibuat');
  const node = adminStructurePage.nodeByName(unitName).first();
  if (await node.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await adminStructurePage.deleteNode(node);
    await page.waitForTimeout(1000);
  }

  report.print();
});
