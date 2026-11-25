/**
 * ================================================================================
 * TC-ADMIN-EMPSTATUS-06: Verify XSS In Name
 * Modul    : Admin - Employment Status
 * Kategori : Security (S) 5.1-XSS-Stored
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMPSTATUS-06-Verify-XSS-In-Name.spec.ts
 * Path     : tests/admin/employment-status/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Employment Status Name tidak tereksekusi
 *   sebagai script saat tersimpan dan ditampilkan kembali di list. Unit ini
 *   sebelumnya hanya punya TC SQL injection (TC-ADMIN-EMPSTATUS-03) -- XSS
 *   belum pernah diuji terpisah, pola yg sama dgn 9 unit referensi Admin
 *   lain (Job Titles, Job Categories, Skills, dst) sudah punya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/employment-status/TC-ADMIN-EMPSTATUS-06-Verify-XSS-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-EMPSTATUS-06: an XSS payload in Employment Status Name does not execute', async ({
  page,
  adminEmploymentStatusPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-EMPSTATUS-06', 'XSS In Name', env.baseURL, page);
  const payload = `${uniqueName('QaXss')}<script>window.__xss=true</script>`;

  report.step('Isi Name dengan payload XSS, klik Save');
  await adminEmploymentStatusPage.gotoAdd();
  await adminEmploymentStatusPage.nameInput.fill(payload);
  await adminEmploymentStatusPage.save();
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(1500);

  report.step('Verify: tidak ada eksekusi script (window.__xss tidak ter-set)');
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xss?: boolean }).__xss === true)
    .catch(() => false);
  report.check('Payload XSS TIDAK tereksekusi sebagai script', xssExecuted === false);

  report.print();
});
