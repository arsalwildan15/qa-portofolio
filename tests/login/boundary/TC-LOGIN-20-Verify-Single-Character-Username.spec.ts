/**
 * ================================================================================
 * TC-LOGIN-20 — Verify Single Character Username
 * Modul    : Login
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-20-Verify-Single-Character-Username.spec.ts
 * Path     : tests/login/boundary/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi username 1 karakter (minimum non-empty boundary)
 *   diterima form dan ditolak dengan benar sebagai invalid.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/boundary/TC-LOGIN-20-Verify-Single-Character-Username.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-LOGIN-20: single character username is handled correctly', async ({ page, loginPage }) => {
  const report = new TestReport('TC-LOGIN-20', 'Single Character Username', env.baseURL, page);

  report.step('Navigate ke login, fill Username = "A", Password valid, klik Login');
  await loginPage.goto();
  await loginPage.login('A', env.password);

  report.step('Verify login ditolak sebagai invalid');
  report.check('Error "Invalid credentials" visible', await isVisibleWithWait(loginPage.errorMessage));
  report.check(
    'Error berisi "Invalid credentials"',
    (await loginPage.errorMessage.textContent())?.includes('Invalid credentials') ?? false,
  );

  report.print();
});
