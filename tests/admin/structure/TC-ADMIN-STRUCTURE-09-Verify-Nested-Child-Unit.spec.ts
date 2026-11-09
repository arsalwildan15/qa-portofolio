/**
 * ================================================================================
 * TC-ADMIN-STRUCTURE-09: Verify Nested Child Unit
 * Modul    : Admin - Organization - Structure
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-STRUCTURE-09-Verify-Nested-Child-Unit.spec.ts
 * Path     : tests/admin/structure/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi screen ini benar-benar HIERARKI BERTINGKAT (bukan
 *   flat list seperti sub-screen Admin lain) -- menambah unit anak DI
 *   BAWAH unit lain (bukan di bawah root) lewat ikon "plus" (ikon
 *   KETIGA per node, dikonfirmasi live) berhasil, dan unit anak muncul
 *   bersarang di bawah parent-nya, bukan sejajar di bawah root.
 *
 *   Parent unit dibuat sendiri oleh TC ini (bukan node seed asli seperti
 *   "Administration") supaya tidak menyentuh struktur organisasi nyata
 *   milik demo publik. Parent + child dibersihkan di akhir test.
 *
 *   [TEMUAN TEKNIS] Node yang baru menerima child PERTAMA-nya TIDAK
 *   auto-expand -- dikonfirmasi live lewat GET /api/v2/admin/subunits?
 *   mode=tree langsung: child SUDAH benar ter-nested di bawah parent
 *   di data API, tapi tetap tersembunyi secara visual (collapsed) sampai
 *   chevron toggle parent di-klik, bahkan setelah full page reload. TC
 *   ini meng-klik toggle tersebut (AdminStructurePage.expandNode())
 *   sebelum memverifikasi child terlihat -- bukan workaround menutupi
 *   bug, karena data API-nya sendiri sudah benar; ini perilaku expand/
 *   collapse tree yang normal.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/structure/TC-ADMIN-STRUCTURE-09-Verify-Nested-Child-Unit.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-STRUCTURE-09: adding a child unit under a non-root unit nests it correctly', async ({
  page,
  adminStructurePage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-STRUCTURE-09', 'Nested Child Unit', env.baseURL, page);
  const parentName = uniqueName('QaParentUnit');
  const childName = uniqueName('QaChildUnit');

  report.step('Buat parent unit sendiri di bawah root');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  await adminStructurePage.addUnderRoot();
  await adminStructurePage.nameInput.fill(parentName);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/subunits') && r.request().method() === 'POST'),
    adminStructurePage.save(),
  ]);

  report.step('Reload, klik ikon plus (ikon ketiga) pada parent unit untuk tambah child, isi Name, Save');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  const parentNode = adminStructurePage.nodeByName(parentName).first();
  await parentNode.waitFor({ state: 'visible', timeout: 5_000 });
  await adminStructurePage.addChildUnder(parentNode);
  const helperText = await page.getByText(`This unit will be added under ${parentName}`, { exact: false }).isVisible({ timeout: 3_000 }).catch(() => false);
  report.check(`Dialog menyebut parent "${parentName}" sebagai induk`, helperText);
  await adminStructurePage.nameInput.fill(childName);
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/subunits') && r.request().method() === 'POST'),
    adminStructurePage.save(),
  ]);
  report.check('[API] Child unit tersimpan (status === 200)', resp.status() === 200, `status=${resp.status()}`);

  report.step('Reload, expand parent (child baru tidak auto-expand), verify child bersarang di bawahnya');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  const parentNodeAfter = adminStructurePage.nodeByName(parentName).first();
  await parentNodeAfter.waitFor({ state: 'visible', timeout: 5_000 });
  await adminStructurePage.expandNode(parentNodeAfter);

  const childNode = adminStructurePage.nodeByName(childName).first();
  report.check(`Child "${childName}" muncul di tree setelah parent di-expand`, await childNode.isVisible({ timeout: 5_000 }).catch(() => false));

  const parentLi = parentNodeAfter.locator('xpath=ancestor::li[contains(@class,"oxd-tree-node")][1]');
  const nestedUnderParent = await parentLi
    .locator('.oxd-tree-node-child')
    .filter({ hasText: childName })
    .first()
    .isVisible({ timeout: 3_000 })
    .catch(() => false);
  report.check('Child bersarang secara struktural DI DALAM li parent (bukan sejajar di bawah root)', nestedUnderParent);

  report.step('Cleanup: hapus child lalu parent');
  const childCleanup = adminStructurePage.nodeByName(childName).first();
  if (await childCleanup.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await adminStructurePage.deleteNode(childCleanup);
    await page.waitForTimeout(1000);
  }
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  const parentCleanup = adminStructurePage.nodeByName(parentName).first();
  if (await parentCleanup.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await adminStructurePage.deleteNode(parentCleanup);
    await page.waitForTimeout(1000);
  }

  report.print();
});
