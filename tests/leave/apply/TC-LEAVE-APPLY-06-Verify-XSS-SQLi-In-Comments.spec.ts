/**
 * ================================================================================
 * TC-LEAVE-APPLY-06 — Verify XSS/SQLi Payload In Comments Does Not Execute Or Break The App
 * Modul    : Leave - Apply
 * Kategori : Security (S) 5.1-XSS-Stored 5.1-SQLi
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPLY-06-Verify-XSS-SQLi-In-Comments.spec.ts
 * Path     : tests/leave/apply/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS dan SQL injection yang diisi di kolom
 *   Comments pada form Apply Leave tidak tereksekusi sebagai script dan
 *   tidak merusak server/Leave List setelah tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/apply/TC-LEAVE-APPLY-06-Verify-XSS-SQLi-In-Comments.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createLeaveEntitlement } from '../../../src/utils/createLeaveEntitlement';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';
import { uniqueLeaveWeekday } from '../../../src/data/testData';

test('TC-LEAVE-APPLY-06: an XSS/SQLi payload in Comments does not execute and does not break the app', async ({
  page,
  leaveEntitlementPage,
  applyLeavePage,
  leaveListPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-LEAVE-APPLY-06', 'XSS/SQLi In Comments', env.baseURL, page);
  const payload = `<script>window.__xssApplyComment=true</script>' OR '1'='1'; DROP TABLE ohrm_leave;--`;

  report.step('Assign entitlement, cari tanggal weekday yg aman, isi Comments dgn payload XSS/SQLi, submit');
  const me = await getLoggedInEmployeeName(page);
  await createLeaveEntitlement(leaveEntitlementPage, me.employeeId, 'US - Vacation', '500');

  let applyDate = '';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = uniqueLeaveWeekday(5);
    const { balance, isWeekend } = await applyLeavePage.getRealTimeBalanceFor(1, candidate);
    if (isWeekend || balance < 8) continue;
    if (await applyLeavePage.hasOverlap(candidate, candidate)) continue;
    applyDate = candidate;
    break;
  }
  report.check('Berhasil menemukan tanggal weekday dgn balance cukup', applyDate !== '', `applyDate=${applyDate}`);

  await applyLeavePage.goto();
  await applyLeavePage.selectLeaveType('US - Vacation');
  await applyLeavePage.fillDateRange(applyDate, applyDate);
  await applyLeavePage.fillComments(payload);
  const { response } = await applyLeavePage.submit();
  report.check('[API] POST leave-requests status === 200 (payload diterima sbg string literal)', response?.status() === 200, `status=${response?.status()}`);

  report.step('Verify: payload TIDAK tereksekusi sbg script (window.__xssApplyComment tidak ter-set)');
  await page.waitForTimeout(500);
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xssApplyComment?: boolean }).__xssApplyComment === true)
    .catch(() => false);
  report.check('Payload XSS di Comments TIDAK tereksekusi sbg script', xssExecuted === false);

  report.step('Verify: Leave List masih berfungsi normal setelah payload tersimpan (tidak ada server error)');
  await leaveListPage.goto();
  await page.waitForLoadState('networkidle').catch(() => {});
  // "Masih berfungsi normal" berarti halaman mencapai state yg DETERMINISTIK (ada baris data
  // ATAU "No Records Found" yg memang valid tergantung filter default), bukan stuck/error --
  // payload XSS/SQLi yg merusak app biasanya bikin halaman gagal render sama sekali.
  const hasRows = await isVisibleWithWait(leaveListPage.tableRows.first(), 15_000);
  const hasNoRecordsMsg = await isVisibleWithWait(leaveListPage.noRecordsFound, 3_000);
  report.check('Leave List masih berfungsi normal setelah payload XSS/SQLi tersimpan', hasRows || hasNoRecordsMsg, `hasRows=${hasRows}, hasNoRecordsMsg=${hasNoRecordsMsg}`);

  report.print();
});
