/**
 * ================================================================================
 * TC-TIME-ADMIN-ATTENDANCE-01 — Verify Admin Can Proxy Punch In On Behalf Of An Employee
 * Modul    : Time - Attendance (Employee Records, admin view)
 * Kategori : Positive (+) 1.1-C 1.4 1.8 | API (A) 6.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-ADMIN-ATTENDANCE-01-Verify-Proxy-Punch-In-For-Employee.spec.ts
 * Path     : tests/time/attendance/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi admin bisa mencari seorang employee via Time > Attendance > Employee
 *   Records, membuka Attendance Record-nya, lalu melakukan proxy Punch In/Out atas nama
 *   employee tsb (bukan punch in utk diri admin sendiri). Response API harus menunjukkan
 *   empNumber employee TARGET, bukan admin.
 *
 * [TEMUAN] Navigasi langsung ke /attendance/viewAttendanceRecord?employeeId=X&date=Y dgn
 * tanggal yg dibangun manual TIDAK reliable -- dikonfirmasi live, kombinasi employeeId/date
 * tsb kadang me-render halaman "No Records Found" yg terpotong (tanpa search form & tanpa
 * tombol "Add" sama sekali). Jalur yg reliable adalah lewat search form bawaan app (cari nama
 * employee, baru klik "View" pada baris hasil) -- itulah yg dipakai AdminAttendanceRecordsPage.
 *
 * [TEMUAN] Form proxy punch ini otomatis menampilkan "Punch In" ATAU "Punch Out" tergantung
 * status employee target SAAT itu (bisa jadi employee tsb kebetulan sudah dlm status
 * "Punched In" dari aktivitas lain di shared demo). TC ini sengaja menangani KEDUANYA, bukan
 * mengasumsikan selalu "Punch In" -- dikonfirmasi live, Punch In pakai POST tapi Punch Out
 * pakai PUT ke endpoint yg sama persis dgn temuan di modul Attendance self-service.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/attendance/TC-TIME-ADMIN-ATTENDANCE-01-Verify-Proxy-Punch-In-For-Employee.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

test('TC-TIME-ADMIN-ATTENDANCE-01: admin proxy-punches In for a target employee via Employee Records', async ({
  page,
  adminAttendanceRecordsPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-TIME-ADMIN-ATTENDANCE-01', 'Proxy Punch In For Employee', env.baseURL, page);

  report.step('Cari employee target via Employee Records, buka Attendance Record-nya');
  const target = await pickLightlyUsedEmployee(page);
  const [firstName = '', ...lastNameParts] = target.fullName.split(' ');
  await adminAttendanceRecordsPage.goto();
  const openedEmpNumber = await adminAttendanceRecordsPage.searchAndView(firstName, lastNameParts.join(' '));

  report.step('Buka form proxy Punch In/Out (tergantung status employee saat ini), submit');
  await adminAttendanceRecordsPage.openAddForm();
  const { response: resp, action } = await adminAttendanceRecordsPage.submitPunch();
  const body = await resp?.json().catch(() => null);
  report.check(`[API] Proxy Punch ${action === 'in' ? 'In' : 'Out'} berhasil (status 200)`, resp?.status() === 200, `status=${resp?.status()}`);
  report.check(
    `[API] Response empNumber === employee yg dibuka di Attendance Record (${openedEmpNumber}), BUKAN admin yg login`,
    body?.data?.employee?.empNumber === openedEmpNumber,
    `expected=${openedEmpNumber}, actual=${body?.data?.employee?.empNumber}`,
  );
  const expectedState = action === 'in' ? 'PUNCHED IN' : 'PUNCHED OUT';
  report.check(`[API] State setelah Punch ${action} adalah "${expectedState}"`, body?.data?.state?.id === expectedState, `state=${body?.data?.state?.id}`);

  report.step('Verify via Leave List/toast: "Successfully Saved" muncul');
  await page.waitForTimeout(1_000);
  const toastText = await page.locator('body').innerText();
  report.check('Toast "Successfully Saved" muncul', toastText.includes('Successfully Saved'));

  report.print();
});
