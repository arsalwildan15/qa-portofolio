/**
 * ================================================================================
 * TC-CLAIM-APPROVAL-01 — Verify Admin Approving An ESS Claim Moves It To PAID
 * Modul    : Claim - Employee Claims (Admin)
 * Kategori : Positive (+) 1.3 1.5 | API (A) 6.1 -- Cross-Role
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-APPROVAL-01-Verify-Admin-Approve-Pays-Claim.spec.ts
 * Path     : tests/claim/approval/
 * ================================================================================
 *
 * TUJUAN:
 *   Admin membuka klaim SUBMITTED milik ESS (claim/assignClaim/id/<id>) dan klik Approve.
 *   Confirmed live: Approve langsung -> PAID (tidak ada langkah "Pay" terpisah). Diverifikasi
 *   dari dua sisi: Admin dan ESS sama2 melihat PAID, dan tidak ada aksi tersisa (terminal).
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/approval/TC-CLAIM-APPROVAL-01-Verify-Admin-Approve-Pays-Claim.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssClaim } from '../../../src/utils/createEssClaim';

test('TC-CLAIM-APPROVAL-01: admin approving a submitted ESS claim moves it to PAID (terminal)', async ({
  page,
  browser,
  addEmployeePage,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-CLAIM-APPROVAL-01', 'Admin Approve Pays Claim', env.baseURL, page);

  report.step('Setup: ESS punya klaim SUBMITTED (1 expense)');
  const { ess, essPage, close, claimId } = await createEssClaim(page, browser, addEmployeePage, 'QaClmApprove');

  report.step('[Admin] Buka detail klaim, klik Approve');
  await assignClaimPage.gotoDetail(claimId);
  const resp = await assignClaimPage.clickAction('Approve');
  const body = await resp?.json().catch(() => null);
  report.check('[API] Approve 200', resp?.status() === 200, `status=${resp?.status()}`);
  report.check('[API] Status langsung PAID', body?.data?.status === 'PAID', `status=${body?.data?.status}`);

  report.step('[API] Verify dari sisi Admin & ESS: PAID dan tidak ada aksi tersisa');
  const adminView = await (await page.request.get(`/web/index.php/api/v2/claim/employees/${ess.empNumber}/requests/${claimId}`)).json().catch(() => null);
  report.check('Admin melihat PAID, allowedActions kosong', adminView?.data?.status === 'PAID' && (adminView?.meta?.allowedActions ?? []).length === 0, `status=${adminView?.data?.status}, actions=${JSON.stringify(adminView?.meta?.allowedActions)}`);
  const essView = await (await essPage.request.get(`/web/index.php/api/v2/claim/requests/${claimId}`)).json().catch(() => null);
  report.check('ESS melihat PAID, allowedActions kosong (tdk bisa Cancel lagi)', essView?.data?.status === 'PAID' && (essView?.meta?.allowedActions ?? []).length === 0, `status=${essView?.data?.status}, actions=${JSON.stringify(essView?.meta?.allowedActions)}`);

  await close();
  report.print();
});
