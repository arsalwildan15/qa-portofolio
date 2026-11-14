/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-04 — Verify Owner Cannot Approve/Reject Their Own Claim (Segregation of Duties)
 * Modul    : Claim - Employee Claims (Approve/Reject)
 * Kategori : Security (S) 5.9 Business Logic / Negative (-) 2.4 Aksi tanpa permission
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-04-Verify-Approve-Reject-NA-For-Single-Account.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi prinsip segregation of duties: pemilik klaim (akun yg login, walaupun ber-role
 *   Admin) TIDAK PERNAH ditawari aksi APPROVE/REJECT/PAY atas klaimnya sendiri, di status apa pun.
 *   Server menentukan aksi yg sah lewat `meta.allowedActions` di GET /api/v2/claim/requests/<id>.
 *
 * [KOREKSI 2026-11-15] Versi sebelumnya menyimpulkan "Approve/Reject N/A utk suite single-account".
 * Kesimpulan itu terlalu luas: yg dibuktikan hanyalah pemilik tidak bisa meng-approve klaim
 * SENDIRI. Alur approval utk klaim yg diajukan employee lain (ESS) tetap ada dan diuji terpisah
 * di CLAIM-APPROVAL-* (Fase 2, butuh fixture akun ESS). Nama file dipertahankan agar riwayat
 * Bug-List/commit tetap terhubung.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-04-Verify-Approve-Reject-NA-For-Single-Account.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';

const APPROVER_ACTIONS = ['APPROVE', 'REJECT', 'PAY'];

test('TC-CLAIM-ASSIGN-04: the claim owner is never offered APPROVE/REJECT/PAY on their own claims', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-04', 'Owner Cannot Approve Own Claim', env.baseURL, page);

  report.step('Ambil semua klaim milik akun yg login (status apa pun) via API');
  const self = await getLoggedInEmployeeName(page);
  const listResp = await page.request.get(
    '/web/index.php/api/v2/claim/employees/requests?limit=50&offset=0&includeEmployees=onlyCurrent&sortField=claimRequest.referenceId&sortOrder=DESC',
  );
  const listBody = await listResp.json().catch(() => null);
  const ownClaims: Array<{ id: number; status: string }> = (listBody?.data ?? []).filter(
    (c: { employee?: { empNumber?: number } }) => c.employee?.empNumber === self.empNumber,
  );
  report.check('[API] Ditemukan minimal 1 klaim milik akun login', ownClaims.length > 0, `count=${ownClaims.length}, empNumber=${self.empNumber}`);

  report.step('Untuk setiap klaim milik sendiri: allowedActions tidak boleh berisi APPROVE/REJECT/PAY');
  const offending: string[] = [];
  const seenStatuses = new Set<string>();
  for (const claim of ownClaims) {
    const detail = await page.request.get(`/web/index.php/api/v2/claim/requests/${claim.id}`);
    const body = await detail.json().catch(() => null);
    const actions: string[] = (body?.meta?.allowedActions ?? []).map((a: { action: string }) => a.action);
    seenStatuses.add(claim.status);
    const bad = actions.filter((a) => APPROVER_ACTIONS.includes(a));
    if (bad.length > 0) offending.push(`#${claim.id}(${claim.status}): ${bad.join(',')}`);
  }
  report.check(
    'Tidak ada klaim milik sendiri yg menawarkan APPROVE/REJECT/PAY ke pemiliknya',
    offending.length === 0,
    `offending=${JSON.stringify(offending)}, statusesChecked=${JSON.stringify([...seenStatuses])}`,
  );

  report.print();
});
