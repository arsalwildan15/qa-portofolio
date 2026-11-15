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
 * [FIX, sesi 2026-11-14] Root cause ketidakstabilan sesi sebelumnya: TC ini bergantung pada
 * balance employee admin yg SUDAH ADA di shared demo publik -- nilainya ikut berubah karena
 * aktivitas test lain / user lain di demo yg sama, jadi "balance = 0" tidak bisa dijamin stabil
 * antar run. Dikonfirmasi juga: dialog override butuh baris entitlement EKSPLISIT (walau
 * nilainya 0) utk leave type ybs -- employee benar2 baru tanpa riwayat apapun tidak memicu
 * dialog sama sekali. FIX: pakai createLeaveEntitlement() utk secara EKSPLISIT mengisi
 * entitlement = "0" utk employee yg ringan dipakai (pickLightlyUsedEmployee) sesaat sblm test
 * -- ini menjamin DUA prasyarat dialog sekaligus (baris entitlement ada + balance = 0) tanpa
 * bergantung pada state historis yg tidak terkendali.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/assign/TC-LEAVE-ASSIGN-02-Verify-Insufficient-Balance-Override-Dialog.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';
import { createLeaveEntitlement } from '../../../src/utils/createLeaveEntitlement';

const LEAVE_TYPE = 'US - FMLA';

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
  assignLeavePage,
  leaveListPage,
  leaveEntitlementPage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-LEAVE-ASSIGN-02', 'Insufficient Balance Override Dialog', env.baseURL, page, [
    /Failed to load resource.*4\d\d/,
  ]);

  const target = await pickLightlyUsedEmployee(page);
  const cancelDate = nextWeekday(15);
  const confirmDate = nextWeekday(16);

  report.step(`Set entitlement "${LEAVE_TYPE}" = 0 utk employee target (${target.fullName}) -- menjamin baris entitlement ada DAN balance = 0`);
  const entResult = await createLeaveEntitlement(leaveEntitlementPage, target.fullName, LEAVE_TYPE, '0');
  report.check('[API] POST leave-entitlements status === 200', entResult.status === 200, `status=${entResult.status}`);

  report.step('[Cancel path] Assign leave 1 hari dgn balance "US - FMLA" = 0, KLIK CANCEL pada dialog override');
  await assignLeavePage.goto();
  await assignLeavePage.selectEmployee(target.employeeId);
  await assignLeavePage.selectLeaveType(LEAVE_TYPE);
  await assignLeavePage.fillDateRange(cancelDate, cancelDate);
  const { response: cancelResp, overrideDialogShown: cancelDialogShown } = await assignLeavePage.submit('cancel');
  report.check('Dialog override balance MUNCUL (balance = 0)', cancelDialogShown);
  report.check('[Cancel path] TIDAK ada POST sukses terkirim setelah Cancel', cancelResp === null || cancelResp.status() !== 200, `status=${cancelResp?.status()}`);

  await leaveListPage.goto();
  await leaveListPage.selectEmployee(target.employeeId);
  await leaveListPage.clearStatusChip();
  await leaveListPage.selectStatus('Scheduled');
  await leaveListPage.search();
  const foundAfterCancel = await (await leaveListPage.rowByDate(cancelDate, 'yyyy-dd-mm')).first().isVisible({ timeout: 3_000 }).catch(() => false);
  report.check('[Cancel path] TIDAK ada record "Scheduled" tercipta utk tanggal ini', foundAfterCancel === false, `cancelDate=${cancelDate}`);

  report.step('[Confirm path] Assign leave 1 hari dgn balance "US - FMLA" = 0, KLIK OK/CONFIRM pada dialog override');
  await assignLeavePage.goto();
  await assignLeavePage.selectEmployee(target.employeeId);
  await assignLeavePage.selectLeaveType(LEAVE_TYPE);
  await assignLeavePage.fillDateRange(confirmDate, confirmDate);
  const { response: confirmResp, overrideDialogShown: confirmDialogShown } = await assignLeavePage.submit('confirm');
  report.check('Dialog override balance MUNCUL (balance = 0)', confirmDialogShown);
  report.check(
    '[Confirm path] Konfirmasi override TETAP membuat record (status 200) walau balance = 0 -- business logic abuse yg nyata',
    confirmResp?.status() === 200,
    `status=${confirmResp?.status()}`,
  );

  report.step('Verify via Leave List: record "Scheduled" utk confirmDate BENAR tercipta walau balance = 0');
  await leaveListPage.goto();
  await leaveListPage.selectEmployee(target.employeeId);
  await leaveListPage.clearStatusChip();
  await leaveListPage.selectStatus('Scheduled');
  await leaveListPage.search();
  const foundAfterConfirm = await (await leaveListPage.rowByDate(confirmDate, 'yyyy-dd-mm'))
    .first()
    .waitFor({ state: 'visible', timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  report.check('[Confirm path] Record "Scheduled" tercipta utk confirmDate (override benar2 bekerja)', foundAfterConfirm, `confirmDate=${confirmDate}`);

  report.print();
});
