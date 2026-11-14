/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-15 — Verify Cross-User Edit Concurrency Is N/A For This Suite
 * Modul    : Claim/Leave/Performance/Time - Scope Confirmation
 * Kategori : Edge Case (!) 4.7 - Konkurensi Multi-User (bukti N/A)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-15-Verify-Cross-User-Concurrency-NA.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Membuktikan scope decision: skenario "2 USER BERBEDA mengedit record yg sama scr
 *   bersamaan" (taksonomi 4.7) TIDAK bisa diuji end-to-end di 4 modul suite ini
 *   (Leave/Claim/Performance/Time), krn modul2 tsb HANYA bisa diakses/dimutasi oleh role
 *   Admin, dan di shared demo ini HANYA ADA SATU akun ber-role Admin.
 *
 *   Ini BERBEDA dgn TC-CLAIM-ASSIGN-13 (race condition 2 SESI dari AKUN YG SAMA) -- itu tetap
 *   valid & sudah diuji. Yg TIDAK bisa diuji scr genuine adalah 2 akun MANUSIA berbeda yg
 *   masing2 py izin edit independen thd record yg sama (mis. 2 supervisor berbeda approve
 *   leave request bawahan yg sama) -- krn modul2 ini di-drive seluruhnya oleh satu Admin.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-15-Verify-Cross-User-Concurrency-NA.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-CLAIM-ASSIGN-15: only one Admin-role account exists in this shared demo, confirming cross-user concurrency is N/A', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-15', 'Cross-User Concurrency N/A', env.baseURL, page);

  report.step('GET daftar user accounts via API, hitung berapa yg ber-role Admin');
  const usersResp = await page.request.get('/web/index.php/api/v2/admin/users?limit=50&offset=0');
  const usersBody = await usersResp.json().catch(() => null);
  const users: Array<{ userName?: string; status?: boolean; userRole?: { name?: string } }> = usersBody?.data ?? [];
  const adminUsers = users.filter((u) => u.userRole?.name === 'Admin');
  const essUsers = users.filter((u) => u.userRole?.name === 'ESS');

  report.check('[API] Daftar user berhasil diambil', usersResp.status() === 200, `status=${usersResp.status()}, total=${users.length}`);
  report.check(
    '[API] HANYA ADA SATU akun ber-role Admin',
    adminUsers.length === 1,
    `adminUsers=${JSON.stringify(adminUsers.map((u) => u.userName))}`,
  );
  report.check(
    '[API] Akun lain SEMUA ber-role ESS (Employee Self Service, bukan Admin)',
    essUsers.length === users.length - adminUsers.length,
    `essCount=${essUsers.length}, totalNonAdmin=${users.length - adminUsers.length}`,
  );

  report.finding(
    'Cross-user edit concurrency (taksonomi 4.7): N/A utk suite 4 modul ini',
    `Hanya ada 1 akun ber-role Admin ("${adminUsers[0]?.userName}") di shared demo ini -- modul Assign Leave/Assign Claim/Performance-KPI/Attendance-admin SEMUANYA hanya bisa dimutasi via akun Admin tunggal ini. Skenario "2 user berbeda edit record yg sama bersamaan" (butuh 2 akun independen dgn izin mutasi) TIDAK bisa diuji genuine di sini -- berbeda dgn race condition 2-SESI-akun-sama yg SUDAH diuji di TC-CLAIM-ASSIGN-13. Ini scope limitation yg dibuktikan via data, bukan diasumsikan.`,
  );

  report.print();
});
