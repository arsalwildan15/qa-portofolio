/**
 * ================================================================================
 * TC-LOGIN-37 — Verify Rapid Multiple Failed Logins
 * Modul    : Login
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-37-Verify-Rapid-Multiple-Failed-Logins.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi 5 percobaan login gagal berturut-turut masing-masing
 *   ditangani normal (302 ke /auth/login, tidak crash), DAN memverifikasi
 *   percobaan ke-6 diblokir (429 / captcha / lockout) sebagai security
 *   control terhadap brute-force. Per 2026-11-11 (hasil audit), server
 *   TIDAK menerapkan rate limiting apa pun — percobaan ke-6 diterima
 *   sama seperti percobaan ke-1. TC ini SENGAJA ditulis untuk FAIL
 *   selama kondisi itu masih benar, supaya reporter otomatis mencatat
 *   ini sebagai bug security resmi di docs/Bug-List.xlsx (bukan cuma
 *   catatan temuan di dokumentasi) dan auto-close sendiri saat rate
 *   limiting benar-benar diimplementasikan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-37-Verify-Rapid-Multiple-Failed-Logins.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-37: rapid repeated failed logins do not crash the server', async ({
  page,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-37', 'Rapid Multiple Failed Logins', env.baseURL, page);

  report.step('Navigate ke login, jalankan 5x percobaan login gagal berturut-turut');
  await loginPage.goto();

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await loginPage.usernameInput.fill('wronguser');
    await loginPage.passwordInput.fill('wrongpass');

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/auth/validate')),
      loginPage.loginButton.click(),
    ]);

    report.check(
      `Attempt ${attempt}: response status < 500`,
      response.status() < 500,
      `status=${response.status()}`,
    );
    if (response.status() === 429) {
      report.finding(
        `Attempt ${attempt}: rate-limited (429)`,
        `Retry-After=${response.headers()['retry-after']}`,
      );
    }
    report.check(
      `Attempt ${attempt}: error "Invalid credentials" visible`,
      await isVisibleWithWait(loginPage.errorMessage),
    );
  }

  report.step('Percobaan ke-6: verify server menerapkan brute-force protection');
  await loginPage.usernameInput.fill('wronguser');
  await loginPage.passwordInput.fill('wrongpass');
  const [sixthResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.loginButton.click(),
  ]);
  report.check(
    'Attempt 6: server menerapkan rate limiting/lockout (429 atau captcha) setelah 5x gagal berturut-turut',
    sixthResponse.status() === 429,
    `status=${sixthResponse.status()} (expected 429 — tidak ada rate limiting diterapkan, brute-force tidak dicegah)`,
  );

  report.print();
});
