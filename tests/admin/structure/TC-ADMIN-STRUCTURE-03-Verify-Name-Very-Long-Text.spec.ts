/**
 * ================================================================================
 * TC-ADMIN-STRUCTURE-03: Verify Name Very Long Text
 * Modul    : Admin - Organization - Structure
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-STRUCTURE-03-Verify-Name-Very-Long-Text.spec.ts
 * Path     : tests/admin/structure/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan perilaku saat Name unit organisasi diisi 300
 *   karakter. Hasil dicatat via finding(), bukan hard check, karena
 *   belum ada ekspektasi batas panjang yang dikonfirmasi untuk field
 *   ini. Unit dihapus lagi di akhir test jika sempat tersimpan (shared
 *   demo hygiene -- tree org chart ini tampil mencolok bagi semua user).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/structure/TC-ADMIN-STRUCTURE-03-Verify-Name-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-STRUCTURE-03: a 300-character unit Name is documented as-is', async ({
  page,
  adminStructurePage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-STRUCTURE-03', 'Name Very Long Text', env.baseURL, page);
  const longName = 'U'.repeat(300);

  report.step('Toggle Edit, pilih root, klik Add, isi Name 300 char, Save');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  await adminStructurePage.addUnderRoot();
  await adminStructurePage.nameInput.fill(longName);

  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/subunits') && r.request().method() === 'POST', { timeout: 8_000 })
    .catch(() => null);
  await adminStructurePage.save();
  const resp = await respPromise;
  await page.waitForTimeout(1000);
  const errorText = await adminStructurePage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);

  report.step('Catat hasil apa adanya (diterima / ditolak / terpotong)');
  report.finding(
    'Organization Unit Name 300 karakter',
    resp
      ? `POST terkirim -> status=${resp.status()} (${resp.status() === 200 ? 'DITERIMA' : 'ditolak server-side'}), errorClientSide=${errorText ?? 'tidak ada'}`
      : `TIDAK ADA POST terkirim (ditolak client-side), errorClientSide=${errorText ?? 'tidak ada'}`,
  );
  report.check('TC dijalankan tanpa exception', true);

  report.step('Cleanup: hapus unit jika sempat tersimpan');
  if (resp && resp.status() === 200) {
    await adminStructurePage.goto();
    await adminStructurePage.enableEdit();
    const node = adminStructurePage.nodeByName(longName.slice(0, 50)).first();
    if (await node.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await adminStructurePage.deleteNode(node);
      await page.waitForTimeout(1000);
    }
  }

  report.print();
});
