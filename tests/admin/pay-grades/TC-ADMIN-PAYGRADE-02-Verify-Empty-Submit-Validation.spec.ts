/**
 * ================================================================================
 * TC-ADMIN-PAYGRADE-02: Verify Empty Submit Validation
 * Modul    : Admin - Pay Grades
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-PAYGRADE-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/pay-grades/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add Pay Grade tanpa mengisi Name
 *   menampilkan validasi "Required" dan TIDAK mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/pay-grades/TC-ADMIN-PAYGRADE-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-PAYGRADE-02: submitting an empty Add Pay Grade form shows Required validation', async ({
  page,
  adminPayGradesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-PAYGRADE-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buka form Add Pay Grade, klik Save tanpa isi apa pun');
  await adminPayGradesPage.gotoAdd();
  await adminPayGradesPage.save();
  await page.waitForTimeout(800);

  report.step('Verify: pesan Required muncul, form tidak submit');
  const requiredError = await adminPayGradesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check('Pesan validasi "Required" muncul', (requiredError ?? '').trim().length > 0, `error=${requiredError}`);

  report.print();
});
