/**
 * ================================================================================
 * TC-ADMIN-MEMBERSHIP-06: Verify XSS In Name
 * Modul    : Admin - Memberships
 * Kategori : Security (S) 5.1-XSS-Stored
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-MEMBERSHIP-06-Verify-XSS-In-Name.spec.ts
 * Path     : tests/admin/memberships/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Membership Name tidak tereksekusi sebagai
 *   script saat tersimpan dan ditampilkan kembali di list. Unit ini
 *   sebelumnya hanya punya TC SQL injection (TC-ADMIN-MEMBERSHIP-04) -- XSS
 *   belum pernah diuji terpisah, pola yg sama dgn 9 unit referensi Admin
 *   lain (Job Titles, Job Categories, Skills, dst) sudah punya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/memberships/TC-ADMIN-MEMBERSHIP-06-Verify-XSS-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-MEMBERSHIP-06: an XSS payload in Membership Name does not execute', async ({
  page,
  adminMembershipsListPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-MEMBERSHIP-06', 'XSS In Name', env.baseURL, page);
  const payload = `${uniqueName('QaXss')}<script>window.__xss=true</script>`;

  report.step('Isi Name dengan payload XSS, klik Save');
  await adminMembershipsListPage.gotoAdd();
  await adminMembershipsListPage.nameInput.fill(payload);
  await adminMembershipsListPage.save();
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(1500);

  report.step('Verify: tidak ada eksekusi script (window.__xss tidak ter-set)');
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xss?: boolean }).__xss === true)
    .catch(() => false);
  report.check('Payload XSS TIDAK tereksekusi sebagai script', xssExecuted === false);

  report.print();
});
