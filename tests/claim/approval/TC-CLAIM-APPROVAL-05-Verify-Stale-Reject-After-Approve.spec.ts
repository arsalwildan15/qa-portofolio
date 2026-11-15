/**
 * ================================================================================
 * TC-CLAIM-APPROVAL-05 — Verify A Stale "Reject" Button After Approve Cannot Undo A PAID Claim
 * Modul    : Claim - Employee Claims (Admin)
 * Kategori : Edge Case (!) / Stale UI
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-APPROVAL-05-Verify-Stale-Reject-After-Approve.spec.ts
 * Path     : tests/claim/approval/
 * ================================================================================
 *
 * TUJUAN:
 *   Confirmed live: setelah klik Approve, halaman detail TIDAK me-refresh dirinya -- tombol
 *   Reject/Approve masih tampil walau klaim sudah PAID. TC ini mengklik tombol Reject yg basi itu
 *   dan memastikan server menolaknya serta status tetap PAID (klaim yg sudah dibayar tidak bisa
 *   "dibatalkan" lewat UI basi).
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/approval/TC-CLAIM-APPROVAL-05-Verify-Stale-Reject-After-Approve.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssClaim } from '../../../src/utils/createEssClaim';

test('TC-CLAIM-APPROVAL-05: clicking a stale Reject button after Approve cannot undo a PAID claim', async ({
  page,
  browser,
  addEmployeePage,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  // The stale Reject click is EXPECTED to be refused by the server (that's the point of this
  // TC), and the app's own fetch logs that refusal as a "Failed to load resource" line.
  const report = new TestReport('TC-CLAIM-APPROVAL-05', 'Stale Reject After Approve', env.baseURL, page, [/Failed to load resource.*4\d\d/]);

  report.step('Setup: ESS punya klaim SUBMITTED');
  const { essPage, close, claimId } = await createEssClaim(page, browser, addEmployeePage, 'QaClmStale');

  report.step('[Admin] Approve (status -> PAID), TANPA reload halaman');
  await assignClaimPage.gotoDetail(claimId);
  const approve = await assignClaimPage.clickAction('Approve');
  report.check('[API] Approve -> PAID', (await approve?.json().catch(() => null))?.data?.status === 'PAID', `status=${approve?.status()}`);

  report.step('[Admin] Klik tombol Reject yg masih tampil (basi)');
  const rejectButton = page.getByRole('button', { name: 'Reject', exact: true });
  const staleVisible = await rejectButton.isVisible({ timeout: 3_000 }).catch(() => false);
  report.finding('Tombol Reject masih tampil setelah Approve (UI tidak refresh)', `visible=${staleVisible}`);
  if (staleVisible) {
    const reject = await assignClaimPage.clickAction('Reject');
    report.check('Reject atas klaim PAID ditolak server (bukan 200)', reject !== null && reject.status() !== 200, `status=${reject?.status()}`);
  }

  report.step('[API] Status akhir tetap PAID');
  const after = await (await essPage.request.get(`/web/index.php/api/v2/claim/requests/${claimId}`)).json().catch(() => null);
  report.check('Status tetap PAID', after?.data?.status === 'PAID', `status=${after?.data?.status}`);

  await close();
  report.print();
});
