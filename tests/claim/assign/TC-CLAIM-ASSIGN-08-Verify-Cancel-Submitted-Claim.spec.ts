/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-08 — Verify Cancelling A SUBMITTED Claim Moves It To CANCELLED With No Further Actions
 * Modul    : Claim - Submit Claim (ESS, owner)
 * Kategori : Positive (+) 1.3 | API (A) 6.1 -- State Transition
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-08-Verify-Cancel-Submitted-Claim.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Pemilik klaim (ESS) membatalkan klaim SUBMITTED-nya lewat tombol "Cancel" di
 *   claim/submitClaim/id/<id> -> PUT requests/<id>/action 200, status CANCELLED, dan
 *   allowedActions kosong (state terminal, tidak ada aksi lanjutan).
 *
 * RIWAYAT (2026-11-15): versi lama mengambil klaim SUBMITTED "pertama" dari
 * GET claim/employees/requests sebagai Admin. Endpoint itu mengembalikan klaim SEMUA
 * karyawan, jadi setelah TC lintas-role baru meninggalkan klaim SUBMITTED milik akun ESS,
 * Admin membuka klaim orang lain di halaman Submit Claim -> tombol Cancel tidak ada -> timeout.
 * Sekarang data dibuat sendiri (createEssClaim, setup via API) dan dibatalkan oleh PEMILIKNYA
 * -- deterministik, tidak bergantung seed data yg bisa habis.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-08-Verify-Cancel-Submitted-Claim.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { SubmitClaimPage } from '../../../src/pages';
import { createEssClaim } from '../../../src/utils/createEssClaim';

test('TC-CLAIM-ASSIGN-08: cancelling a SUBMITTED claim transitions it to CANCELLED with empty allowedActions', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-08', 'Cancel Submitted Claim', env.baseURL, page);

  report.step('Setup: ESS punya klaim SUBMITTED (via API)');
  const { essPage, close, claimId } = await createEssClaim(page, browser, addEmployeePage, 'QaClmCancel');

  report.step(`[ESS UI] Buka claim/submitClaim/id/${claimId}, klik Cancel`);
  const submitClaimPage = new SubmitClaimPage(essPage);
  await submitClaimPage.gotoDetail(claimId);
  const cancelResp = await submitClaimPage.clickAction('Cancel');
  report.check('[API] PUT requests/<id>/action 200', cancelResp?.status() === 200, `status=${cancelResp?.status()}`);

  report.step('[ESS API] Status CANCELLED, allowedActions kosong');
  const detail = await (await essPage.request.get(`/web/index.php/api/v2/claim/requests/${claimId}`)).json().catch(() => null);
  report.check('[API] Status berubah jadi CANCELLED', detail?.data?.status === 'CANCELLED', `status=${detail?.data?.status}`);
  report.check(
    '[API] allowedActions kosong setelah CANCELLED (tidak ada aksi lanjutan)',
    Array.isArray(detail?.meta?.allowedActions) && detail.meta.allowedActions.length === 0,
    `allowedActions=${JSON.stringify(detail?.meta?.allowedActions)}`,
  );

  await close();
  report.print();
});
