/**
 * ================================================================================
 * TC-LEAVE-APPLY-05 — Verify Applying Beyond Available Balance Is Rejected
 * Modul    : Leave - Apply
 * Kategori : Security (S) 5.9
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPLY-05-Verify-Insufficient-Balance-Rejected.spec.ts
 * Path     : tests/leave/apply/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi rentang tanggal yang sengaja dibuat melebihi sisa balance
 *   "US - Personal" DITOLAK (bukan 200), dan toast error yang muncul
 *   menyebutkan balance. Balance saat ini dibaca secara DINAMIS dari API
 *   real-time, bukan diasumsikan tetap -- dikonfirmasi live, Add
 *   Entitlement bersifat kumulatif/additive lintas run (nilai terus
 *   bertambah tiap kali suite ini dijalankan), jadi mengasumsikan angka
 *   pasti akan membuat TC ini rapuh di run-run berikutnya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/apply/TC-LEAVE-APPLY-05-Verify-Insufficient-Balance-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createLeaveEntitlement } from '../../../src/utils/createLeaveEntitlement';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';

const US_PERSONAL_ID = 4;

/** Finds the next weekday starting `offset` days from today, as yyyy-dd-mm. */
function nextWeekday(offset: number): string {
  for (let i = offset; i < offset + 30; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      return `${d.getFullYear()}-${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }
  throw new Error('nextWeekday: no weekday found in range');
}

test('TC-LEAVE-APPLY-05: a date range deliberately exceeding the remaining balance is rejected', async ({
  page,
  leaveEntitlementPage,
  applyLeavePage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  // The app's own in-page balance-check fetch legitimately gets a non-2xx when the range
  // exceeds balance (confirmed live) -- Chromium logs that as "Failed to load resource",
  // which is expected noise from a request Playwright never made, not an app bug.
  const report = new TestReport('TC-LEAVE-APPLY-05', 'Insufficient Balance Rejected', env.baseURL, page, [
    /Failed to load resource.*4\d\d/,
  ]);

  report.step('Assign entitlement +1 hari utk "US - Personal" (id=4), lalu baca balance AKTUAL saat ini');
  const me = await getLoggedInEmployeeName(page);
  const { status: entStatus } = await createLeaveEntitlement(leaveEntitlementPage, me.employeeId, 'US - Personal', '1');
  report.check('[API] POST leave-entitlements status === 200', entStatus === 200, `status=${entStatus}`);

  const probeDate = nextWeekday(10);
  const { balance: currentBalanceHours } = await applyLeavePage.getRealTimeBalanceFor(US_PERSONAL_ID, probeDate);
  const daysAvailable = Math.ceil(currentBalanceHours / 8);
  // Deliberately request well beyond whatever is currently available (+3 full weekdays of
  // margin) so this stays a clear, unambiguous over-balance case regardless of the exact
  // (and ever-growing, due to the cumulative-upsert behavior above) current balance.
  const daysToRequest = daysAvailable + 3;
  report.finding('Balance "US - Personal" saat ini', `${currentBalanceHours} jam (~${(currentBalanceHours / 8).toFixed(2)} hari); mengajukan ${daysToRequest} hari kerja berurutan (sengaja melebihi)`);

  report.step(`Buka Apply Leave, ajukan ${daysToRequest} hari kerja berurutan (melebihi sisa balance), submit`);
  const fromDate = nextWeekday(20);
  const [yyyy, dd, mm] = fromDate.split('-');
  const toDateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  toDateObj.setDate(toDateObj.getDate() + Math.ceil((daysToRequest * 7) / 5)); // generous calendar-day span to cover N weekdays incl. weekends
  const toDate = `${toDateObj.getFullYear()}-${String(toDateObj.getDate()).padStart(2, '0')}-${String(toDateObj.getMonth() + 1).padStart(2, '0')}`;

  await applyLeavePage.goto();
  await applyLeavePage.selectLeaveType('US - Personal');
  await applyLeavePage.fillDateRange(fromDate, toDate);
  await applyLeavePage.fillComments('TC-LEAVE-APPLY-05 over-balance attempt');
  const { response, errorToastText } = await applyLeavePage.submit();

  report.step('Verify: request DITOLAK (bukan 200)');
  report.check(
    '[Negative] Apply rentang yg melebihi sisa balance -> status BUKAN 200',
    response?.status() !== 200,
    `status=${response?.status()}, from=${fromDate} to=${toDate} (${daysToRequest} hari kerja)`,
  );
  // [TEMUAN APLIKASI] Konsisten dgn gap UX overlap yg sudah terdokumentasi di
  // ApplyLeavePage.hasOverlap(): utk rentang MULTI-HARI, client menjalankan pre-flight
  // balance-check-nya sendiri dan, kalau rentangnya melebihi sisa balance, cukup TIDAK
  // PERNAH mengirim POST -- form diam, tanpa toast maupun dialog. Toast "Leave Balance
  // Exceeded" dikonfirmasi HANYA muncul utk kasus satu-hari yg melebihi balance (server
  // yg menolak via response, bukan client yg diam2 menahan request). Jadi di sini, salah
  // satu dari dua sinyal berikut yg valid sbg bukti penolakan: toast ADA (server rejection
  // path) ATAU toast TIDAK ADA tapi juga TIDAK ada response sama sekali (silent client
  // pre-flight block, confirmed sbg gap UX yg sudah ada, bukan bug baru di TC ini).
  const silentlyBlocked = response === null && !errorToastText;
  const rejectedWithToast = !!errorToastText && /balance/i.test(errorToastText);
  report.check(
    'Ditolak via toast "balance" ATAU via silent pre-flight block (gap UX yg sudah terdokumentasi)',
    rejectedWithToast || silentlyBlocked,
    `toast="${errorToastText}", responseIsNull=${response === null}`,
  );

  report.print();
});
