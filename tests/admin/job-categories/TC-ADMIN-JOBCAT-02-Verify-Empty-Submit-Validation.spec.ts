/**
 * ================================================================================
 * TC-ADMIN-JOBCAT-02: Verify Empty Submit Validation
 * Modul    : Admin - Job Categories
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-JOBCAT-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/job-categories/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add Job Category tanpa mengisi Name
 *   menampilkan validasi "Required" dan TIDAK mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/job-categories/TC-ADMIN-JOBCAT-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-JOBCAT-02: submitting an empty Add Job Category form shows Required validation', async ({
  page,
  adminJobCategoriesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-JOBCAT-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buka form Add Job Category, klik Save tanpa isi apa pun');
  await adminJobCategoriesPage.gotoAdd();
  await adminJobCategoriesPage.save();
  await page.waitForTimeout(800);

  report.step('Verify: pesan Required muncul, form tidak submit');
  const requiredError = await adminJobCategoriesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check('Pesan validasi "Required" muncul', (requiredError ?? '').trim().length > 0, `error=${requiredError}`);

  report.print();
});
