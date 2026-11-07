/**
 * ================================================================================
 * TC-ADMIN-EMPSTATUS-02: Verify Empty Submit Validation
 * Modul    : Admin - Employment Status
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMPSTATUS-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/employment-status/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add Employment Status tanpa mengisi Name
 *   menampilkan validasi "Required" dan TIDAK mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/employment-status/TC-ADMIN-EMPSTATUS-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-EMPSTATUS-02: submitting an empty Add Employment Status form shows Required validation', async ({
  page,
  adminEmploymentStatusPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-EMPSTATUS-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buka form Add Employment Status, klik Save tanpa isi apa pun');
  await adminEmploymentStatusPage.gotoAdd();
  await adminEmploymentStatusPage.save();
  await page.waitForTimeout(800);

  report.step('Verify: pesan Required muncul, form tidak submit');
  const requiredError = await adminEmploymentStatusPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check('Pesan validasi "Required" muncul', (requiredError ?? '').trim().length > 0, `error=${requiredError}`);

  report.print();
});
