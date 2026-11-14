/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-04 — Verify Approve/Reject Actions Are N/A For This Single-Admin-Account Setup
 * Modul    : Claim - Employee Claims (Approve/Reject)
 * Kategori : Scope Confirmation (bukti negatif, sama pola dgn Leave Approve/Reject)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-04-Verify-Approve-Reject-NA-For-Single-Account.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Membuktikan scope decision: Approve/Reject claim TIDAK bisa diuji end-to-end di suite ini,
 *   krn hanya ada SATU akun (Admin, employee "manda akhil user") yg dipakai di seluruh sesi
 *   testing -- sama persis dgn temuan Leave Approve/Reject sebelumnya (dibuktikan via field
 *   `allowedActions` di response API, bukan ditebak/diasumsikan).
 *
 *   Server menentukan aksi apa yg boleh dilakukan pada sebuah claim request lewat
 *   `meta.allowedActions` di response GET /api/v2/claim/requests/<id>. Utk klaim milik
 *   employee SENDIRI (akun login ini, empNumber=7) yg berstatus SUBMITTED, satu2nya aksi yg
 *   diizinkan adalah CANCEL -- APPROVE dan REJECT tidak pernah muncul di allowedActions sama
 *   sekali, krn aksi tsb scope-nya supervisor/approver thd BAWAHAN, bukan thd diri sendiri, dan
 *   org chart di seed data demo ini tidak punya hubungan supervisor->subordinate yg
 *   menghasilkan approval queue utk akun tunggal ini.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-04-Verify-Approve-Reject-NA-For-Single-Account.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-CLAIM-ASSIGN-04: Approve/Reject are not available in allowedActions for a SUBMITTED claim on this single admin account', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-04', 'Approve/Reject N/A For Single Account', env.baseURL, page);

  report.step('Cari claim berstatus SUBMITTED milik akun login ini via API, lalu baca allowedActions-nya');
  const listResp = await page.request.get(
    '/web/index.php/api/v2/claim/employees/requests?limit=50&offset=0&includeEmployees=onlyCurrent&sortField=claimRequest.referenceId&sortOrder=DESC',
  );
  const listBody = await listResp.json().catch(() => null);
  const submittedClaim = (listBody?.data ?? []).find((c: { status?: string }) => c.status === 'SUBMITTED');
  report.check('[API] Ditemukan minimal 1 claim berstatus SUBMITTED utk diperiksa', !!submittedClaim, `found=${!!submittedClaim}, id=${submittedClaim?.id}`);

  const detailResp = await page.request.get(`/web/index.php/api/v2/claim/requests/${submittedClaim?.id}`);
  const detailBody = await detailResp.json().catch(() => null);
  const allowedActions: Array<{ action: string }> = detailBody?.meta?.allowedActions ?? [];
  const actionNames = allowedActions.map((a) => a.action);
  report.check(
    '[API] allowedActions TIDAK berisi APPROVE',
    !actionNames.includes('APPROVE'),
    `allowedActions=${JSON.stringify(actionNames)}`,
  );
  report.check(
    '[API] allowedActions TIDAK berisi REJECT',
    !actionNames.includes('REJECT'),
    `allowedActions=${JSON.stringify(actionNames)}`,
  );
  report.check(
    '[API] allowedActions HANYA berisi CANCEL (bukti ini memang claim milik-sendiri, bukan approval queue)',
    actionNames.length === 1 && actionNames[0] === 'CANCEL',
    `allowedActions=${JSON.stringify(actionNames)}`,
  );

  report.step('Kesimpulan: Approve/Reject claim adalah item N/A utk suite ini (konsisten dgn temuan Leave Approve/Reject)');
  report.finding(
    'Approve/Reject claim: N/A utk suite single-account ini',
    'Server tidak pernah menawarkan aksi APPROVE/REJECT krn tidak ada relasi supervisor->subordinate yg menghasilkan approval queue utk akun ini. Scope limitation yg dibuktikan via API (allowedActions), bukan bug ataupun kekurangan coverage.',
  );

  report.print();
});
