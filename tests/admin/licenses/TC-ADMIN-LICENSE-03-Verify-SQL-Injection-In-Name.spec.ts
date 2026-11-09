/**
 * ================================================================================
 * TC-ADMIN-LICENSE-03: Verify SQL Injection In Name
 * Modul    : Admin - Qualifications - Licenses
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LICENSE-03-Verify-SQL-Injection-In-Name.spec.ts
 * Path     : tests/admin/licenses/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di License Name tersimpan sebagai
 *   string literal (tidak merusak database/menimbulkan error server) dan
 *   tidak mengganggu fungsi list setelahnya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/licenses/TC-ADMIN-LICENSE-03-Verify-SQL-Injection-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-LICENSE-03: a SQL injection payload in License Name does not break the app', async ({
  page,
  adminLicensesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-LICENSE-03', 'SQL Injection In Name', env.baseURL, page);
  const payload = `${uniqueName('QaSqli')}' OR '1'='1'; DROP TABLE ohrm_qualification_license;--`;

  report.step('Isi Name dengan payload SQL injection, klik Save');
  await adminLicensesPage.gotoAdd();
  await adminLicensesPage.nameInput.fill(payload);
  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/licenses') && r.request().method() === 'POST', { timeout: 10_000 })
    .catch(() => null);
  await adminLicensesPage.save();
  const resp = await respPromise;
  await page.waitForTimeout(500);

  report.step('Verify: list masih berfungsi normal setelah payload (tidak ada server error)');
  await adminLicensesPage.goto();
  await page.waitForTimeout(1200);
  const listStillWorks = await adminLicensesPage.tableRows.first().isVisible({ timeout: 5_000 }).catch(() => false);
  report.check('List Licenses masih berfungsi normal setelah payload SQLi', listStillWorks, `postStatus=${resp?.status() ?? 'tidak ada'}`);

  report.print();
});
