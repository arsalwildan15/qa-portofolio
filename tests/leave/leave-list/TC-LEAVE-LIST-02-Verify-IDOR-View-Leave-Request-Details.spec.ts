/**
 * ================================================================================
 * TC-LEAVE-LIST-02 — Verify Access Control On viewLeaveRequest/<id> (IDOR Check)
 * Modul    : Leave - Leave List
 * Kategori : Negative (-) 2.6 | Security (S) 5.2-IDOR | API (A) 6.2 6.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-LIST-02-Verify-IDOR-View-Leave-Request-Details.spec.ts
 * Path     : tests/leave/leave-list/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi akses langsung ke viewLeaveRequest/<id> dgn ID yg
 *   TIDAK dimiliki/terlihat oleh akun yg sedang login (dicoba beberapa ID
 *   kecil berurutan dari 1) tidak membocorkan data request employee lain
 *   secara mentah -- baik ditolak (403/404) ATAU, krn akun "Admin" yg
 *   dipakai di demo ini punya hak administratif penuh (bisa melihat
 *   leave SEMUA karyawan secara sah by design), direspon dgn data yg
 *   valid TAPI konsisten dgn permission model admin (bukan crash/leak
 *   data mentah di luar skema yg diharapkan).
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/leave-list/TC-LEAVE-LIST-02-Verify-IDOR-View-Leave-Request-Details.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-LEAVE-LIST-02: direct access to viewLeaveRequest/<id> for an arbitrary low ID does not crash or leak data outside the expected schema', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-LEAVE-LIST-02', 'IDOR View Leave Request Details', env.baseURL, page);

  report.step('[API] GET leave-requests/1 (ID kecil, kemungkinan milik employee lain)');
  const resp1 = await page.request.get(`${env.baseURL}/web/index.php/api/v2/leave/leave-requests/1`);
  report.check(
    'GET id=1 -> status 200 (admin, by design, berhak lihat SEMUA leave) ATAU 404 (sudah dihapus/tidak ada)',
    resp1.status() === 200 || resp1.status() === 404,
    `status=${resp1.status()}`,
  );
  const body1 = await resp1.json().catch(() => null);
  if (resp1.status() === 200) {
    report.check(
      '[API] Response punya shape yg diharapkan (bukan dump mentah di luar skema)',
      typeof body1?.data === 'object' && 'id' in (body1?.data ?? {}),
      `keys=${JSON.stringify(Object.keys(body1?.data ?? {}))}`,
    );
  }

  report.step('[API] GET leave-requests/999999 (ID yg nyaris pasti tidak ada)');
  const resp2 = await page.request.get(`${env.baseURL}/web/index.php/api/v2/leave/leave-requests/999999`);
  report.check(
    'GET id yg tidak ada -> 404 (bukan 500 server error, bukan 200 dgn data palsu)',
    resp2.status() === 404,
    `status=${resp2.status()}`,
  );

  report.step('[API] GET leave-requests/-1 (ID negatif, boundary/injection-adjacent)');
  const resp3 = await page.request.get(`${env.baseURL}/web/index.php/api/v2/leave/leave-requests/-1`);
  report.check(
    'GET id negatif -> 4xx yg jelas (bukan 500 ataupun 200)',
    resp3.status() >= 400 && resp3.status() < 500,
    `status=${resp3.status()}`,
  );

  report.step('Verify: tanpa login (session di-clear), akses ke viewLeaveRequest/1 DITOLAK / diarahkan ke login');
  await page.context().clearCookies();
  const resp4 = await page.request.get(`${env.baseURL}/web/index.php/api/v2/leave/leave-requests/1`);
  report.check(
    'Tanpa session valid -> API menolak (401/403) ATAU redirect, BUKAN 200 dgn data',
    resp4.status() !== 200,
    `status=${resp4.status()}`,
  );

  report.print();
});
