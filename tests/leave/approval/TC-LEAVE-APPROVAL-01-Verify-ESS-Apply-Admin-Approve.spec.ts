/**
 * ================================================================================
 * TC-LEAVE-APPROVAL-01 — Verify An ESS Leave Request Can Be Approved By Admin (Pending -> Scheduled)
 * Modul    : Leave - Apply (ESS) + Leave List (Admin)
 * Kategori : Positive (+) / Cross-Role
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPROVAL-01-Verify-ESS-Apply-Admin-Approve.spec.ts
 * Path     : tests/leave/approval/
 * ================================================================================
 *
 * TUJUAN:
 *   Alur approval inti yg dulu dianggap "N/A" (hanya ada 1 akun Admin): akun ESS sungguhan
 *   mengajukan cuti 1 hari lewat UI Apply Leave (Pending Approval, saldo langsung terpotong),
 *   lalu Admin klik Approve di Leave List -> ESS melihat status "Scheduled", saldo tetap
 *   terpotong 1 hari (tidak dobel), dan ESS masih bisa CANCEL request Scheduled itu.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/approval/TC-LEAVE-APPROVAL-01-Verify-ESS-Apply-Admin-Approve.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { ApplyLeavePage } from '../../../src/pages';
import { createEssLeaveRequest, getEssLeaveRequest } from '../../../src/utils/createEssLeaveRequest';

test('TC-LEAVE-APPROVAL-01: an ESS leave request applied via UI is approved by Admin (Pending -> Scheduled)', async ({
  page,
  browser,
  addEmployeePage,
  leaveListPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-LEAVE-APPROVAL-01', 'ESS Apply Admin Approve', env.baseURL, page);

  report.step('Setup: akun ESS + entitlement 10 hari US - Vacation (tanpa request dulu)');
  const { ess, essPage, close, date } = await createEssLeaveRequest(page, browser, addEmployeePage, 'QaLvApprove', { apply: false });

  report.step('[ESS UI] Apply Leave 1 hari');
  const applyLeavePage = new ApplyLeavePage(essPage);
  await applyLeavePage.goto();
  await applyLeavePage.selectLeaveType('US - Vacation');
  const [yyyy, mm, dd] = date.split('-');
  const ddmm = `${yyyy}-${dd}-${mm}`;
  await applyLeavePage.fillDateRange(ddmm, ddmm);
  const { response } = await applyLeavePage.submit();
  const leaveRequestId = (await response?.json().catch(() => null))?.data?.id as number | undefined;
  report.check('[API] Apply 200', response?.status() === 200 && !!leaveRequestId, `status=${response?.status()}, id=${leaveRequestId}`);

  if (leaveRequestId) {
    const before = await getEssLeaveRequest(essPage, leaveRequestId);
    report.check('ESS: status "Pending Approval", saldo terpotong jadi 9', before.status === 'Pending Approval' && before.balance === 9, JSON.stringify(before));

    report.step('[Admin UI] Leave List -> cari employee ESS -> Approve');
    await leaveListPage.goto();
    await leaveListPage.selectEmployee(ess.fullName.split(' ').pop() ?? ess.fullName);
    await leaveListPage.search();
    const row = leaveListPage.tableRows.filter({ hasText: ess.fullName.split(' ').pop() ?? '' }).first();
    const resp = await leaveListPage.actOnRow(row, 'Approve');
    report.check('[API] PUT approve 200', resp?.status() === 200, `status=${resp?.status()}`);

    report.step('[ESS API] Status & saldo setelah Approve');
    const after = await getEssLeaveRequest(essPage, leaveRequestId);
    report.check('ESS melihat status "Scheduled"', after.status === 'Scheduled', `status=${after.status}`);
    report.check('Saldo tetap 9 (tidak terpotong dobel)', after.balance === 9, `balance=${after.balance}`);
    report.check('ESS masih bisa CANCEL request Scheduled', after.actions.includes('CANCEL'), `actions=${JSON.stringify(after.actions)}`);
  }

  await close();
  report.print();
});
