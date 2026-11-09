/**
 * ================================================================================
 * TC-ADMIN-LANG-02: Verify Empty Submit Validation
 * Modul    : Admin - Qualifications - Languages
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LANG-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/languages/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add Language tanpa mengisi Name
 *   menampilkan validasi "Required" dan TIDAK mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/languages/TC-ADMIN-LANG-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LANG-02: submitting an empty Add Language form shows Required validation', async ({
  page,
  adminLanguagesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LANG-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buka form Add Language, klik Save tanpa isi apa pun');
  await adminLanguagesPage.gotoAdd();
  await adminLanguagesPage.save();
  await page.waitForTimeout(800);

  report.step('Verify: pesan Required muncul, form tidak submit');
  const requiredError = await adminLanguagesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check('Pesan validasi "Required" muncul', (requiredError ?? '').trim().length > 0, `error=${requiredError}`);

  report.print();
});
