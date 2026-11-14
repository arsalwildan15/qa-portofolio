/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-09 — Verify IDOR Behavior On Claim Requests Endpoints
 * Modul    : Claim - API Access Control
 * Kategori : Security (S) 5.2 - IDOR
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-09-Verify-IDOR-Claim-Requests.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Claim punya DUA jalur baca (dikonfirmasi live 2026-11-15):
 *   - Endpoint datar `/api/v2/claim/requests/<id>`: ber-scope ke klaim MILIK AKUN LOGIN. Klaim
 *     milik employee lain -> 403, walaupun yg login Admin.
 *   - Endpoint ber-scope `/api/v2/claim/employees/<empNumber>/requests/<id>`: jalur yg dipakai UI
 *     Employee Claims; Admin boleh membaca klaim employee lain lewat sini (by design).
 *   TC ini menguji kedua jalur + kasus IDOR yg sesungguhnya: ID klaim milik employee A diminta di
 *   bawah path empNumber employee B (path mismatch) -> TIDAK boleh mengembalikan data (200).
 *   Plus ID tidak eksis / negatif / non-numerik dan akses tanpa sesi.
 *
 * [KOREKSI 2026-11-15] Versi sebelumnya melabeli klaim #1 sbg "milik employee lain" padahal milik
 * akun login sendiri (empNumber 7), sehingga jalur klaim orang lain tidak pernah teruji.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-09-Verify-IDOR-Claim-Requests.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';

test('TC-CLAIM-ASSIGN-09: claim request endpoints enforce ownership scope and reject path-mismatched, invalid and unauthenticated access', async ({
  page,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-09', 'IDOR Claim Requests', env.baseURL, page);

  report.step('Siapkan data: klaim baru milik employee lain (A), dan employee pembanding (B = akun login)');
  const employeeA = await pickLightlyUsedEmployee(page);
  const self = await getLoggedInEmployeeName(page);
  await assignClaimPage.goto();
  await assignClaimPage.selectEmployee(employeeA.employeeId);
  await assignClaimPage.selectEvent('Travel Allowance');
  await assignClaimPage.selectCurrencyByIndex(1);
  const createResp = await assignClaimPage.create();
  const claimId = (await createResp?.json().catch(() => null))?.data?.id as number | undefined;
  report.check('[API] Klaim milik employee A berhasil dibuat', createResp?.status() === 200 && !!claimId, `claimId=${claimId}, empA=${employeeA.empNumber}`);

  report.step('Endpoint DATAR utk klaim milik employee lain -> harus 403 (ber-scope ke pemilik akun login)');
  const flatOther = await page.request.get(`/web/index.php/api/v2/claim/requests/${claimId}`);
  report.check('[API] /claim/requests/<id> milik orang lain -> 403', flatOther.status() === 403, `status=${flatOther.status()}`);

  report.step('Endpoint BER-SCOPE dgn empNumber yg BENAR -> 200 (Admin berhak, by design)');
  const scopedOk = await page.request.get(`/web/index.php/api/v2/claim/employees/${employeeA.empNumber}/requests/${claimId}`);
  const scopedOkBody = await scopedOk.json().catch(() => null);
  report.check('[API] Scoped path benar -> 200', scopedOk.status() === 200, `status=${scopedOk.status()}`);
  report.check(
    '[API] Response hanya berisi data+meta+rels (tidak ada field tak terduga)',
    !!scopedOkBody && Object.keys(scopedOkBody).sort().join(',') === 'data,meta,rels',
    `keys=${Object.keys(scopedOkBody ?? {}).join(',')}`,
  );

  report.step('IDOR path mismatch: ID klaim milik A diminta di bawah empNumber B -> TIDAK boleh 200');
  const mismatch = await page.request.get(`/web/index.php/api/v2/claim/employees/${self.empNumber}/requests/${claimId}`);
  report.check(
    '[API] Klaim A via path empNumber B ditolak (bukan 200 dgn data)',
    mismatch.status() !== 200,
    `status=${mismatch.status()}, empB=${self.empNumber}`,
  );

  report.step('ID tidak eksis / negatif / non-numerik -> ditolak dgn aman (bukan 500)');
  for (const badId of ['999999', '-1', 'abc']) {
    const resp = await page.request.get(`/web/index.php/api/v2/claim/requests/${badId}`);
    report.check(`[API] ID "${badId}" ditolak aman (400/404)`, [400, 404].includes(resp.status()), `status=${resp.status()}`);
  }

  report.step('Tanpa sesi login -> akses ditolak');
  const freshContext = await page.context().browser()?.newContext();
  const unauthResp = freshContext
    ? await freshContext.request.get(`${env.baseURL}/web/index.php/api/v2/claim/employees/${employeeA.empNumber}/requests/${claimId}`)
    : null;
  report.check('[API] Tanpa auth -> bukan 200', unauthResp ? unauthResp.status() !== 200 : true, `status=${unauthResp?.status()}`);
  await freshContext?.close();

  report.print();
});
