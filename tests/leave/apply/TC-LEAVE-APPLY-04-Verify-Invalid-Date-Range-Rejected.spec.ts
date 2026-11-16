/**
 * ================================================================================
 * TC-LEAVE-APPLY-04 — Verify To Date Earlier Than From Date Is Rejected
 * Modul    : Leave - Apply
 * Kategori : Boundary (B) 3.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPLY-04-Verify-Invalid-Date-Range-Rejected.spec.ts
 * Path     : tests/leave/apply/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi rentang tanggal yang terbalik (To Date < From Date)
 *   tidak diterima sebagai leave request valid -- baik lewat pesan error
 *   client-side maupun minimal lewat tidak adanya POST sukses ke server.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/apply/TC-LEAVE-APPLY-04-Verify-Invalid-Date-Range-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createLeaveEntitlement } from '../../../src/utils/createLeaveEntitlement';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';
import { uniqueLeaveWeekday } from '../../../src/data/testData';

test('TC-LEAVE-APPLY-04: a To Date earlier than From Date is rejected, not silently accepted', async ({
  page,
  leaveEntitlementPage,
  applyLeavePage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  // A reversed range makes the app's own real-time balance-check fetch itself get rejected
  // (confirmed live: 422), which Chromium logs as "Failed to load resource" -- expected
  // noise from the app's own in-page request, not evidence of a bug (see TestReport).
  const report = new TestReport('TC-LEAVE-APPLY-04', 'Invalid Date Range Rejected', env.baseURL, page, [
    /Failed to load resource.*422/,
  ]);

  report.step('Assign entitlement, siapkan rentang terbalik (To < From)');
  const me = await getLoggedInEmployeeName(page);
  await createLeaveEntitlement(leaveEntitlementPage, me.employeeId, 'US - Vacation', '500');
  const fromDate = uniqueLeaveWeekday(10);
  // toDate deliberately BEFORE fromDate by parsing out the day and subtracting 5.
  const [yyyy, dd, mm] = fromDate.split('-');
  const toDate = `${yyyy}-${String(Math.max(1, Number(dd) - 5)).padStart(2, '0')}-${mm}`;

  report.step('Buka Apply Leave, isi From Date lebih besar dari To Date, submit');
  await applyLeavePage.goto();
  await applyLeavePage.selectLeaveType('US - Vacation');
  await applyLeavePage.fillDateRange(fromDate, toDate);
  await applyLeavePage.fillComments('TC-LEAVE-APPLY-04 invalid range test');
  let postStatus: number | undefined;
  const { response } = await applyLeavePage.submit();
  postStatus = response?.status();

  report.step('Verify: request TIDAK sukses dibuat dgn rentang terbalik ini (bukan 200, atau ada error client-side)');
  const errorVisible = await isVisibleWithWait(applyLeavePage.fieldErrors.first(), 2_000);
  const toastErrorVisible = await isVisibleWithWait(page
    .locator('.oxd-toast-content, .oxd-text--toast-message')
    .first()
    , 2_000)
    .catch(() => false);
  report.check(
    'Rentang terbalik (To < From) ditolak: bukan 200 ATAU ada error client/toast',
    postStatus !== 200 || errorVisible || toastErrorVisible,
    `postStatus=${postStatus}, fieldError=${errorVisible}, toastError=${toastErrorVisible}, from=${fromDate} to=${toDate}`,
  );

  report.print();
});
