/**
 * ================================================================================
 * TC-LOGIN-09 — Verify Both Fields Invalid Shows Error
 * Modul    : Login
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-09-Verify-Both-Fields-Invalid-Shows-Error.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi username dan password yang sama-sama salah ditolak
 *   dengan respons 302 yang SAMA PERSIS dengan kasus satu field salah
 *   (TC-LOGIN-07/08) — tidak ada differential response yang membocorkan
 *   field mana yang sebenarnya benar.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-09-Verify-Both-Fields-Invalid-Shows-Error.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-09: both invalid username and password shows error', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-09', 'Both Fields Invalid Shows Error', env.baseURL, page);

  report.step('Navigate ke halaman login');
  await loginPage.goto();

  report.step('Fill Username = "wronguser", Password = "wrongpass"; intercept POST /auth/validate');
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login('wronguser', 'wrongpass'),
  ]);

  report.step('Verify response /auth/validate');
  report.check('response.status() === 302', response.status() === 302, `status=${response.status()}`);
  const location = response.headers()['location'] ?? '';
  report.check(
    'Header Location mengandung "/auth/login"',
    location.includes('/auth/login'),
    `location="${location}"`,
  );

  report.step('Verify UI: pesan error generik, tidak membedakan field mana yang salah');
  report.check('Error ".oxd-alert--error" visible', await isVisibleWithWait(loginPage.errorMessage));
  report.check(
    'Error berisi "Invalid credentials"',
    (await loginPage.errorMessage.textContent())?.includes('Invalid credentials') ?? false,
  );

  report.print();
});
