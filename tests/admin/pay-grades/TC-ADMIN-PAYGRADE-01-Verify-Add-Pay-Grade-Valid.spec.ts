/**
 * ================================================================================
 * TC-ADMIN-PAYGRADE-01: Verify Add Pay Grade Valid
 * Modul    : Admin - Pay Grades
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-PAYGRADE-01-Verify-Add-Pay-Grade-Valid.spec.ts
 * Path     : tests/admin/pay-grades/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Pay Grade baru (Name) berhasil tersimpan via
 *   POST /api/v2/admin/pay-grades dan muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/pay-grades/TC-ADMIN-PAYGRADE-01-Verify-Add-Pay-Grade-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-PAYGRADE-01: adding a pay grade with valid data succeeds', async ({
  page,
  adminPayGradesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-PAYGRADE-01', 'Add Pay Grade Valid', env.baseURL, page);
  const name = uniqueName('QaPayGrade');

  report.step('Isi Name, klik Save');
  await adminPayGradesPage.gotoAdd();
  await adminPayGradesPage.nameInput.fill(name);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/pay-grades') && r.request().method() === 'POST'),
    adminPayGradesPage.save(),
  ]);

  report.step('Verify response POST pay-grades, dan pay grade muncul di list');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await adminPayGradesPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `Pay grade "${name}" muncul di list`,
    await adminPayGradesPage.rowByName(name).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.print();
});
