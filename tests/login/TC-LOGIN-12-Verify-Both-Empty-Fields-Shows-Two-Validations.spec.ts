/**
 * ================================================================================
 * TC-LOGIN-12 — Verify Both Empty Fields Shows Two Validations
 * Modul    : Login
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-12-Verify-Both-Empty-Fields-Shows-Two-Validations.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form kosong total menampilkan TEPAT 2 pesan
 *   validasi "Required" (satu per field) dan form tidak pernah submit.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-12-Verify-Both-Empty-Fields-Shows-Two-Validations.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-12: empty username and password shows two validation messages', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-12', 'Both Empty Fields Shows Two Validations', env.baseURL);

  report.step('Navigate ke halaman login, langsung klik "Login" tanpa isi apapun');
  await loginPage.goto();
  await loginPage.loginButton.click();

  report.step('Verify kedua pesan validasi muncul');
  await isVisibleWithWait(loginPage.requiredValidationMessages.first());
  report.check(
    'count(.oxd-input-field-error-message) === 2',
    (await loginPage.requiredValidationMessages.count()) === 2,
  );
  const texts = await loginPage.requiredValidationMessages.allTextContents();
  report.check(
    'Kedua pesan = "Required"',
    texts.every((t) => t === 'Required'),
    `texts=${JSON.stringify(texts)}`,
  );
  report.check('URL tetap "/auth/login"', /auth\/login/.test(page.url()));

  report.print();
});
