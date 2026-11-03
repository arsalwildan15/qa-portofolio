/**
 * ================================================================================
 * TC-LOGIN-15 — Verify Whitespace-Only Username Shows Validation
 * Modul    : Login
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-15-Verify-Whitespace-Only-Username-Shows-Validation.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi username berisi spasi saja ("   ") diperlakukan sebagai
 *   kosong oleh client (di-trim), sehingga validasi "Required" muncul dan
 *   request TIDAK pernah dikirim ke server.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-15-Verify-Whitespace-Only-Username-Shows-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';
import { env } from '../../src/config/env';

test('TC-LOGIN-15: whitespace-only username shows validation error', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport(
    'TC-LOGIN-15',
    'Whitespace-Only Username Shows Validation',
    env.baseURL,
    page,
  );

  report.step('Navigate ke login, monitor POST /auth/validate');
  await loginPage.goto();
  let submitted = false;
  page.on('request', (req) => {
    if (req.url().includes('/auth/validate')) submitted = true;
  });

  report.step('Fill Username = "   " (3 spasi), Password = "admin123", klik Login');
  await loginPage.login('   ', 'admin123');

  report.step('Verify validasi client-side dan bahwa request TIDAK terkirim');
  await isVisibleWithWait(loginPage.requiredValidationMessages.first());
  report.check(
    'count(.oxd-input-field-error-message) === 1',
    (await loginPage.requiredValidationMessages.count()) === 1,
  );
  report.check('POST /auth/validate TIDAK terkirim', submitted === false);

  report.print();
});
