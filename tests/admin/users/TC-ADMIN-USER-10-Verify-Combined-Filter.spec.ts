/**
 * ================================================================================
 * TC-ADMIN-USER-10: Verify Combined Filter (Username + User Role + Status)
 * Modul    : Admin - User Management - Users
 * Kategori : Positive (+) [API VERIFICATION]
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-USER-10-Verify-Combined-Filter.spec.ts
 * Path     : tests/admin/users/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi filter list System Users: (1) User Role + Status
 *   dikombinasikan sbg AND di query API (userRoleId=<id>&status=<0|1>),
 *   dan (2) field "Username" -- meski TAMPAK seperti search box bebas
 *   -- sebenarnya EXACT MATCH (case-insensitive), BUKAN substring/
 *   partial search. Belum pernah diuji sama sekali sebelumnya.
 *
 *   [TEMUAN] Dikonfirmasi live 2026-11-12: username="ess_han" (lengkap)
 *   -> 1 hasil; username="ess_ha" (substring dari user yg sama) -> 0
 *   hasil; username="Ess_han" (beda kapital, lengkap) -> tetap 1 hasil.
 *   Ini bukan bug (server memang didesain exact-match), tapi UX yg bisa
 *   menyesatkan user karena tidak ada indikasi visual bahwa field ini
 *   bukan search substring seperti kebanyakan search box lain di app
 *   ini (lihat pelajaran serupa di TC-PIM.txt poin 11 — jangan
 *   asumsikan perilaku field dari tampilan/label UI saja).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/users/TC-ADMIN-USER-10-Verify-Combined-Filter.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestUser } from '../../../src/utils/createTestUser';

test('TC-ADMIN-USER-10: combined Role+Status filter ANDs together, Username filter is exact-match not substring', async ({
  page,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-ADMIN-USER-10', 'Verify Combined Filter', env.baseURL, page);

  report.step('Buat test user baru (ESS, Enabled) sbg data pasti ada utk filter');
  const { username } = await createTestUser(page, adminUsersPage, 'QaFilterUser');

  report.step('Filter kombinasi User Role=ESS + Status=Enabled, verify query API AND keduanya');
  await adminUsersPage.goto();
  await page.waitForLoadState('networkidle').catch(() => {});
  await adminUsersPage.selectUserRole('ESS');
  await adminUsersPage.selectStatus('Enabled');
  const [combinedResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/users') && r.request().method() === 'GET'),
    page.getByRole('button', { name: 'Search' }).click(),
  ]);
  report.check(
    '[API] Query string berisi userRoleId DAN status sekaligus (AND, bukan OR / salah satu diabaikan)',
    /userRoleId=\d+/.test(combinedResp.url()) && /status=[01]/.test(combinedResp.url()),
    combinedResp.url(),
  );
  const combinedBody = await combinedResp.json().catch(() => null);
  report.check(
    `User baru "${username}" (ESS, Enabled) muncul di hasil filter kombinasi`,
    (combinedBody?.data ?? []).some((u: { userName: string }) => u.userName === username),
  );

  report.step('Reset filter, test Username: substring TIDAK match, full username (exact) match');
  // NOTE: Reset sendiri memicu GET list ulang (unfiltered) -- WAJIB ditunggu sampai resolve
  // sebelum request filter berikutnya, krn waitForResponse() di bawah hanya mencocokkan
  // "GET ke /api/v2/admin/users", jadi response Reset yg masih in-flight bisa KETANGKAP SALAH
  // oleh predicate tsb (race condition) kalau tidak ditunggu dulu -- dikonfirmasi jadi
  // penyebab false-fail (total=19/21/22, cocok persis dgn jumlah unfiltered) saat didebug.
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/users') && r.request().method() === 'GET'),
    page.getByRole('button', { name: 'Reset' }).click(),
  ]);
  await page.waitForLoadState('networkidle').catch(() => {});

  const substring = username.slice(0, username.length - 3);
  await adminUsersPage.usernameInput.fill(substring);
  const [substringResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/users') && r.request().method() === 'GET'),
    page.getByRole('button', { name: 'Search' }).click(),
  ]);
  const substringBody = await substringResp.json().catch(() => null);
  report.check(
    `[TEMUAN] Username substring "${substring}" TIDAK menghasilkan match (exact-match, bukan partial search)`,
    (substringBody?.meta?.total ?? -1) === 0,
    `total=${substringBody?.meta?.total}`,
  );

  await adminUsersPage.usernameInput.fill('');
  await adminUsersPage.usernameInput.fill(username);
  const [exactResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/users') && r.request().method() === 'GET'),
    page.getByRole('button', { name: 'Search' }).click(),
  ]);
  const exactBody = await exactResp.json().catch(() => null);
  report.check(
    `Username lengkap (exact) "${username}" menghasilkan tepat 1 match`,
    exactBody?.meta?.total === 1,
    `total=${exactBody?.meta?.total}`,
  );

  report.finding(
    'Field "Username" di filter adalah exact-match, bukan substring search',
    'Tampilan UI-nya sebuah text input polos tanpa indikasi apapun bahwa ia butuh username LENGKAP ' +
      '(case-insensitive) -- berbeda dari asumsi wajar user bahwa semua search box mendukung partial ' +
      'match. Bukan bug (server memang didesain begini), tapi UX yang berpotensi membingungkan.',
  );

  report.print();
});
