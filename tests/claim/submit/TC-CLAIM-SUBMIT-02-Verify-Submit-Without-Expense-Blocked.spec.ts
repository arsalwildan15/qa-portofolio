/**
 * ================================================================================
 * TC-CLAIM-SUBMIT-02 — Verify A Claim With No Expenses Cannot Be Submitted (And Approved/Paid)
 * Modul    : Claim - Submit Claim (ESS)
 * Kategori : Negative (-) 2.5 | Security (S) 5.9 -- Business Rule
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-SUBMIT-02-Verify-Submit-Without-Expense-Blocked.spec.ts
 * Path     : tests/claim/submit/
 * ================================================================================
 *
 * TUJUAN:
 *   Klaim reimbursement tanpa satu pun expense tidak punya apa pun utk dibayar, jadi seharusnya
 *   tidak bisa di-Submit. Confirmed live 2026-11-15: tombol Submit menerima klaim kosong
 *   (status SUBMITTED, toast "Successfully Saved"), dan Admin bisa meng-Approve-nya -> PAID
 *   dgn total 0. Diperlakukan sbg bug business-rule (Low) -> TC SENGAJA FAILED (R3). Catatan:
 *   bisa jadi keputusan desain OrangeHRM -- perlu konfirmasi product owner (dicatat di Bug-List).
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/submit/TC-CLAIM-SUBMIT-02-Verify-Submit-Without-Expense-Blocked.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { SubmitClaimPage } from '../../../src/pages';
import { createEssClaim } from '../../../src/utils/createEssClaim';

test('TC-CLAIM-SUBMIT-02: a claim with no expenses cannot be submitted or paid', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-CLAIM-SUBMIT-02', 'Submit Without Expense Blocked', env.baseURL, page);

  report.step('Setup: ESS punya klaim INITIATED TANPA expense');
  const { ess, essPage, close, claimId } = await createEssClaim(page, browser, addEmployeePage, 'QaClmEmpty', { submit: false });
  const submitClaimPage = new SubmitClaimPage(essPage);

  report.step('[ESS] Buka detail klaim, klik Submit tanpa expense');
  await submitClaimPage.gotoDetail(claimId);
  const submitResp = await submitClaimPage.clickAction('Submit');
  const body = await submitResp?.json().catch(() => null);
  report.check('Submit klaim tanpa expense DITOLAK (tidak berubah jadi SUBMITTED)', body?.data?.status !== 'SUBMITTED', `httpStatus=${submitResp?.status()}, claimStatus=${body?.data?.status}`);

  report.step('[API] Kalau lolos ter-submit: apakah Admin bisa meng-Approve klaim kosong itu?');
  if (body?.data?.status === 'SUBMITTED') {
    const approve = await page.request.put(`/web/index.php/api/v2/claim/requests/${claimId}/action`, { data: { action: 'APPROVE' } });
    const approved = await approve.json().catch(() => null);
    report.check('Klaim kosong TIDAK bisa di-Approve jadi PAID', approved?.data?.status !== 'PAID', `httpStatus=${approve.status()}, claimStatus=${approved?.data?.status}`);
  }
  report.finding('Klaim uji', `empNumber=${ess.empNumber}, claimId=${claimId}`);

  await close();
  report.print();
});
