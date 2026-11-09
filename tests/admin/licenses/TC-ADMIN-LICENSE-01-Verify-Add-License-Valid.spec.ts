/**
 * ================================================================================
 * TC-ADMIN-LICENSE-01: Verify Add License Valid
 * Modul    : Admin - Qualifications - Licenses
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LICENSE-01-Verify-Add-License-Valid.spec.ts
 * Path     : tests/admin/licenses/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah License baru (Name) berhasil tersimpan via
 *   POST /api/v2/admin/licenses dan muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/licenses/TC-ADMIN-LICENSE-01-Verify-Add-License-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-LICENSE-01: adding a license with valid data succeeds', async ({
  page,
  adminLicensesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-LICENSE-01', 'Add License Valid', env.baseURL, page);
  const name = uniqueName('QaLicense');

  report.step('Isi Name, klik Save');
  await adminLicensesPage.gotoAdd();
  await adminLicensesPage.nameInput.fill(name);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/licenses') && r.request().method() === 'POST'),
    adminLicensesPage.save(),
  ]);

  report.step('Verify response POST licenses, dan license muncul di list');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await adminLicensesPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `License "${name}" muncul di list`,
    await adminLicensesPage.rowByName(name).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.print();
});
