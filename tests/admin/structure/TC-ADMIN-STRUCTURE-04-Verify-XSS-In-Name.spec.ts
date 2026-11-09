/**
 * ================================================================================
 * TC-ADMIN-STRUCTURE-04: Verify XSS In Name
 * Modul    : Admin - Organization - Structure
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-STRUCTURE-04-Verify-XSS-In-Name.spec.ts
 * Path     : tests/admin/structure/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Organization Unit Name tidak
 *   tereksekusi sebagai script saat tersimpan dan ditampilkan kembali
 *   di tree.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/structure/TC-ADMIN-STRUCTURE-04-Verify-XSS-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-STRUCTURE-04: an XSS payload in Organization Unit Name does not execute', async ({
  page,
  adminStructurePage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-STRUCTURE-04', 'XSS In Name', env.baseURL, page);
  const payload = `${uniqueName('QaXss')}<script>window.__xss=true</script>`;

  report.step('Toggle Edit, pilih root, klik Add, isi Name dengan payload XSS, Save');
  await adminStructurePage.goto();
  await adminStructurePage.enableEdit();
  await adminStructurePage.addUnderRoot();
  await adminStructurePage.nameInput.fill(payload);
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/subunits') && r.request().method() === 'POST', { timeout: 8_000 }).catch(() => null),
    adminStructurePage.save(),
  ]);
  await page.waitForTimeout(1200);

  report.step('Verify: tidak ada eksekusi script (window.__xss tidak ter-set)');
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xss?: boolean }).__xss === true)
    .catch(() => false);
  report.check('Payload XSS TIDAK tereksekusi sebagai script', xssExecuted === false);

  report.step('Cleanup: hapus unit yang baru dibuat');
  if (resp && resp.status() === 200) {
    await adminStructurePage.goto();
    await adminStructurePage.enableEdit();
    const node = adminStructurePage.nodeByName(payload.slice(0, 20)).first();
    if (await node.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await adminStructurePage.deleteNode(node);
      await page.waitForTimeout(1000);
    }
  }

  report.print();
});
