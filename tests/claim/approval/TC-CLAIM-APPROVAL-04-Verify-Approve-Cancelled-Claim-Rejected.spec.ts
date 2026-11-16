/**
 * ================================================================================
 * TC-CLAIM-APPROVAL-04 — Verify A Claim Cancelled By Its Owner Cannot Be Approved Via API
 * Modul    : Claim - Employee Claims (Admin)
 * Kategori : Positive (+) 1.3 | Negative (-) 2.5 -- State Machine Bypass
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-APPROVAL-04-Verify-Approve-Cancelled-Claim-Rejected.spec.ts
 * Path     : tests/claim/approval/
 * ================================================================================
 *
 * TUJUAN:
 *   ESS men-Submit lalu men-Cancel klaimnya -> CANCELLED. Admin lalu memanggil APPROVE via API
 *   (UI tidak lagi menampilkan tombolnya) -> harus ditolak (confirmed live: 403) dan status tetap
 *   CANCELLED, supaya klaim yg sudah dibatalkan karyawan tidak bisa "dibayar" diam-diam.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/approval/TC-CLAIM-APPROVAL-04-Verify-Approve-Cancelled-Claim-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createEssClaim } from '../../../src/utils/createEssClaim';

test('TC-CLAIM-APPROVAL-04: a claim cancelled by its owner cannot be approved via API', async ({
  page,
  browser,
  addEmployeePage,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-CLAIM-APPROVAL-04', 'Approve Cancelled Claim Rejected', env.baseURL, page);

  report.step('Setup: ESS submit lalu CANCEL klaimnya');
  const { essPage, close, claimId } = await createEssClaim(page, browser, addEmployeePage, 'QaClmCancel');
  const cancel = await essPage.request.put(`/web/index.php/api/v2/claim/requests/${claimId}/action`, { data: { action: 'CANCEL' } });
  const cancelled = await cancel.json().catch(() => null);
  report.check('[ESS API] Cancel 200 -> CANCELLED', cancel.status() === 200 && cancelled?.data?.status === 'CANCELLED', `status=${cancel.status()}, claim=${cancelled?.data?.status}`);

  report.step('[Admin UI] Detail klaim CANCELLED: tidak ada tombol Approve');
  await assignClaimPage.gotoDetail(claimId);
  // Anchor: wait until the detail page's action bar has rendered (Back button) before a NEGATIVE check.
  report.check('Halaman detail klaim selesai dirender', await isVisibleWithWait(page.getByRole('button', { name: 'Back', exact: true }), 15_000));
  const approveVisible = await page.getByRole('button', { name: 'Approve', exact: true }).isVisible();
  report.check('Tombol Approve TIDAK tampil utk klaim CANCELLED', !approveVisible);

  report.step('[Admin API] APPROVE klaim CANCELLED');
  const approve = await page.request.put(`/web/index.php/api/v2/claim/requests/${claimId}/action`, { data: { action: 'APPROVE' } });
  report.check('APPROVE klaim CANCELLED ditolak (bukan 200)', approve.status() !== 200, `status=${approve.status()}`);
  const after = await (await essPage.request.get(`/web/index.php/api/v2/claim/requests/${claimId}`)).json().catch(() => null);
  report.check('Status tetap CANCELLED', after?.data?.status === 'CANCELLED', `status=${after?.data?.status}`);

  await close();
  report.print();
});
