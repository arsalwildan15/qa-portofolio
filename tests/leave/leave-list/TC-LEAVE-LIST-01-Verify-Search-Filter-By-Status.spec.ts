/**
 * ================================================================================
 * TC-LEAVE-LIST-01 — Verify Search/Filter By Status Returns Matching Records
 * Modul    : Leave - Leave List
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-LIST-01-Verify-Search-Filter-By-Status.spec.ts
 * Path     : tests/leave/leave-list/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi search dgn filter Status "Pending Approval" (setelah
 *   membuat satu leave request baru) menampilkan record tsb di hasil,
 *   dan filter Status lain yg tidak match (mis. "Rejected") TIDAK
 *   menampilkannya -- membuktikan filter Status benar2 diterapkan server
 *   side, bukan cuma filter kosmetik di client.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/leave-list/TC-LEAVE-LIST-01-Verify-Search-Filter-By-Status.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createLeaveEntitlement } from '../../../src/utils/createLeaveEntitlement';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';
import { uniqueLeaveWeekday } from '../../../src/data/testData';

test('TC-LEAVE-LIST-01: filtering Leave List by Status shows matching records and hides non-matching ones', async ({
  page,
  leaveEntitlementPage,
  applyLeavePage,
  leaveListPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-LEAVE-LIST-01', 'Search Filter By Status', env.baseURL, page);

  report.step('Buat 1 leave request baru (status "Pending Approval") sbg data uji');
  const me = await getLoggedInEmployeeName(page);
  await createLeaveEntitlement(leaveEntitlementPage, me.employeeId, 'US - Vacation', '500');
  // Entitlement baru saja diset ke 500 hari, jadi balance sudah pasti cukup -- cukup cek
  // overlap saja (bukan balance+overlap) utk memangkas jumlah round-trip, krn setiap
  // panggilan API menambah durasi total secara signifikan saat latensi server lagi tinggi.
  let applyDate = '';
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const candidate = uniqueLeaveWeekday(5);
    if (await applyLeavePage.hasOverlap(candidate, candidate)) continue;
    applyDate = candidate;
    break;
  }
  report.check('Berhasil menemukan tanggal weekday tanpa overlap', applyDate !== '', `applyDate="${applyDate}"`);
  await applyLeavePage.goto();
  await applyLeavePage.selectLeaveType('US - Vacation');
  await applyLeavePage.fillDateRange(applyDate, applyDate);
  await applyLeavePage.fillComments('TC-LEAVE-LIST-01 search by status marker');
  const { response } = await applyLeavePage.submit();
  report.check('[API] Leave request baru berhasil dibuat (status 200)', response?.status() === 200, `status=${response?.status()}, date=${applyDate}`);

  report.step('Search Leave List dgn filter Status = "Pending Approval" -> record baru HARUS muncul');
  await leaveListPage.goto();
  await leaveListPage.selectEmployee(me.employeeId);
  await leaveListPage.search();
  const pendingRow = (await leaveListPage.rowByDate(applyDate, 'yyyy-dd-mm'));
  const foundInPending = await pendingRow.first().isVisible({ timeout: 5_000 }).catch(() => false);
  report.check('Record baru MUNCUL saat filter Status = "Pending Approval" (default)', foundInPending, `applyDate=${applyDate}`);

  report.step('Ganti filter Status jadi "Rejected" -> record baru (Pending Approval) HARUS TIDAK muncul');
  // [TEMUAN] Chip default "Pending Approval" bersifat sticky dan TIDAK otomatis hilang hanya
  // dgn memilih status lain di dropdown -- harus dihapus dulu secara eksplisit, lihat
  // LeaveListPage.clearStatusChip(). Tanpa ini, search tetap ter-filter ke Pending Approval
  // meski dropdown Status sudah menunjukkan "Rejected".
  await leaveListPage.clearStatusChip();
  await leaveListPage.selectStatus('Rejected');
  await leaveListPage.search();
  const foundInRejected = await (await leaveListPage.rowByDate(applyDate, 'yyyy-dd-mm')).first().isVisible({ timeout: 3_000 }).catch(() => false);
  report.check('Record baru TIDAK muncul saat filter Status = "Rejected" (status tidak cocok)', foundInRejected === false);

  report.print();
});
