/**
 * ================================================================================
 * TC-LEAVE-ASSIGN-02 — Verify Insufficient-Balance Override Dialog (Cancel & Confirm Paths)
 * Modul    : Leave - Assign Leave
 * Kategori : Negative (-) / Business Logic Abuse
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-ASSIGN-02-Verify-Insufficient-Balance-Override-Dialog.spec.ts
 * Path     : tests/leave/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi temuan kunci Assign Leave: saat balance employee
 *   target tidak cukup, Save TIDAK langsung ditolak -- melainkan
 *   menampilkan dialog "Confirm Leave Assignment" yg menawarkan utk
 *   OVERRIDE pengecekan balance. Jalur CANCEL harus membatalkan dgn
 *   bersih (tidak ada record tercipta). Jalur CONFIRM justru MEMBUAT
 *   record walau balance tidak cukup (bisa membuat balance negatif) --
 *   ini adalah business-logic abuse yg nyata, bukan validasi longgar yg
 *   tidak disengaja: admin secara sadar diberi opsi utk melewatinya.
 *
 * [TEMUAN] Dialog override ini HANYA dikonfirmasi muncul utk request SATU HARI. Percobaan
 * awal memakai rentang MULTI-HARI yg melebihi balance -- hasilnya TIDAK ADA dialog sama
 * sekali (silent block, konsisten dgn gap UX overlap/balance multi-hari yg sudah
 * terdokumentasi di ApplyLeavePage.hasOverlap()). Juga dikonfirmasi: dialog ini butuh
 * employee yg SUDAH punya baris entitlement eksplisit (walau nilainya 0) utk leave type
 * ybs -- memakai employee yg sama sekali baru (tanpa riwayat apapun) via
 * pickLightlyUsedEmployee() TIDAK memicu dialog sama sekali, kemungkinan krn tidak ada
 * baris entitlement sama sekali utk dibandingkan. TC ini memakai employee admin yg login
 * (sama dgn seluruh suite ini sebelumnya). Leave type yg dipakai juga sempat diganti dari
 * "US - Bereavement" ke "US - FMLA" (id=2) stlh dikonfirmasi live balance "US - Bereavement"
 * utk employee ini sudah bukan 0 lagi (48 jam, terkontaminasi aktivitas lain di shared demo
 * ini) -- "US - FMLA" dikonfirmasi 0 jam via API sesaat sblm TC ini terakhir diperbaiki.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/assign/TC-LEAVE-ASSIGN-02-Verify-Insufficient-Balance-Override-Dialog.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';

const US_FMLA_ID = 2;

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

test('TC-LEAVE-ASSIGN-02: insufficient balance shows an override dialog; Cancel aborts cleanly, Confirm creates the record anyway', async ({
  page,
  applyLeavePage,
  assignLeavePage,
  leaveListPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-LEAVE-ASSIGN-02', 'Insufficient Balance Override Dialog', env.baseURL, page, [
    /Failed to load resource.*4\d\d/,
  ]);

  const target = await getLoggedInEmployeeName(page);
  const cancelDate = nextWeekday(15);
  const confirmDate = nextWeekday(16);
  const { balance: balanceCheck } = await applyLeavePage.getRealTimeBalanceFor(US_FMLA_ID, cancelDate);
  report.check(
    'Balance "US - Bereavement" utk employee target < 8 jam (insufficient utk 1 hari penuh)',
    balanceCheck < 8,
    `balance=${balanceCheck} jam`,
  );

  report.step('[Cancel path] Assign leave 1 hari dgn balance "US - Bereavement" tidak cukup, KLIK CANCEL pada dialog override');
  await assignLeavePage.goto();
  await assignLeavePage.selectEmployee(target.employeeId);
  await assignLeavePage.selectLeaveType('US - FMLA');
  await assignLeavePage.fillDateRange(cancelDate, cancelDate);
  const { response: cancelResp, overrideDialogShown: cancelDialogShown } = await assignLeavePage.submit('cancel');
  report.check('Dialog override balance MUNCUL (balance tidak cukup)', cancelDialogShown);
  report.check('[Cancel path] TIDAK ada POST sukses terkirim setelah Cancel', cancelResp === null || cancelResp.status() !== 200, `status=${cancelResp?.status()}`);

  await leaveListPage.goto();
  await leaveListPage.selectEmployee(target.employeeId);
  await leaveListPage.clearStatusChip();
  await leaveListPage.selectStatus('Scheduled');
  await leaveListPage.search();
  const foundAfterCancel = await leaveListPage.rowByText(cancelDate).first().isVisible({ timeout: 3_000 }).catch(() => false);
  report.check('[Cancel path] TIDAK ada record "Scheduled" tercipta utk tanggal ini', foundAfterCancel === false, `cancelDate=${cancelDate}`);

  report.step('[Confirm path] Assign leave 1 hari dgn balance "US - Bereavement" tidak cukup, KLIK OK/CONFIRM pada dialog override');
  await assignLeavePage.goto();
  await assignLeavePage.selectEmployee(target.employeeId);
  await assignLeavePage.selectLeaveType('US - FMLA');
  await assignLeavePage.fillDateRange(confirmDate, confirmDate);
  const { response: confirmResp, overrideDialogShown: confirmDialogShown } = await assignLeavePage.submit('confirm');
  report.check('Dialog override balance MUNCUL (balance tidak cukup)', confirmDialogShown);
  report.check(
    '[Confirm path] Konfirmasi override TETAP membuat record (status 200) walau balance tidak cukup -- business logic abuse yg nyata',
    confirmResp?.status() === 200,
    `status=${confirmResp?.status()}`,
  );

  report.step('Verify via Leave List: record "Scheduled" utk confirmDate BENAR tercipta walau balance tidak cukup');
  await leaveListPage.goto();
  await leaveListPage.selectEmployee(target.employeeId);
  await leaveListPage.clearStatusChip();
  await leaveListPage.selectStatus('Scheduled');
  await leaveListPage.search();
  const foundAfterConfirm = await leaveListPage.rowByText(confirmDate).first().isVisible({ timeout: 5_000 }).catch(() => false);
  report.check('[Confirm path] Record "Scheduled" tercipta utk confirmDate (override benar2 bekerja)', foundAfterConfirm, `confirmDate=${confirmDate}`);

  report.print();
});
