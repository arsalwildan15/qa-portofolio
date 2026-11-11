/**
 * ================================================================================
 * TC-LOGIN-42 — Verify Session ID Is Regenerated After Login (Session Fixation)
 * Modul    : Login
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-42-Verify-Session-ID-Regenerated-After-Login.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi session cookie ("orangehrm") BERUBAH nilainya setelah
 *   login berhasil, dibandingkan dengan nilai sebelum login (saat baru
 *   GET /auth/login). Kalau nilainya SAMA, aplikasi rentan terhadap
 *   session fixation: attacker bisa "menanam" session ID ke korban
 *   sebelum korban login (misal lewat link berisi session id, atau
 *   attacker login duluan lalu kirim cookie-nya ke korban), lalu setelah
 *   korban login dengan session id yang sama, attacker bisa pakai ulang
 *   session id itu untuk membajak sesi korban yang sudah ter-autentikasi.
 *
 * DAMPAK FITUR jika gagal:
 *   Session fixation adalah celah authentication bypass penuh — attacker
 *   tidak perlu mencuri password, cukup membuat korban login memakai
 *   session id yang sudah attacker ketahui sebelumnya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-42-Verify-Session-ID-Regenerated-After-Login.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

test('TC-LOGIN-42: session cookie value changes after a successful login', async ({
  page,
  context,
  loginPage,
}) => {
  const report = new TestReport('TC-LOGIN-42', 'Session ID Regenerated After Login', env.baseURL, page);

  report.step('GET /auth/login, catat nilai cookie sesi SEBELUM login');
  await loginPage.goto();
  const cookiesBefore = await context.cookies();
  const sessionBefore = cookiesBefore.find((c) => c.name === 'orangehrm')?.value;

  report.step('Login dengan kredensial valid, catat nilai cookie sesi SESUDAH login');
  await loginPage.login(env.username, env.password);
  await page.waitForURL('**/dashboard/index');
  const cookiesAfter = await context.cookies();
  const sessionAfter = cookiesAfter.find((c) => c.name === 'orangehrm')?.value;

  report.check(
    'Cookie sesi ADA sebelum login (baseline anonymous session)',
    sessionBefore !== undefined,
    `value=${sessionBefore}`,
  );
  report.check(
    'Cookie sesi ADA sesudah login',
    sessionAfter !== undefined,
    `value=${sessionAfter}`,
  );
  report.check(
    'Session ID BERUBAH setelah login berhasil (tidak fixation)',
    sessionBefore !== undefined && sessionAfter !== undefined && sessionBefore !== sessionAfter,
    `before=${sessionBefore} | after=${sessionAfter}`,
  );

  report.print();
});
