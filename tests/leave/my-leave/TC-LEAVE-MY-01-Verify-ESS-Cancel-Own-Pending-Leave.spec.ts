/**
 * ================================================================================
 * TC-LEAVE-MY-01 — Verify An ESS Employee Can See And Cancel Their Own Pending Leave In My Leave
 * Modul    : Leave - My Leave (ESS)
 * Kategori : Positive (+) 1.3 1.5 | Negative (-) 2.5 -- State Machine
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-MY-01-Verify-ESS-Cancel-Own-Pending-Leave.spec.ts
 * Path     : tests/leave/my-leave/
 * ================================================================================
 *
 * TUJUAN:
 *   ESS membuka My Leave (leave/viewMyLeaveList): request Pending miliknya tampil. ESS
 *   membatalkannya lewat UI -> status "Cancelled", saldo kembali ke 10. Lalu Admin mencoba
 *   APPROVE request yg sudah dibatalkan via API -> harus ditolak.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/my-leave/TC-LEAVE-MY-01-Verify-ESS-Cancel-Own-Pending-Leave.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { LeaveListPage } from '../../../src/pages';
import { createEssLeaveRequest, getEssLeaveRequest } from '../../../src/utils/createEssLeaveRequest';

test('TC-LEAVE-MY-01: an ESS employee sees and cancels their own pending leave in My Leave', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-LEAVE-MY-01', 'ESS Cancel Own Pending Leave', env.baseURL, page);

  report.step('Setup: ESS + 1 request Pending (saldo 9)');
  const { essPage, close, leaveRequestId } = await createEssLeaveRequest(page, browser, addEmployeePage, 'QaLvMy');
  const id = leaveRequestId as number;

  report.step('[ESS UI] My Leave menampilkan request Pending miliknya');
  await essPage.goto('/web/index.php/leave/viewMyLeaveList');
  await essPage.waitForLoadState('networkidle').catch(() => {});
  const myLeave = new LeaveListPage(essPage);
  const row = myLeave.tableRows.filter({ hasText: 'Pending Approval' }).first();
  const visible = await isVisibleWithWait(row, 15_000);
  report.check('Request Pending tampil di My Leave', visible);

  report.step('[ESS UI] Cancel request tsb');
  const responsePromise = essPage
    .waitForResponse((r) => r.url().includes('/leave-requests/') && r.request().method() === 'PUT', { timeout: 15_000 })
    .catch(() => null);
  const inlineCancel = row.getByRole('button', { name: 'Cancel', exact: true });
  if (await isVisibleWithWait(inlineCancel, 3_000)) {
    await inlineCancel.click();
  } else {
    await myLeave.cancelLeave(row);
  }
  const cancelResp = await responsePromise;
  report.check('[API] Cancel 200', cancelResp?.status() === 200, `status=${cancelResp?.status()}`);

  const after = await getEssLeaveRequest(essPage, id);
  report.check('Status "Cancelled"', after.status === 'Cancelled', `status=${after.status}`);
  report.check('Saldo kembali ke 10', after.balance === 10, `balance=${after.balance}`);

  report.step('[Admin API] APPROVE request yg sudah dibatalkan');
  const approve = await page.request.put(`/web/index.php/api/v2/leave/employees/leave-requests/${id}`, { data: { action: 'APPROVE' } });
  report.check('APPROVE request Cancelled ditolak (bukan 200)', approve.status() !== 200, `status=${approve.status()}`);

  await close();
  report.print();
});
