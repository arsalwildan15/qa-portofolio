/**
 * ================================================================================
 * TC-LOGIN-27 — Verify HTML Injection In Username
 * Modul    : Login
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-27-Verify-HTML-Injection-In-Username.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload HTML injection pada username tidak dirender
 *   sebagai elemen DOM hidup — harus tetap inert text, bukan heading asli.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-27-Verify-HTML-Injection-In-Username.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-27: HTML injection in username is not rendered', async ({ page, loginPage }) => {
  const report = new TestReport('TC-LOGIN-27', 'HTML Injection In Username', env.baseURL, page);

  report.step('Navigate ke login, fill Username = "<h1>Hacked</h1>", Password = "admin123", klik Login');
  await loginPage.goto();
  await loginPage.login('<h1>Hacked</h1>', 'admin123');

  report.step('Verify tidak ada heading "Hacked" yang benar-benar dirender');
  report.check(
    'count(heading "Hacked") === 0',
    (await page.getByRole('heading', { name: 'Hacked' }).count()) === 0,
  );
  report.check('Error "Invalid credentials" visible', await isVisibleWithWait(loginPage.errorMessage));

  report.print();
});
