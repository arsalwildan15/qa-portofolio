/**
 * ================================================================================
 * TC-LEAVE-APPLY-01 — Verify Apply Leave With Valid Data Succeeds
 * Modul    : Leave - Apply
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPLY-01-Verify-Apply-Leave-Valid.spec.ts
 * Path     : tests/leave/apply/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi alur inti Apply Leave end-to-end: tanpa entitlement,
 *   Apply Leave TIDAK BISA dieksekusi sama sekali (halaman menampilkan
 *   "No Leave Types with Leave Balance", dikonfirmasi live) -- jadi TC
 *   ini juga memvalidasi helper createLeaveEntitlement() yang menjadi
 *   prasyarat SEMUA TC Apply Leave lainnya. Verifikasi: leave balance
 *   berkurang SAAT apply (status masih "Pending Approval", BUKAN
 *   menunggu persetujuan dulu) -- temuan penting yang dikonfirmasi
 *   live sebelum TC ini ditulis.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/apply/TC-LEAVE-APPLY-01-Verify-Apply-Leave-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createLeaveEntitlement } from '../../../src/utils/createLeaveEntitlement';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';
import { uniqueLeaveWeekday } from '../../../src/data/testData';

test('TC-LEAVE-APPLY-01: applying leave with valid data succeeds and deducts balance immediately', async ({
  page,
  leaveEntitlementPage,
  applyLeavePage,
  leaveListPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-LEAVE-APPLY-01', 'Apply Leave With Valid Data Succeeds', env.baseURL, page);

  report.step('Assign entitlement 10 hari ke employee yg sedang login (dicari via employeeId, bukan nama -- lihat getLoggedInEmployeeName) utk leave type US - Vacation');
  const me = await getLoggedInEmployeeName(page);
  // NOTE: entitlement assignment is cumulative (confirmed live, not an overwrite despite the
  // confirm dialog's wording), so repeated runs of this TC keep growing the balance. A large
  // value here is deliberate headroom against that accumulation plus any per-date-specific
  // server-side balance check this app runs at submit time (observed to sometimes differ
  // from the generic balance figure shown on page load).
  const { employeeName, status: entitlementStatus } = await createLeaveEntitlement(
    leaveEntitlementPage,
    me.employeeId,
    'US - Vacation',
    '500',
  );
  report.check(
    'Entitlement ter-assign ke employee yg BENAR (nama hasil pencarian cocok dgn employee yg login)',
    employeeName.includes(me.fullName) || me.fullName.includes(employeeName),
    `logged-in="${me.fullName}" (empNumber=${me.empNumber}), matched="${employeeName}"`,
  );
  report.check(
    '[API] POST leave-entitlements status === 200',
    entitlementStatus === 200,
    `status=${entitlementStatus}, employee="${employeeName}"`,
  );

  report.step('Buka Apply Leave, pilih leave type, isi tanggal 1 hari weekday, submit');
  await applyLeavePage.goto();
  report.check(
    'Form Apply Leave tampil (BUKAN "No Leave Types with Leave Balance")',
    !(await applyLeavePage.noLeaveTypesMessage.isVisible({ timeout: 3_000 }).catch(() => false)),
  );
  await applyLeavePage.selectLeaveType('US - Vacation');
  const balanceBefore = await applyLeavePage.leaveBalanceText.textContent();

  // NOTE: the static "Leave Balance" panel above does NOT reflect per-date availability --
  // confirmed live, a date can still be rejected with "Leave Balance Exceeded" despite that
  // panel showing hundreds of days, likely due to an existing request already covering
  // nearby dates from this suite's own prior runs against the same shared employee. Probe
  // the SAME real-time per-date endpoint the app itself checks on Apply, retrying with a
  // different date up to 5 times until one comes back both available and non-weekend.
  let applyDate = '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = uniqueLeaveWeekday(5);
    const { balance, isWeekend } = await applyLeavePage.getRealTimeBalanceFor(1, candidate);
    if (!isWeekend && balance >= 8) {
      applyDate = candidate;
      break;
    }
  }
  report.check('Berhasil menemukan tanggal weekday dgn balance cukup (real-time check)', applyDate !== '', `applyDate="${applyDate}"`);
  await applyLeavePage.fillDateRange(applyDate, applyDate);
  await applyLeavePage.fillComments('TC-LEAVE-APPLY-01 automated test');
  const { response: resp, errorToastText } = await applyLeavePage.submit();
  const toastVisible = await page.getByText('Successfully Saved').isVisible({ timeout: 5_000 }).catch(() => false);

  report.step('Verify response POST leave-requests, lalu verify detail via GET Leave List (leaveBreakdown/allowedActions)');
  report.check(
    '[API] POST leave-requests status === 200',
    resp?.status() === 200,
    `status=${resp?.status()}${errorToastText ? `, toast="${errorToastText}"` : ''}`,
  );
  const postBody = await resp?.json().catch(() => null);
  const newRequestId = postBody?.data?.id;
  report.check('[API] Response berisi id request baru', typeof newRequestId === 'number', `id=${newRequestId}`);

  await leaveListPage.goto();
  await page.waitForLoadState('networkidle').catch(() => {});
  const listResp = await page.request.get(
    `/web/index.php/api/v2/leave/employees/leave-requests?limit=50&fromDate=2026-01-01&toDate=2026-12-31&includeEmployees=onlyCurrent&statuses%5B%5D=1`,
  );
  const listBody = await listResp.json().catch(() => null);
  const newRecord = listBody?.data?.find((r: { id: number }) => r.id === newRequestId);
  report.check(
    '[API] Record baru punya leaveBreakdown dgn status "Pending Approval"',
    newRecord?.leaveBreakdown?.some((b: { name: string }) => b.name === 'Pending Approval') ?? false,
    `leaveBreakdown=${JSON.stringify(newRecord?.leaveBreakdown)}`,
  );
  report.check(
    '[API] allowedActions utk request baru berisi "CANCEL"',
    newRecord?.allowedActions?.some((a: { action: string }) => a.action === 'CANCEL') ?? false,
    `allowedActions=${JSON.stringify(newRecord?.allowedActions)}`,
  );

  report.step('Verify UI: toast sukses muncul, balance di form Apply Leave berkurang setelah reload');
  report.check('Toast "Successfully Saved" terlihat', toastVisible);

  await applyLeavePage.goto();
  await applyLeavePage.selectLeaveType('US - Vacation');
  const balanceAfter = await applyLeavePage.leaveBalanceText.textContent();
  report.check(
    'Leave Balance berkurang dibanding sebelum apply (dipotong saat apply, bukan setelah approval)',
    balanceBefore !== balanceAfter,
    `before="${balanceBefore}" after="${balanceAfter}"`,
  );

  report.print();
});
