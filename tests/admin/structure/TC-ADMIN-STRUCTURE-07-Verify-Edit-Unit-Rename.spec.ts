/**
 * ================================================================================
 * TC-ADMIN-STRUCTURE-07: Verify Edit Unit Rename
 * Modul    : Admin - Organization - Structure
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-STRUCTURE-07-Verify-Edit-Unit-Rename.spec.ts
 * Path     : tests/admin/structure/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengubah Name sebuah Organization Unit yang baru
 *   dibuat (lewat ikon pencil -- ikon KEDUA per node, dikonfirmasi live)
 *   dan Save berhasil memperbarui nama di tree -- perilaku dasar yang
 *   diharapkan bekerja untuk unit APAPUN, termasuk yang baru ditambah.
 *
 *   [BUG NYATA dikonfirmasi live -- TC ini SENGAJA dibiarkan FAILED]
 *   Menambah unit baru (lewat dialog "Add") mengirim unitId="" dan
 *   description="" (string kosong) ke POST /api/v2/admin/subunits, TAPI
 *   server menyimpan dan mengembalikannya sebagai `null` di response.
 *   Saat unit itu kemudian DI-EDIT (ganti Name saja, field lain tidak
 *   disentuh -- perilaku user yang realistis), form edit mem-prefill
 *   Unit Id/Description dari nilai `null` tersebut, dan saat Save,
 *   PUT /api/v2/admin/subunits/{id} mengirim ulang `unitId: null,
 *   description: null` -- yang kali ini DITOLAK server dengan HTTP 422
 *   "Invalid Parameter" (invalidParamKeys: ["unitId","description"]),
 *   padahal KEDUA field itu OPSIONAL (bukan di daftar "* Required").
 *   Akibatnya: SETIAP unit yang baru ditambah TIDAK BISA di-rename lagi
 *   tanpa dulu mengisi Unit Id dan Description secara manual -- regresi
 *   nyata antara flow Add (yang longgar menerima "") dan flow Edit
 *   (yang strict menolak null) untuk field opsional yang sama.
 *   Dikonfirmasi reproduce konsisten lewat network capture langsung
 *   (lihat detail response body di hasil eksekusi TC ini).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/structure/TC-ADMIN-STRUCTURE-07-Verify-Edit-Unit-Rename.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-STRUCTURE-07: renaming a freshly-created organization unit via the edit icon', async ({
  page,
  adminStructurePage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-STRUCTURE-07', 'Edit Unit Rename', env.baseURL, page);
  const originalName = uniqueName('QaUnitOriginal');
  const renamedName = uniqueName('QaUnitRenamed');

  report.step('Buat unit baru untuk di-rename');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  await adminStructurePage.addUnderRoot();
  await adminStructurePage.nameInput.fill(originalName);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/subunits') && r.request().method() === 'POST'),
    adminStructurePage.save(),
  ]);

  report.step('Reload tree, klik ikon edit (pencil, ikon kedua) pada unit tersebut, ubah HANYA Name (perilaku user realistis), Save');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  const node = adminStructurePage.nodeByName(originalName).first();
  await node.waitFor({ state: 'visible', timeout: 5_000 });
  await adminStructurePage.editNode(node);
  let putRequestBody = '';
  page.on('request', (req) => {
    if (req.url().includes('/api/v2/admin/subunits') && req.method() === 'PUT') putRequestBody = req.postData() ?? '';
  });
  await adminStructurePage.nameInput.fill(renamedName);
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/subunits') && ['PUT', 'POST'].includes(r.request().method()), { timeout: 8_000 }).catch(() => null),
    adminStructurePage.save(),
  ]);
  const respBody = resp ? await resp.text().catch(() => '') : '';

  report.step('Verify: rename SEHARUSNYA berhasil (unitId/description opsional, bukan Required)');
  report.check(
    'PUT edit TIDAK seharusnya ditolak 422 untuk field opsional yang tidak disentuh',
    resp?.status() === 200,
    `status=${resp?.status() ?? 'tidak ada response'}, requestBody=${putRequestBody}, responseBody=${respBody}`,
  );
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  report.check(
    `Unit dengan nama baru "${renamedName}" muncul di tree`,
    await adminStructurePage.nodeByName(renamedName).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.step('Cleanup: hapus unit (apa pun nama yang tersisa, original atau renamed)');
  const cleanupNode = adminStructurePage.nodeByName(renamedName).first();
  if (await cleanupNode.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await adminStructurePage.deleteNode(cleanupNode);
    await page.waitForTimeout(1000);
  } else {
    const fallbackNode = adminStructurePage.nodeByName(originalName).first();
    if (await fallbackNode.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await adminStructurePage.deleteNode(fallbackNode);
      await page.waitForTimeout(1000);
    }
  }

  report.print();
});
