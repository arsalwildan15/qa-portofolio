/**
 * ================================================================================
 * TC-LOGIN-10 — Verify Empty Username Shows Validation
 * Modul    : Login
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-10-Verify-Empty-Username-Shows-Validation.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengosongkan Username menampilkan 1 pesan validasi
 *   client-side "Required" dan MEMBLOKIR submit — POST /auth/validate
 *   tidak pernah terkirim ke server sama sekali.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-10-Verify-Empty-Username-Shows-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-10: empty username shows required validation', async ({ page, loginPage }) => {
  const report = new TestReport('TC-LOGIN-10', 'Empty Username Shows Validation', env.baseURL, page);

  report.step('Navigate ke halaman login, isi Password saja (Username kosong)');
  await loginPage.goto();
  await loginPage.passwordInput.fill(env.password);

  report.step('Monitor request POST /auth/validate, klik "Login"');
  let submitted = false;
  page.on('request', (req) => {
    if (req.url().includes('/auth/validate')) submitted = true;
  });
  await loginPage.loginButton.click();

  report.step('Verify validasi client-side dan bahwa request TIDAK terkirim');
  await isVisibleWithWait(loginPage.requiredValidationMessages.first());
  report.check(
    'count(.oxd-input-field-error-message) === 1',
    (await loginPage.requiredValidationMessages.count()) === 1,
  );
  report.check(
    'Pesan validasi = "Required"',
    (await loginPage.requiredValidationMessages.first().textContent()) === 'Required',
  );
  report.check('POST /auth/validate TIDAK terkirim', submitted === false);

  report.print();
});
