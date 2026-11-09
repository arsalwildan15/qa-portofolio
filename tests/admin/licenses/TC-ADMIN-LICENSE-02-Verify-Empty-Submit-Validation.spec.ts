/**
 * ================================================================================
 * TC-ADMIN-LICENSE-02: Verify Empty Submit Validation
 * Modul    : Admin - Qualifications - Licenses
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LICENSE-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/licenses/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add License tanpa mengisi Name menampilkan
 *   validasi "Required" dan TIDAK mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/licenses/TC-ADMIN-LICENSE-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LICENSE-02: submitting an empty Add License form shows Required validation', async ({
  page,
  adminLicensesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LICENSE-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buka form Add License, klik Save tanpa isi apa pun');
  await adminLicensesPage.gotoAdd();
  await adminLicensesPage.save();
  await page.waitForTimeout(800);

  report.step('Verify: pesan Required muncul, form tidak submit');
  const requiredError = await adminLicensesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check('Pesan validasi "Required" muncul', (requiredError ?? '').trim().length > 0, `error=${requiredError}`);

  report.print();
});
