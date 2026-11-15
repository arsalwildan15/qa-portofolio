/**
 * ================================================================================
 * TC-LEAVE-APPROVAL-03 — Verify An ESS Employee Cannot Approve Their Own Leave Request
 * Modul    : Leave - Access Control
 * Kategori : Security (S) / Segregation Of Duties (BFLAC)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPROVAL-03-Verify-ESS-Cannot-Approve-Own-Leave.spec.ts
 * Path     : tests/leave/approval/
 * ================================================================================
 *
 * TUJUAN:
 *   ESS dgn request Pending miliknya: allowedActions hanya CANCEL, dan memanggil endpoint
 *   approval Admin (PUT /api/v2/leave/employees/leave-requests/<id> {APPROVE}) langsung dari
 *   sesi ESS harus ditolak, status tetap "Pending Approval".
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/approval/TC-LEAVE-APPROVAL-03-Verify-ESS-Cannot-Approve-Own-Leave.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssLeaveRequest, getEssLeaveRequest } from '../../../src/utils/createEssLeaveRequest';

test('TC-LEAVE-APPROVAL-03: an ESS employee cannot approve their own leave request via API', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-LEAVE-APPROVAL-03', 'ESS Cannot Approve Own Leave', env.baseURL, page);

  report.step('Setup: ESS + 1 request Pending');
  const { essPage, close, leaveRequestId } = await createEssLeaveRequest(page, browser, addEmployeePage, 'QaLvSelf');
  const id = leaveRequestId as number;
  const before = await getEssLeaveRequest(essPage, id);
  report.check('ESS allowedActions hanya CANCEL', JSON.stringify(before.actions) === '["CANCEL"]', `actions=${JSON.stringify(before.actions)}`);

  report.step('[ESS API] PUT employees/leave-requests/<id> APPROVE');
  const approve = await essPage.request.put(`/web/index.php/api/v2/leave/employees/leave-requests/${id}`, { data: { action: 'APPROVE' } });
  report.check('APPROVE oleh pemilik request ditolak (bukan 200)', approve.status() !== 200, `status=${approve.status()}`);
  const after = await getEssLeaveRequest(essPage, id);
  report.check('Status tetap "Pending Approval"', after.status === 'Pending Approval', `status=${after.status}`);

  await close();
  report.print();
});
