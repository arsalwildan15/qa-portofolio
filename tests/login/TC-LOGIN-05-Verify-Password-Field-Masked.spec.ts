/**
 * ================================================================================
 * TC-LOGIN-05 — Verify Password Field Masked
 * Modul    : Login
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-05-Verify-Password-Field-Masked.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi input Password memiliki type="password" (ter-mask) baik
 *   sebelum maupun sesudah diisi — attribute-nya tidak berubah ke "text"
 *   saat user mengetik.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-05-Verify-Password-Field-Masked.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

test('TC-LOGIN-05: password input is masked', async ({ loginPage }) => {
  const report = new TestReport('TC-LOGIN-05', 'Password Field Masked', env.baseURL);

  report.step('Navigate ke halaman login');
  await loginPage.goto();

  report.step('Verify attribute type password SEBELUM diisi');
  const typeBefore = await loginPage.passwordInput.getAttribute('type');
  report.check('type="password" sebelum diisi', typeBefore === 'password', `type="${typeBefore}"`);

  report.step('Fill password "admin123"');
  await loginPage.passwordInput.fill('admin123');

  report.step('Verify attribute type password SESUDAH diisi (tidak berubah)');
  const typeAfter = await loginPage.passwordInput.getAttribute('type');
  report.check('type="password" sesudah diisi', typeAfter === 'password', `type="${typeAfter}"`);

  report.print();
});
