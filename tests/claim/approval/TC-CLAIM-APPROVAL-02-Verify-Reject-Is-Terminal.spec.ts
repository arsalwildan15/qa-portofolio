/**
 * ================================================================================
 * TC-CLAIM-APPROVAL-02 — Verify Rejecting An ESS Claim Is Terminal (Cannot Be Approved Afterward)
 * Modul    : Claim - Employee Claims (Admin)
 * Kategori : Positive (+) / State Machine
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-APPROVAL-02-Verify-Reject-Is-Terminal.spec.ts
 * Path     : tests/claim/approval/
 * ================================================================================
 *
 * TUJUAN:
 *   Admin klik Reject pd klaim SUBMITTED milik ESS -> REJECTED; ESS melihat REJECTED; lalu
 *   APPROVE via API pd klaim yg sudah REJECTED ditolak (confirmed live: 403) dan status tetap.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/approval/TC-CLAIM-APPROVAL-02-Verify-Reject-Is-Terminal.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssClaim } from '../../../src/utils/createEssClaim';

test('TC-CLAIM-APPROVAL-02: a rejected claim is terminal and cannot be approved afterward', async ({
  page,
  browser,
  addEmployeePage,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-CLAIM-APPROVAL-02', 'Reject Is Terminal', env.baseURL, page);

  report.step('Setup: ESS punya klaim SUBMITTED');
  const { essPage, close, claimId } = await createEssClaim(page, browser, addEmployeePage, 'QaClmReject');

  report.step('[Admin] Buka detail klaim, klik Reject');
  await assignClaimPage.gotoDetail(claimId);
  const resp = await assignClaimPage.clickAction('Reject');
  const body = await resp?.json().catch(() => null);
  report.check('[API] Reject 200 -> REJECTED', resp?.status() === 200 && body?.data?.status === 'REJECTED', `status=${resp?.status()}, claim=${body?.data?.status}`);

  report.step('[ESS] Melihat status REJECTED');
  const essView = await (await essPage.request.get(`/web/index.php/api/v2/claim/requests/${claimId}`)).json().catch(() => null);
  report.check('ESS melihat REJECTED', essView?.data?.status === 'REJECTED', `status=${essView?.data?.status}`);

  report.step('[API, Admin] APPROVE klaim yg sudah REJECTED');
  const approve = await page.request.put(`/web/index.php/api/v2/claim/requests/${claimId}/action`, { data: { action: 'APPROVE' } });
  report.check('APPROVE stlh REJECT ditolak (bukan 200)', approve.status() !== 200, `status=${approve.status()}`);
  const after = await (await essPage.request.get(`/web/index.php/api/v2/claim/requests/${claimId}`)).json().catch(() => null);
  report.check('Status tetap REJECTED', after?.data?.status === 'REJECTED', `status=${after?.data?.status}`);

  await close();
  report.print();
});
