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
 * RUN COMMAND:
 *   npx playwright test tests/leave/assign/TC-LEAVE-ASSIGN-02-Verify-Insufficient-Balance-Override-Dialog.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';

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
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-LEAVE-ASSIGN-02', 'Insufficient Balance Override Dialog', env.baseURL, page, [
    /Failed to load resource.*4\d\d/,
  ]);

  const me = await getLoggedInEmployeeName(page);
  // "US - Bereavement" (id=3): leave type belum pernah disentuh TC lain di suite ini, jadi
  // employee ini punya balance 0 utk type ini -- skenario insufficient-balance yg bersih,
  // tidak bergantung pada aritmatika sisa balance yg rawan berubah (lihat TC-LEAVE-APPLY-05).

  report.step('[Cancel path] Assign leave dgn balance 0 utk "US - Bereavement", KLIK CANCEL pada dialog override');
  const cancelDate = nextWeekday(15);
  await assignLeavePage.goto();
  await assignLeavePage.selectEmployee(me.employeeId);
  await assignLeavePage.selectLeaveType('US - Bereavement');
  await assignLeavePage.fillDateRange(cancelDate, cancelDate);
  const { response: cancelResp, overrideDialogShown: cancelDialogShown } = await assignLeavePage.submit('cancel');
  report.check('Dialog override balance MUNCUL (balance 0, tidak cukup)', cancelDialogShown);
  report.check('[Cancel path] TIDAK ada POST sukses terkirim setelah Cancel', cancelResp === null || cancelResp.status() !== 200, `status=${cancelResp?.status()}`);

  await leaveListPage.goto();
  await leaveListPage.selectEmployee(me.employeeId);
  await leaveListPage.clearStatusChip();
  await leaveListPage.selectStatus('Scheduled');
  await leaveListPage.search();
  const foundAfterCancel = await leaveListPage.rowByText(cancelDate).first().isVisible({ timeout: 3_000 }).catch(() => false);
  report.check('[Cancel path] TIDAK ada record "Scheduled" tercipta utk tanggal ini', foundAfterCancel === false, `cancelDate=${cancelDate}`);

  report.step('[Confirm path] Assign leave dgn balance 0 utk "US - Bereavement", KLIK OK/CONFIRM pada dialog override');
  const confirmDate = nextWeekday(16);
  await assignLeavePage.goto();
  await assignLeavePage.selectEmployee(me.employeeId);
  await assignLeavePage.selectLeaveType('US - Bereavement');
  await assignLeavePage.fillDateRange(confirmDate, confirmDate);
  const { response: confirmResp, overrideDialogShown: confirmDialogShown } = await assignLeavePage.submit('confirm');
  report.check('Dialog override balance MUNCUL (balance 0, tidak cukup)', confirmDialogShown);
  report.check(
    '[Confirm path] Konfirmasi override TETAP membuat record (status 200) walau balance 0 -- business logic abuse yg nyata',
    confirmResp?.status() === 200,
    `status=${confirmResp?.status()}`,
  );

  report.step('Verify via Leave List: record "Scheduled" utk confirmDate BENAR tercipta walau balance tidak cukup');
  await leaveListPage.goto();
  await leaveListPage.selectEmployee(me.employeeId);
  await leaveListPage.clearStatusChip();
  await leaveListPage.selectStatus('Scheduled');
  await leaveListPage.search();
  const foundAfterConfirm = await leaveListPage.rowByText(confirmDate).first().isVisible({ timeout: 5_000 }).catch(() => false);
  report.check('[Confirm path] Record "Scheduled" tercipta utk confirmDate (override benar2 bekerja)', foundAfterConfirm, `confirmDate=${confirmDate}`);

  report.print();
});
