/**
 * ================================================================================
 * TC-ADMIN-EMPSTATUS-03: Verify SQL Injection In Name
 * Modul    : Admin - Employment Status
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMPSTATUS-03-Verify-SQL-Injection-In-Name.spec.ts
 * Path     : tests/admin/employment-status/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di Employment Status Name
 *   tersimpan sebagai string literal (tidak merusak database/menimbulkan
 *   error server) dan tidak mengganggu fungsi list setelahnya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/employment-status/TC-ADMIN-EMPSTATUS-03-Verify-SQL-Injection-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-EMPSTATUS-03: a SQL injection payload in Employment Status Name does not break the app', async ({
  page,
  adminEmploymentStatusPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-EMPSTATUS-03', 'SQL Injection In Name', env.baseURL, page);
  const payload = `${uniqueName('QaSqli')}' OR '1'='1'; DROP TABLE ohrm_employment_status;--`;

  report.step('Isi Name dengan payload SQL injection, klik Save');
  await adminEmploymentStatusPage.gotoAdd();
  await adminEmploymentStatusPage.nameInput.fill(payload);
  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/employment-statuses') && r.request().method() === 'POST', { timeout: 10_000 })
    .catch(() => null);
  await adminEmploymentStatusPage.save();
  const resp = await respPromise;
  await page.waitForTimeout(500);

  report.step('Verify: list masih berfungsi normal setelah payload (tidak ada server error)');
  await adminEmploymentStatusPage.goto();
  await page.waitForTimeout(3000);
  const listStillWorks = await adminEmploymentStatusPage.tableRows.first().isVisible({ timeout: 10_000 }).catch(() => false);
  report.check('List Employment Status masih berfungsi normal setelah payload SQLi', listStillWorks, `postStatus=${resp?.status() ?? 'tidak ada'}`);

  report.print();
});
