/**
 * ================================================================================
 * TC-TIME-PUNCH-01 — Verify Punch In Then Punch Out Completes The Attendance Cycle
 * Modul    : Time - Attendance (Punch In/Out)
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-PUNCH-01-Verify-Punch-In-Out-Cycle.spec.ts
 * Path     : tests/time/attendance/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi siklus dasar Punch In -> Punch Out: form ini TIDAK
 *   punya URL terpisah per state -- halaman yg sama berganti antara
 *   "Punch In" (tombol "In") dan "Punch Out" (tombol "Out") tergantung
 *   apakah employee sedang punya punch yg masih terbuka, dikonfirmasi
 *   live sblm TC ini ditulis. Setelah Punch In, halaman menampilkan
 *   "Punched in time" dan notenya; setelah Punch Out, kembali ke state
 *   "Punch In" semula (siklus bersih, tidak nyangkut di satu state).
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/attendance/TC-TIME-PUNCH-01-Verify-Punch-In-Out-Cycle.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-TIME-PUNCH-01: punching in then punching out completes a clean attendance cycle', async ({
  page,
  timeAttendancePage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-TIME-PUNCH-01', 'Punch In/Out Cycle', env.baseURL, page);

  report.step('Buka Punch In/Out, pastikan state awal adalah "Punch In" (bukan sedang Punch Out)');
  await timeAttendancePage.goto();
  const initialButtonText = await timeAttendancePage.submitButton.textContent();
  report.check(
    'State awal adalah "In" (siap Punch In)',
    initialButtonText?.trim() === 'In',
    `initialButtonText="${initialButtonText?.trim()}"`,
  );

  report.step('Isi Note, klik "In" (Punch In)');
  await timeAttendancePage.fillNote('TC-TIME-PUNCH-01 punch in');
  const { response: inResponse } = await timeAttendancePage.submit();
  report.check('[API] POST attendance/records (Punch In) status === 200', inResponse?.status() === 200, `status=${inResponse?.status()}`);

  report.step('Verify: halaman sekarang menunjukkan state "Punched In" dgn note yg sesuai');
  // [TEMUAN] Halaman ini TIDAK re-render otomatis setelah POST (confirmed live: tombol
  // masih berlabel "In" tepat setelah submit meski API sudah 200) -- harus navigasi ulang
  // (re-fetch state) utk melihat state terbaru.
  await timeAttendancePage.goto();
  const bodyAfterIn = await page.locator('body').innerText();
  report.check('Halaman menampilkan "Punched in time" setelah Punch In', bodyAfterIn.includes('Punched in time'));
  report.check('Note yg diisi muncul di halaman (Punched In Note)', bodyAfterIn.includes('TC-TIME-PUNCH-01 punch in'));
  const outButtonText = await timeAttendancePage.submitButton.textContent();
  report.check('Tombol submit sekarang berlabel "Out"', outButtonText?.trim() === 'Out', `outButtonText="${outButtonText?.trim()}"`);

  report.step('Klik "Out" (Punch Out), verify kembali ke state "Punch In" semula');
  const { response: outResponse } = await timeAttendancePage.submit();
  report.check('[API] PUT attendance/records (Punch Out) status === 200', outResponse?.status() === 200, `status=${outResponse?.status()}`);
  await timeAttendancePage.goto();
  const finalButtonText = await timeAttendancePage.submitButton.textContent();
  report.check(
    'Setelah Punch Out, state kembali ke "In" (siklus bersih, tidak nyangkut)',
    finalButtonText?.trim() === 'In',
    `finalButtonText="${finalButtonText?.trim()}"`,
  );

  report.print();
});
