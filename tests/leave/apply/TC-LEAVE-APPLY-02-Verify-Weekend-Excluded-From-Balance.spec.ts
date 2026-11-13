/**
 * ================================================================================
 * TC-LEAVE-APPLY-02 — Verify Weekend Days Are Excluded From Balance Deduction
 * Modul    : Leave - Apply
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPLY-02-Verify-Weekend-Excluded-From-Balance.spec.ts
 * Path     : tests/leave/apply/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi temuan kunci yang dikonfirmasi live sebelum TC ini
 *   ditulis: mengajukan rentang tanggal yang mencakup akhir pekan
 *   (Sabtu-Minggu) secara otomatis dipecah SERVER-SIDE jadi record
 *   per-hari kalender, dan hari yang jatuh di akhir pekan diberi status
 *   "Weekend" dengan durasi 0 jam (TIDAK mengurangi balance), sementara
 *   hari kerja di dalam rentang yang sama tetap mengurangi balance
 *   secara normal.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/apply/TC-LEAVE-APPLY-02-Verify-Weekend-Excluded-From-Balance.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createLeaveEntitlement } from '../../../src/utils/createLeaveEntitlement';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';

test('TC-LEAVE-APPLY-02: a date range spanning a weekend excludes the weekend days from balance deduction', async ({
  page,
  leaveEntitlementPage,
  applyLeavePage,
  leaveListPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-LEAVE-APPLY-02', 'Weekend Excluded From Balance', env.baseURL, page);

  report.step('Assign entitlement, cari rentang Jumat-Senin (mencakup 1 Sabtu + 1 Minggu) dgn balance cukup');
  const me = await getLoggedInEmployeeName(page);
  await createLeaveEntitlement(leaveEntitlementPage, me.employeeId, 'US - Vacation', '500');

  // Cari hari Jumat berikutnya dlm rentang aman (dicek via API real-time, bukan asumsi),
  // lalu rentang berakhir hari Senin berikutnya (Jumat+3 = Senin, melewati Sabtu+Minggu).
  let fromDate = '';
  let toDate = '';
  for (let offset = 1; offset <= 60 && !fromDate; offset += 1) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    if (d.getDay() !== 5) continue; // cari Jumat (5)
    const yyyy = d.getFullYear();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const candidateFrom = `${yyyy}-${dd}-${mm}`;
    const dEnd = new Date(d);
    dEnd.setDate(dEnd.getDate() + 3); // Jumat -> Senin
    const candidateTo = `${dEnd.getFullYear()}-${String(dEnd.getDate()).padStart(2, '0')}-${String(dEnd.getMonth() + 1).padStart(2, '0')}`;
    const { balance } = await applyLeavePage.getRealTimeBalanceFor(1, candidateFrom);
    if (balance < 8) continue;
    const overlap = await applyLeavePage.hasOverlap(candidateFrom, candidateTo);
    if (overlap) continue;
    fromDate = candidateFrom;
    toDate = candidateTo;
  }
  report.check('Berhasil menemukan rentang Jumat-Senin yg valid', fromDate !== '' && toDate !== '', `from=${fromDate} to=${toDate}`);

  report.step('Buka Apply Leave, pilih leave type, isi rentang Jumat-Senin, submit');
  await applyLeavePage.goto();
  await applyLeavePage.selectLeaveType('US - Vacation');
  const balanceBefore = await applyLeavePage.leaveBalanceText.textContent();
  await applyLeavePage.fillDateRange(fromDate, toDate);
  await applyLeavePage.fillComments('TC-LEAVE-APPLY-02 weekend exclusion test');
  const { response: resp, errorToastText } = await applyLeavePage.submit();
  report.check(
    '[API] POST leave-requests status === 200',
    resp?.status() === 200,
    `status=${resp?.status()}${errorToastText ? `, toast="${errorToastText}"` : ''}`,
  );

  report.step('Verify via Leave List: 4 hari record (Jumat/Sabtu/Minggu/Senin), 2 hari "Weekend" (0 jam), 2 hari kerja (8 jam)');
  const postBody = await resp?.json().catch(() => null);
  const newRequestId = postBody?.data?.id;
  await leaveListPage.goto();
  await page.waitForLoadState('networkidle').catch(() => {});
  const listResp = await page.request.get(
    `/web/index.php/api/v2/leave/employees/leave-requests?limit=50&fromDate=2026-01-01&toDate=2026-12-31&includeEmployees=onlyCurrent&statuses%5B%5D=1`,
  );
  const listBody = await listResp.json().catch(() => null);
  const newRecord = listBody?.data?.find((r: { id: number }) => r.id === newRequestId);
  // [TEMUAN] Beda dari halaman detail (viewLeaveRequest/<id>) yg merinci SATU baris per hari
  // kalender termasuk hari Weekend, endpoint LIST ini meng-agregasi per status: cuma 1 entri
  // "Pending Approval" dgn lengthDays = JUMLAH HARI KERJA SAJA (2, bukan 4) -- hari Weekend
  // tidak muncul sama sekali di ringkasan level-list ini, konsisten dgn balance yg cuma
  // berkurang utk hari kerja.
  const breakdown: { name: string; lengthDays: number }[] = newRecord?.leaveBreakdown ?? [];
  report.check(
    'leaveBreakdown (level-list) teragregasi: 1 entri "Pending Approval" dgn lengthDays=2 (hari kerja saja)',
    breakdown.length === 1 && breakdown[0]?.name === 'Pending Approval' && breakdown[0]?.lengthDays === 2,
    `breakdown=${JSON.stringify(breakdown)}`,
  );

  await page.goto(`/web/index.php/leave/viewLeaveRequest/${newRequestId}`);
  await page.waitForLoadState('networkidle').catch(() => {});
  const perDayRows = await page.locator('.oxd-table-card').allTextContents();
  const weekendRows = perDayRows.filter((r) => r.includes('Weekend'));
  report.check(
    'Tepat 2 baris berstatus "Weekend" dgn durasi 0.00 jam di halaman detail',
    weekendRows.length === 2 && weekendRows.every((r) => r.includes('0.00')),
    `weekendRows=${JSON.stringify(weekendRows)}`,
  );

  report.step('Verify balance berkurang TEPAT 2 hari (bukan 4), krn 2 hari Weekend tidak dihitung');
  await applyLeavePage.goto();
  await applyLeavePage.selectLeaveType('US - Vacation');
  const balanceAfter = await applyLeavePage.leaveBalanceText.textContent();
  const parseBal = (s: string | null) => parseFloat((s ?? '0').replace(/[^0-9.]/g, ''));
  const delta = parseBal(balanceBefore) - parseBal(balanceAfter);
  report.check(
    'Balance berkurang tepat 2.00 hari (2 hari kerja, BUKAN 4 hari total rentang)',
    Math.abs(delta - 2) < 0.01,
    `before="${balanceBefore}" after="${balanceAfter}" delta=${delta}`,
  );

  report.print();
});
