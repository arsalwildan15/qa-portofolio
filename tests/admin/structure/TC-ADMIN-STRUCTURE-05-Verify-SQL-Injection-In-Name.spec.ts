/**
 * ================================================================================
 * TC-ADMIN-STRUCTURE-05: Verify SQL Injection In Name
 * Modul    : Admin - Organization - Structure
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-STRUCTURE-05-Verify-SQL-Injection-In-Name.spec.ts
 * Path     : tests/admin/structure/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection (`' OR '1'='1`) di Organization
 *   Unit Name ditangani dengan aman -- tidak ada HTTP 500/stack trace
 *   yang mengindikasikan query SQL rusak.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/structure/TC-ADMIN-STRUCTURE-05-Verify-SQL-Injection-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-STRUCTURE-05: a SQL injection payload in Organization Unit Name is handled safely', async ({
  page,
  adminStructurePage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-STRUCTURE-05', 'SQL Injection In Name', env.baseURL, page);
  const sqlPayload = `' OR '1'='1`;

  report.step('Toggle Edit, pilih root, klik Add, isi Name dengan payload SQLi, Save');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  await adminStructurePage.addUnderRoot();
  await adminStructurePage.nameInput.fill(sqlPayload);
  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/subunits') && r.request().method() === 'POST', { timeout: 8_000 })
    .catch(() => null);
  await adminStructurePage.save();
  const resp = await respPromise;
  await page.waitForTimeout(1000);

  report.step('Verify: tidak ada response 500 dari POST subunits');
  report.check('Tidak ada response 500 (server error)', !resp || resp.status() !== 500, `status=${resp?.status() ?? 'tidak ada response'}`);
  report.finding('Payload SQLi di Organization Unit Name', `POST subunits -> ${resp ? `status=${resp.status()}` : 'tidak ada response terkirim'}, payload="${sqlPayload}"`);

  report.step('Cleanup: hapus unit jika sempat tersimpan');
  if (resp && resp.status() === 200) {
    await adminStructurePage.goto();
    await adminStructurePage.enableEdit();
    const node = adminStructurePage.nodeByName(sqlPayload).first();
    if (await node.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await adminStructurePage.deleteNode(node);
      await page.waitForTimeout(1000);
    }
  }

  report.print();
});
