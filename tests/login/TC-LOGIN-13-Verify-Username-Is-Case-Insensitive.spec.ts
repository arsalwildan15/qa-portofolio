/**
 * ================================================================================
 * TC-LOGIN-13 — Verify Username Is Case-Insensitive [TEMUAN]
 * Modul    : Login
 * Kategori : Edge Case (!) — direklasifikasi dari Negative, lihat TUJUAN
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-13-Verify-Username-Is-Case-Insensitive.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Awalnya TC ini mengasumsikan username case-sensitive (pola umum di
 *   aplikasi lain) dan ditulis untuk memverifikasi "admin" (huruf kecil)
 *   DITOLAK. Verifikasi langsung ke server membuktikan SEBALIKNYA:
 *   "admin" berhasil login dengan akun "Admin". TC ini ditulis ulang
 *   untuk mendokumentasikan perilaku AKTUAL, bukan asumsi awal yang
 *   salah. Password TETAP case-sensitive (lihat TC-LOGIN-14).
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-13-Verify-Username-Is-Case-Insensitive.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, urlMatchesWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-13: username is case-insensitive (documented finding)', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-13', 'Username Is Case-Insensitive', env.baseURL, page);

  report.step(`Navigate ke login, fill Username = "${env.username.toLowerCase()}" (lowercase)`);
  await loginPage.goto();
  await loginPage.login(env.username.toLowerCase(), env.password);

  report.step('Verify hasil login');
  report.check(
    'URL mengandung "/dashboard/index"',
    await urlMatchesWithWait(page, /dashboard\/index/),
    `url=${page.url()}`,
  );

  report.finding(
    'Username case-sensitivity',
    `Username "${env.username}" TIDAK case-sensitive pada instance ini — ` +
      `"${env.username.toLowerCase()}" berhasil login. Asumsi awal (case-sensitive) SALAH.`,
  );

  report.print();
});
