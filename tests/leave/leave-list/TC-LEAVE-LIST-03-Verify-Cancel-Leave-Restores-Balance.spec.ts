/**
 * ================================================================================
 * TC-LEAVE-LIST-03 — Verify Cancel Leave Restores The Deducted Balance
 * Modul    : Leave - Leave List
 * Kategori : Positive (+) / Business Logic
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-LIST-03-Verify-Cancel-Leave-Restores-Balance.spec.ts
 * Path     : tests/leave/leave-list/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi aksi "Cancel Leave" di Leave List mengembalikan
 *   balance yg sebelumnya terpotong saat Apply (konsisten dgn temuan
 *   bahwa balance dipotong SAAT apply, bukan saat approval -- jadi
 *   cancel HARUS mengembalikannya, bukan cuma mengubah status record).
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/leave-list/TC-LEAVE-LIST-03-Verify-Cancel-Leave-Restores-Balance.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createLeaveEntitlement } from '../../../src/utils/createLeaveEntitlement';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';
import { uniqueLeaveWeekday } from '../../../src/data/testData';

test('TC-LEAVE-LIST-03: cancelling a Pending Approval leave request restores the deducted balance', async ({
  page,
  leaveEntitlementPage,
  applyLeavePage,
  leaveListPage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-LEAVE-LIST-03', 'Cancel Leave Restores Balance', env.baseURL, page);

  report.step('Assign entitlement, apply 1 hari, catat balance SEBELUM dan SESUDAH apply');
  const me = await getLoggedInEmployeeName(page);
  await createLeaveEntitlement(leaveEntitlementPage, me.employeeId, 'US - Vacation', '500');
  // Entitlement baru saja diset ke 500 hari, balance sudah pasti cukup -- cukup cek overlap
  // saja utk memangkas round-trip (lihat TC-LEAVE-LIST-01 utk alasan yg sama).
  let applyDate = '';
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const candidate = uniqueLeaveWeekday(5);
    if (await applyLeavePage.hasOverlap(candidate, candidate)) continue;
    applyDate = candidate;
    break;
  }
  report.check('Berhasil menemukan tanggal weekday dgn balance cukup', applyDate !== '', `applyDate=${applyDate}`);

  await applyLeavePage.goto();
  await applyLeavePage.selectLeaveType('US - Vacation');
  const balanceBeforeApply = await applyLeavePage.leaveBalanceText.textContent();
  await applyLeavePage.fillDateRange(applyDate, applyDate);
  await applyLeavePage.fillComments('TC-LEAVE-LIST-03 cancel restores balance test');
  const { response } = await applyLeavePage.submit();
  report.check('[API] Apply leave berhasil (status 200)', response?.status() === 200, `status=${response?.status()}`);

  await applyLeavePage.goto();
  await applyLeavePage.selectLeaveType('US - Vacation');
  const balanceAfterApply = await applyLeavePage.leaveBalanceText.textContent();
  const parseBal = (s: string | null) => parseFloat((s ?? '0').replace(/[^0-9.]/g, ''));
  report.check(
    'Balance berkurang setelah apply',
    parseBal(balanceBeforeApply) - parseBal(balanceAfterApply) >= 0.99,
    `before="${balanceBeforeApply}" after="${balanceAfterApply}"`,
  );

  report.step('Buka Leave List, cari record baru, jalankan aksi "Cancel Leave"');
  await leaveListPage.goto();
  await leaveListPage.selectEmployee(me.employeeId);
  await leaveListPage.search();
  const row = (await leaveListPage.rowByDate(applyDate, 'yyyy-dd-mm')).first();
  const rowFound = await row.isVisible({ timeout: 5_000 }).catch(() => false);
  report.check('Record yg baru dibuat ditemukan di Leave List', rowFound, `applyDate=${applyDate}`);
  const cancelResp = await leaveListPage.cancelLeave(row);
  report.check('[API] Cancel Leave berhasil (response bukan error)', cancelResp !== null, `response=${cancelResp ? cancelResp.status() : 'null'}`);

  report.step('Verify: balance KEMBALI ke nilai SEBELUM apply (dikembalikan penuh, bukan cuma status berubah)');
  await applyLeavePage.goto();
  await applyLeavePage.selectLeaveType('US - Vacation');
  const balanceAfterCancel = await applyLeavePage.leaveBalanceText.textContent();
  report.check(
    'Balance setelah cancel KEMBALI sama dgn balance SEBELUM apply',
    Math.abs(parseBal(balanceBeforeApply) - parseBal(balanceAfterCancel)) < 0.01,
    `beforeApply="${balanceBeforeApply}" afterCancel="${balanceAfterCancel}"`,
  );

  report.print();
});
