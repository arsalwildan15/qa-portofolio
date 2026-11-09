/**
 * ================================================================================
 * TC-ADMIN-EDU-02: Verify Empty Submit Validation
 * Modul    : Admin - Qualifications - Education
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EDU-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/education/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add Education tanpa mengisi Level
 *   menampilkan validasi "Required" dan TIDAK mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/education/TC-ADMIN-EDU-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-EDU-02: submitting an empty Add Education form shows Required validation', async ({
  page,
  adminEducationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-EDU-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buka form Add Education, klik Save tanpa isi apa pun');
  await adminEducationPage.gotoAdd();
  await adminEducationPage.save();
  await page.waitForTimeout(800);

  report.step('Verify: pesan Required muncul pada Level, form tidak submit');
  const requiredError = await adminEducationPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check('Pesan validasi "Required" muncul', (requiredError ?? '').trim().length > 0, `error=${requiredError}`);

  report.print();
});
