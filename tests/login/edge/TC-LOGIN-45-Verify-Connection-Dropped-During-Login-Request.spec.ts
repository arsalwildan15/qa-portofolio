/**
 * ================================================================================
 * TC-LOGIN-45 — Verify Connection Dropped During Login Request
 * Modul    : Login
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-45-Verify-Connection-Dropped-During-Login-Request.spec.ts
 * Path     : tests/login/edge/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi perilaku form login saat koneksi jaringan terputus
 *   TEPAT SAAT request POST /auth/validate sedang berjalan (bukan sudah
 *   gagal dari awal). Belum pernah diuji di seluruh suite ini
 *   sebelumnya. User harus mendapat indikasi gagal yang jelas (bukan
 *   silent hang atau seolah berhasil), dan form harus tetap bisa
 *   dicoba ulang setelah koneksi pulih.
 *
 * TEKNIK:
 *   POST /auth/validate di-intercept via page.route() dan di-abort()
 *   (mensimulasikan network failure asli), bukan diteruskan ke server.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/edge/TC-LOGIN-45-Verify-Connection-Dropped-During-Login-Request.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-LOGIN-45: a dropped connection during login submit shows a failure, not a silent hang or false success', async ({
  page,
  loginPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-LOGIN-45', 'Connection Dropped During Login Request', env.baseURL, page);

  report.step('Intercept POST /auth/validate dan abort() (simulasi koneksi terputus), isi kredensial valid, klik Login');
  await page.route('**/auth/validate', (route) => route.abort('failed'));

  await loginPage.goto();
  await loginPage.usernameInput.fill(env.username);
  await loginPage.passwordInput.fill(env.password);
  await loginPage.loginButton.click();
  await page.waitForTimeout(2500);

  report.check(
    'Halaman TIDAK pindah ke /dashboard/index (tidak ada false-success)',
    !page.url().includes('/dashboard/index'),
    `url=${page.url()}`,
  );

  // NOTE 2026-11-12: Login di app ini pakai <form method="POST"> navigasi top-level ASLI
  // (bukan XHR/fetch), jadi route.abort() pada request itu = navigasi TOP-LEVEL gagal --
  // browser mengganti seluruh dokumen dgn halaman error native (chrome-error://...), BUKAN
  // tetap di SPA /auth/login dgn pesan error inline. Konfirmasi via screenshot test run
  // pertama: field Username tidak lagi ada di DOM sama sekali setelah abort. loginPage.goto()
  // (navigasi BARU, bukan reload/re-fill di dokumen yg sudah hilang) dipakai utk pulih.
  report.finding(
    'Perilaku saat koneksi terputus',
    'Form submit adalah navigasi top-level asli -- browser menampilkan halaman error native ' +
      '(bukan pesan error inline di SPA) saat request gagal total. User harus navigasi ulang ' +
      'ke halaman login (refresh/re-visit), bukan sekadar mencoba lagi di tempat.',
  );

  report.step('Pulihkan koneksi (unroute), navigasi ulang ke halaman login, coba login lagi');
  await page.unroute('**/auth/validate');
  await loginPage.goto();
  await loginPage.usernameInput.fill(env.username);
  await loginPage.passwordInput.fill(env.password);
  await loginPage.loginButton.click();
  await page.waitForTimeout(2500);
  report.check(
    'Setelah koneksi pulih, login ulang berhasil normal (URL /dashboard/index)',
    page.url().includes('/dashboard/index'),
    `url=${page.url()}`,
  );

  report.print();
});
