/**
 * ================================================================================
 * TC-ADMIN-EMPSTATUS-01: Verify Add Employment Status Valid
 * Modul    : Admin - Employment Status
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMPSTATUS-01-Verify-Add-Employment-Status-Valid.spec.ts
 * Path     : tests/admin/employment-status/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Employment Status baru (Name) berhasil
 *   tersimpan via POST /api/v2/admin/employment-statuses dan muncul di
 *   list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/employment-status/TC-ADMIN-EMPSTATUS-01-Verify-Add-Employment-Status-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-EMPSTATUS-01: adding an employment status with valid data succeeds', async ({
  page,
  adminEmploymentStatusPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-EMPSTATUS-01', 'Add Employment Status Valid', env.baseURL, page);
  const name = uniqueName('QaEmpStatus');

  report.step('Isi Name, klik Save');
  await adminEmploymentStatusPage.gotoAdd();
  await adminEmploymentStatusPage.nameInput.fill(name);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/employment-statuses') && r.request().method() === 'POST'),
    adminEmploymentStatusPage.save(),
  ]);

  report.step('Verify response POST employment-statuses, dan status muncul di list');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await adminEmploymentStatusPage.goto();
  await page.waitForTimeout(3000);
  report.check(
    `Employment status "${name}" muncul di list`,
    await adminEmploymentStatusPage.rowByName(name).first().isVisible({ timeout: 10_000 }).catch(() => false),
  );

  report.print();
});
