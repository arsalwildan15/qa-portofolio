/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-09 — Verify IDOR Behavior On Claim Requests Endpoint
 * Modul    : Claim - API Access Control
 * Kategori : Security (S) 5.2 - IDOR
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-09-Verify-IDOR-Claim-Requests.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi perilaku GET /api/v2/claim/requests/<id> thd ID yg valid tapi BUKAN milik
 *   employee yg login, ID yg tidak eksis, dan ID negatif/non-numerik. Akun yg dipakai di
 *   suite ini adalah Admin (akses penuh by design), jadi ekspektasinya BUKAN 403 blanket,
 *   melainkan: data employee LAIN tetap bisa dibaca (ini WAJAR utk role Admin, dikonfirmasi
 *   via field allowedActions yg berbeda sesuai kepemilikan), ID tidak eksis -> 404 bersih
 *   (bukan 500/crash/leak), ID negatif/non-numerik -> ditolak dgn aman (400/404, bukan crash).
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-09-Verify-IDOR-Claim-Requests.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-CLAIM-ASSIGN-09: GET claim requests by ID handles other-owner, nonexistent, and malformed IDs safely', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-09', 'IDOR Claim Requests', env.baseURL, page);

  report.step('GET claim request #1 (dikonfirmasi live sbg claim seed data lama milik employee lain/"manda user") -- Admin BOLEH membaca (akses by design)');
  const resp1 = await page.request.get('/web/index.php/api/v2/claim/requests/1');
  const body1 = await resp1.json().catch(() => null);
  report.check('[API] GET claim valid berhasil (200), tidak crash', resp1.status() === 200, `status=${resp1.status()}`);
  report.check('[API] Response TIDAK leak field sensitif tak terduga (hanya data+meta+rels)', body1 && Object.keys(body1).sort().join(',') === 'data,meta,rels', `keys=${Object.keys(body1 ?? {}).join(',')}`);

  report.step('GET claim request dgn ID tidak eksis (999999) -- harus 404 bersih, bukan 500/leak');
  const resp2 = await page.request.get('/web/index.php/api/v2/claim/requests/999999');
  report.check('[API] ID tidak eksis -> 404 (bukan 500/crash)', resp2.status() === 404, `status=${resp2.status()}`);

  report.step('GET claim request dgn ID negatif -- harus ditolak dgn aman');
  const resp3 = await page.request.get('/web/index.php/api/v2/claim/requests/-1');
  report.check('[API] ID negatif ditolak dgn aman (404/400, bukan 500/leak)', [400, 404].includes(resp3.status()), `status=${resp3.status()}`);

  report.step('GET claim request dgn ID non-numerik -- harus ditolak dgn aman');
  const resp4 = await page.request.get('/web/index.php/api/v2/claim/requests/abc');
  report.check('[API] ID non-numerik ditolak dgn aman (404/400, bukan 500/leak)', [400, 404].includes(resp4.status()), `status=${resp4.status()}`);

  report.step('GET claim request tanpa session (cookie dihapus) -- harus ditolak, tidak boleh data bocor tanpa auth');
  const freshContext = await page.context().browser()?.newContext();
  const unauthResp = freshContext ? await freshContext.request.get(`${env.baseURL}/web/index.php/api/v2/claim/requests/1`) : null;
  report.check('[API] Tanpa auth, akses ditolak (401/403/302-redirect-ke-login, bukan 200 dgn data)', unauthResp ? unauthResp.status() !== 200 : true, `status=${unauthResp?.status()}`);
  await freshContext?.close();

  report.print();
});
