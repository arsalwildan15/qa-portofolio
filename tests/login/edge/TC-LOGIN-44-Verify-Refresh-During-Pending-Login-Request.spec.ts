/**
 * ================================================================================
 * TC-LOGIN-44 — Verify Refresh During Pending Login Request
 * Modul    : Login
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-44-Verify-Refresh-During-Pending-Login-Request.spec.ts
 * Path     : tests/login/edge/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi apa yang terjadi kalau user me-refresh halaman TEPAT
 *   SAAT request login masih pending (belum dapat response). Ini skenario
 *   nyata (user tidak sabar/koneksi lambat lalu refresh), belum pernah
 *   diuji di seluruh suite ini sebelumnya. Risiko: request lama yang
 *   sudah sampai ke server tapi responsnya hilang krn reload bisa
 *   meninggalkan sesi "setengah jadi" -- cookie sesi valid terbentuk di
 *   server padahal browser/UI tidak pernah mengonfirmasi login berhasil.
 *
 * TEKNIK:
 *   POST /auth/validate di-intercept via page.route() dan DITUNDA 4
 *   detik sebelum diteruskan ke server asli -- supaya window waktu utk
 *   melakukan reload() SAAT request masih in-flight bisa dipastikan,
 *   bukan bergantung pada timing jaringan asli yang tidak reliable.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/edge/TC-LOGIN-44-Verify-Refresh-During-Pending-Login-Request.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-LOGIN-44: refreshing while the login request is still pending does not leave a half-authenticated session', async ({
  page,
  loginPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-LOGIN-44', 'Refresh During Pending Login Request', env.baseURL, page);

  report.step('Intercept POST /auth/validate, tunda 4 detik, isi kredensial valid, klik Login TANPA menunggu response');
  await page.route('**/auth/validate', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4_000));
    await route.continue().catch(() => {});
  });

  await loginPage.goto();
  await loginPage.usernameInput.fill(env.username);
  await loginPage.passwordInput.fill(env.password);
  void loginPage.loginButton.click().catch(() => {});
  await page.waitForTimeout(800);

  // NOTE 2026-11-12: Login di app ini pakai <form method="POST"> navigasi top-level ASLI
  // (bukan XHR/fetch SPA -- konsisten dgn temuan TC-LOGIN-41), jadi klik Login SENDIRI sudah
  // memicu navigasi. page.reload() yang dipanggil saat navigasi itu masih in-flight (tertunda
  // oleh route delay) berkompetisi dgn navigasi tsb dan melempar "net::ERR_ABORTED" dari
  // Playwright -- ini JUSTRU bukti bahwa reload benar-benar menyela request yang pending
  // (tujuan skenario ini), bukan kegagalan test. Ditangkap sbg hasil yang diharapkan.
  report.step('Reload halaman SAAT request masih pending (sebelum 4 detik delay selesai)');
  await page.reload().catch((e) => {
    report.finding('Reload menyela navigasi yang sedang pending', String(e).slice(0, 150));
  });
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(1500);

  report.check(
    'Setelah reload, halaman kembali ke /auth/login (bukan nyangkut di state aneh)',
    page.url().includes('/auth/login'),
    `url=${page.url()}`,
  );

  report.step('Verify TIDAK ada sesi "setengah jadi": navigate ke /dashboard/index harus redirect balik ke login');
  await page.unroute('**/auth/validate');
  await page.goto(`${env.baseURL}/web/index.php/dashboard/index`);
  await page.waitForTimeout(1500);
  report.check(
    'Akses /dashboard/index TANPA login ulang tetap redirect ke /auth/login (tidak ada sesi tak sengaja terbentuk)',
    page.url().includes('/auth/login'),
    `url=${page.url()}`,
  );

  report.print();
});
