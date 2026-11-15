/**
 * ================================================================================
 * TC-LEAVE-APPROVAL-02 — Verify Rejecting An ESS Leave Request Restores Its Balance
 * Modul    : Leave - Leave List (Admin)
 * Kategori : Positive (+) / Business Rule
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPROVAL-02-Verify-Reject-Restores-Balance.spec.ts
 * Path     : tests/leave/approval/
 * ================================================================================
 *
 * TUJUAN:
 *   Request Pending milik ESS memotong saldo (10 -> 9). Admin klik Reject di Leave List ->
 *   ESS melihat "Rejected", saldo KEMBALI ke 10, dan tidak ada aksi tersisa utk ESS.
 *   APPROVE via API setelah Reject juga harus ditolak (status terminal).
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/approval/TC-LEAVE-APPROVAL-02-Verify-Reject-Restores-Balance.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssLeaveRequest, getEssLeaveRequest } from '../../../src/utils/createEssLeaveRequest';

test('TC-LEAVE-APPROVAL-02: rejecting an ESS leave request restores the balance and is terminal', async ({
  page,
  browser,
  addEmployeePage,
  leaveListPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-LEAVE-APPROVAL-02', 'Reject Restores Balance', env.baseURL, page);

  report.step('Setup: ESS + entitlement 10 hari + 1 request Pending');
  const { ess, essPage, close, leaveRequestId } = await createEssLeaveRequest(page, browser, addEmployeePage, 'QaLvReject');
  const id = leaveRequestId as number;
  const before = await getEssLeaveRequest(essPage, id);
  report.check('Sebelum: Pending Approval, saldo 9', before.status === 'Pending Approval' && before.balance === 9, JSON.stringify(before));

  report.step('[Admin UI] Leave List -> cari employee ESS -> Reject');
  const lastName = ess.fullName.split(' ').pop() ?? ess.fullName;
  await leaveListPage.goto();
  await leaveListPage.selectEmployee(lastName);
  await leaveListPage.search();
  const resp = await leaveListPage.actOnRow(leaveListPage.tableRows.filter({ hasText: lastName }).first(), 'Reject');
  report.check('[API] PUT reject 200', resp?.status() === 200, `status=${resp?.status()}`);

  report.step('[ESS API] Status & saldo setelah Reject');
  const after = await getEssLeaveRequest(essPage, id);
  report.check('ESS melihat status "Rejected"', after.status === 'Rejected', `status=${after.status}`);
  report.check('Saldo kembali ke 10', after.balance === 10, `balance=${after.balance}`);
  report.check('Tidak ada aksi tersisa utk ESS', after.actions.length === 0, `actions=${JSON.stringify(after.actions)}`);

  report.step('[Admin API] APPROVE setelah Reject');
  const approve = await page.request.put(`/web/index.php/api/v2/leave/employees/leave-requests/${id}`, { data: { action: 'APPROVE' } });
  report.check('APPROVE stlh Reject ditolak (bukan 200)', approve.status() !== 200, `status=${approve.status()}`);

  await close();
  report.print();
});
