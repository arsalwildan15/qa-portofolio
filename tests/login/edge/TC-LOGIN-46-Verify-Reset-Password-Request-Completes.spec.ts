/**
 * ================================================================================
 * TC-LOGIN-46 — Verify Reset Password Request Completes
 * Modul    : Login
 * Kategori : Edge Case (!) [BUG]
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-46-Verify-Reset-Password-Request-Completes.spec.ts
 * Path     : tests/login/edge/
 * ================================================================================
 *
 * TUJUAN:
 *   TC-LOGIN-40 (sudah ada) hanya memverifikasi link "Forgot your
 *   password?" MENAVIGASI ke halaman Reset Password -- belum pernah
 *   ada TC yang benar-benar MENGISI username lalu SUBMIT form reset
 *   password itu sendiri. TC ini mengisi gap tsb: submit form Reset
 *   Password dgn username VALID (user baru yg sengaja dibuat khusus
 *   utk TC ini, BUKAN akun "Admin" bersama -- utk menghindari risiko
 *   mengganggu akun shared demo publik ini), lalu verify request
 *   selesai dlm waktu wajar (redirect ke halaman konfirmasi).
 *
 *   [BUG TERKONFIRMASI 2026-11-12 -- INTERMITEN, BUKAN DETERMINISTIK]
 *   Submit Reset Password dgn username VALID APAPUN (dikonfirmasi baik
 *   dgn "Admin" MAUPUN dgn beberapa user baru yg sengaja dibuat khusus
 *   utk investigasi ini) KADANG menyebabkan request MENGGANTUNG TANPA
 *   PERNAH SELESAI (ditunggu 53-68 detik, tdk pernah selesai -- bukan
 *   berarti itu batasnya, hanya dihentikan di titik itu), KADANG
 *   selesai cepat (~3-20 detik, redirect normal ke
 *   /auth/sendPasswordReset). Data reproduksi gabungan:
 *     - 4 trial awal (dijalankan BERURUTAN cepat dlm 1 proses) -> 4/4
 *       menggantung.
 *     - 7 run TC resmi INI (proses terpisah, jeda antar run) -> 5 PASS
 *       (selesai cepat), 2 FAIL (menggantung) -- rasio ~29%.
 *   Pola ini mengindikasikan endpoint reset-password kemungkinan
 *   sensitif terhadap beban/request berurutan (bukan 100% deterministik
 *   per klik, tapi jelas BUKAN noise acak biasa -- pola konsisten
 *   antar sesi investigasi terpisah). Dugaan kuat: server mencoba kirim
 *   email reset sungguhan via SMTP yg tidak terkonfigurasi/tidak bisa
 *   diakses di demo publik ini, kadang timeout cepat kadang menggantung
 *   lama tergantung kondisi server saat itu -- TAPI root cause pastinya
 *   TIDAK BISA dipastikan dari sisi kita (infrastruktur server, di luar
 *   kendali). Sebagai perbandingan: username TIDAK VALID SELALU
 *   menyelesaikan request dgn cepat (~3-6 detik) -- jadi masalah ini
 *   SPESIFIK terjadi hanya utk username valid (yg memicu proses kirim
 *   email), bukan masalah jaringan/server umum yg mempengaruhi semua
 *   request. TC ini akan PASS/FAIL mengikuti perilaku intermiten
 *   tsb secara jujur (bukan di-mask) -- re-run adalah bagian normal
 *   dari mendokumentasikan bug intermiten, bukan tanda TC yang salah.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/edge/TC-LOGIN-46-Verify-Reset-Password-Request-Completes.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestUser } from '../../../src/utils/createTestUser';

test('TC-LOGIN-46: submitting Reset Password with a valid username completes within a reasonable time', async ({
  page,
  adminUsersPage,
  loginPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-LOGIN-46', 'Reset Password Request Completes', env.baseURL, page);

  report.step('Buat user baru khusus utk TC ini (bukan akun Admin bersama)');
  const { username } = await createTestUser(page, adminUsersPage, 'QaResetFlow');

  report.step('Logout, buka halaman Reset Password, isi username valid, submit');
  await page.goto('/web/index.php/auth/logout');
  await page.waitForLoadState('networkidle').catch(() => {});
  await loginPage.gotoResetPassword();
  await page.waitForLoadState('networkidle').catch(() => {});
  await loginPage.resetPasswordUsernameInput.fill(username);
  await loginPage.resetPasswordSubmitButton.click();

  report.step('Verify request selesai (redirect) dlm waktu wajar, bukan menggantung tanpa batas');
  let navigated = true;
  await page.waitForURL(/sendPasswordReset/, { timeout: 20_000 }).catch(() => {
    navigated = false;
  });
  report.check(
    'Request Reset Password selesai (redirect ke /auth/sendPasswordReset) dlm 20 detik',
    navigated,
    `navigated=${navigated}, url akhir=${page.url()}`,
  );

  if (!navigated) {
    report.finding(
      'BUG: Reset Password menggantung utk username valid (intermiten, ~29% dari 7 run resmi + 4/4 saat dites berurutan cepat)',
      'Request TIDAK redirect dlm 20 detik run ini. Bug bersifat INTERMITEN (tdk 100% reproduce ' +
        'tiap klik), bukan noise acak -- pola konsisten antar sesi investigasi terpisah, direplikasi ' +
        'baik dgn akun "Admin" maupun user baru yg sengaja dibuat khusus. Sbg pembanding, username ' +
        'TIDAK VALID SELALU selesai cepat (~3-6 detik) -- jadi masalah ini spesifik ke username valid ' +
        '(yg memicu proses kirim email), bukan masalah jaringan/server umum. Dugaan kuat: server ' +
        'mencoba kirim email reset sungguhan via SMTP yg tidak terkonfigurasi di demo publik ini. ' +
        'Root cause pasti TIDAK BISA dipastikan dari sisi kita (infrastruktur server, di luar kendali).',
    );
  }

  report.print();
});
