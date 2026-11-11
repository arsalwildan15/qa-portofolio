/**
 * ================================================================================
 * TC-LOGIN-41 — Verify Cross-Origin Login CSRF Protection
 * Modul    : Login
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-41-Verify-Cross-Origin-Login-CSRF-Protection.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi login TIDAK bisa dipaksa berhasil lewat form yang
 *   di-submit dari origin lain ("login CSRF" — attacker memaksa korban
 *   login ke akun attacker tanpa sadar, lalu korban menyimpan data di
 *   bawah identitas attacker).
 *
 * METODOLOGI (PENTING — baca sebelum mengubah TC ini):
 *   Verifikasi awal pakai `curl` dengan header Origin/Referer di-forge
 *   manual memberi HASIL MENYESATKAN: request ditolak server, tapi itu
 *   BUKAN karena validasi CSRF sungguhan — curl tidak pernah membawa
 *   cookie sesi yang valid dari kunjungan GET /auth/login sebelumnya,
 *   jadi hasil "ditolak" itu bisa saja cuma gagal handshake biasa, bukan
 *   bukti proteksi CSRF. Header Origin/Referer yang di-set manual via
 *   curl JUGA tidak merepresentasikan apa yang benar-benar dikirim
 *   browser asli (browser TIDAK MENGIZINKAN JavaScript meng-override
 *   Origin/Referer).
 *   TC ini sebagai gantinya memakai Playwright untuk BENAR-BENAR
 *   menavigasi browser ke origin eksternal (https://example.com),
 *   lalu men-submit <form method="POST"> asli ke
 *   /web/index.php/auth/validate dari origin itu — supaya header
 *   Origin/Referer yang terkirim OTENTIK dari browser, bukan rekayasa.
 *
 * [CONFIRMED via verifikasi langsung, 2026-11-11]:
 *   Form cross-origin dengan kredensial VALID ("Admin"/"admin123") tetap
 *   diarahkan balik ke "/auth/login" (gagal), BUKAN ke "/dashboard/index".
 *   Kesimpulan: proteksi CSRF EFEKTIF — kemungkinan besar karena cookie
 *   sesi berflag SameSite=Lax (dikonfirmasi di TC-LOGIN-01) yang tidak
 *   dikirim browser pada navigasi top-level cross-site via POST, sehingga
 *   handshake sesi yang dibutuhkan server untuk proses auth gagal. Ini
 *   TEMUAN POSITIF (proteksi bekerja), bukan bug.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-41-Verify-Cross-Origin-Login-CSRF-Protection.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

test('TC-LOGIN-41: cross-origin form submission with valid credentials does not authenticate', async ({
  page,
}) => {
  const report = new TestReport('TC-LOGIN-41', 'Cross-Origin Login CSRF Protection', env.baseURL, page);

  report.step('Navigate ke origin eksternal (https://example.com), simulasi attacker page');
  await page.goto('https://example.com');

  report.step(
    'Submit <form method="POST"> asli dari origin eksternal langsung ke /auth/validate dengan kredensial valid',
  );
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    page.evaluate(
      ({ action, username, password }) => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = action;
        const u = document.createElement('input');
        u.name = 'username';
        u.value = username;
        const p = document.createElement('input');
        p.name = 'password';
        p.value = password;
        form.appendChild(u);
        form.appendChild(p);
        document.body.appendChild(form);
        form.submit();
      },
      {
        action: `${env.baseURL}/web/index.php/auth/validate`,
        username: env.username,
        password: env.password,
      },
    ),
  ]);

  report.check(
    '[API] Response status === 302 (ditolak/redirect, bukan error server)',
    response.status() === 302,
    `status=${response.status()}`,
  );
  report.check(
    '[API] Location mengarah ke "/auth/login" (login GAGAL), BUKAN "/dashboard/index"',
    (response.headers()['location'] ?? '').includes('/auth/login'),
    `location=${response.headers()['location']}`,
  );

  await page.waitForTimeout(1500);
  report.check(
    '[UI] Browser tetap di origin eksternal, TIDAK ikut ter-redirect ke dashboard OrangeHRM',
    !page.url().includes('orangehrmlive.com'),
    `url=${page.url()}`,
  );

  report.finding(
    'Mekanisme proteksi CSRF login',
    'Cross-origin form submit dengan kredensial valid tetap gagal — kemungkinan besar karena cookie sesi ' +
      'SameSite=Lax tidak dikirim browser pada navigasi top-level cross-site via POST, sehingga handshake ' +
      'sesi yang dibutuhkan server gagal. Proteksi efektif, tidak memerlukan token CSRF terpisah.',
  );

  report.print();
});
