/**
 * ================================================================================
 * TC-ADMIN-JOBCAT-01: Verify Add Job Category Valid
 * Modul    : Admin - Job Categories
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-JOBCAT-01-Verify-Add-Job-Category-Valid.spec.ts
 * Path     : tests/admin/job-categories/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Job Category baru (Name) berhasil tersimpan
 *   via POST /api/v2/admin/job-categories dan muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/job-categories/TC-ADMIN-JOBCAT-01-Verify-Add-Job-Category-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-JOBCAT-01: adding a job category with valid data succeeds', async ({
  page,
  adminJobCategoriesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-JOBCAT-01', 'Add Job Category Valid', env.baseURL, page);
  const name = uniqueName('QaJobCat');

  report.step('Isi Name, klik Save');
  await adminJobCategoriesPage.gotoAdd();
  await adminJobCategoriesPage.nameInput.fill(name);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/job-categories') && r.request().method() === 'POST'),
    adminJobCategoriesPage.save(),
  ]);

  report.step('Verify response POST job-categories, dan job category muncul di list');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await adminJobCategoriesPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `Job category "${name}" muncul di list`,
    await adminJobCategoriesPage.rowByName(name).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.print();
});
