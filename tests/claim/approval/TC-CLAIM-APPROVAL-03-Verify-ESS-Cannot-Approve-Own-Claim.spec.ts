/**
 * ================================================================================
 * TC-CLAIM-APPROVAL-03 — Verify An ESS Employee Cannot Approve Their Own Claim
 * Modul    : Claim - Access Control
 * Kategori : Security (S) / Segregation Of Duties (BFLAC)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-APPROVAL-03-Verify-ESS-Cannot-Approve-Own-Claim.spec.ts
 * Path     : tests/claim/approval/
 * ================================================================================
 *
 * TUJUAN:
 *   ESS dgn klaim SUBMITTED miliknya sendiri: halaman detail TIDAK menampilkan tombol Approve,
 *   dan memanggil PUT requests/<id>/action {APPROVE} langsung via API juga ditolak (confirmed
 *   live: 403). Status tetap SUBMITTED. Melengkapi TC-CLAIM-ASSIGN-04 (yg menguji sisi Admin
 *   atas klaim miliknya sendiri) dgn akun ESS sungguhan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/approval/TC-CLAIM-APPROVAL-03-Verify-ESS-Cannot-Approve-Own-Claim.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { SubmitClaimPage } from '../../../src/pages';
import { createEssClaim } from '../../../src/utils/createEssClaim';

test('TC-CLAIM-APPROVAL-03: an ESS employee cannot approve their own claim (UI or API)', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-CLAIM-APPROVAL-03', 'ESS Cannot Approve Own Claim', env.baseURL, page);

  report.step('Setup: ESS punya klaim SUBMITTED');
  const { essPage, close, claimId } = await createEssClaim(page, browser, addEmployeePage, 'QaClmSelf');

  report.step('[ESS UI] Detail klaim sendiri: tidak ada tombol Approve');
  const submitClaimPage = new SubmitClaimPage(essPage);
  await submitClaimPage.gotoDetail(claimId);
  const approveVisible = await essPage.getByRole('button', { name: 'Approve', exact: true }).isVisible({ timeout: 3_000 }).catch(() => false);
  report.check('Tombol Approve TIDAK tampil utk ESS', !approveVisible);

  report.step('[ESS API] PUT action APPROVE pd klaim sendiri');
  const approve = await essPage.request.put(`/web/index.php/api/v2/claim/requests/${claimId}/action`, { data: { action: 'APPROVE' } });
  report.check('APPROVE oleh pemilik klaim ditolak (bukan 200)', approve.status() !== 200, `status=${approve.status()}`);
  const after = await (await essPage.request.get(`/web/index.php/api/v2/claim/requests/${claimId}`)).json().catch(() => null);
  report.check('Status tetap SUBMITTED', after?.data?.status === 'SUBMITTED', `status=${after?.data?.status}`);

  await close();
  report.print();
});
