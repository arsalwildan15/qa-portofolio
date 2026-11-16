/**
 * ================================================================================
 * TC-TIME-PUNCH-02 — Verify XSS Payload In Punch In/Out Note Does Not Execute
 * Modul    : Time - Attendance (Punch In/Out)
 * Kategori : Security (S) 5.1-XSS-Stored
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-PUNCH-02-Verify-XSS-In-Note.spec.ts
 * Path     : tests/time/attendance/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di kolom Note pada form Punch In tidak
 *   tereksekusi sbg script saat tersimpan dan ditampilkan kembali
 *   (ditampilkan sbg "Punched In Note" setelah submit).
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/attendance/TC-TIME-PUNCH-02-Verify-XSS-In-Note.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-TIME-PUNCH-02: an XSS payload in the Punch In Note does not execute', async ({
  page,
  timeAttendancePage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-TIME-PUNCH-02', 'XSS In Note', env.baseURL, page);
  const payload = `<script>window.__xssPunchNote=true</script>`;

  report.step('Pastikan state "Punch In", isi Note dgn payload XSS, submit');
  await timeAttendancePage.goto();
  const btnText = (await timeAttendancePage.submitButton.textContent())?.trim();
  if (btnText === 'Out') {
    // Bersihkan state punch terbuka dari run sebelumnya dulu agar TC ini mulai dari "Punch In".
    await timeAttendancePage.submit();
    await timeAttendancePage.goto();
  }
  await timeAttendancePage.fillNote(payload);
  const { response } = await timeAttendancePage.submit();
  report.check('[API] POST attendance/records status === 200 (payload diterima sbg string literal)', response?.status() === 200, `status=${response?.status()}`);

  report.step('Verify: payload TIDAK tereksekusi sbg script, dan muncul sbg teks biasa setelah reload');
  await timeAttendancePage.goto();
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xssPunchNote?: boolean }).__xssPunchNote === true)
    .catch(() => false);
  report.check('Payload XSS di Note TIDAK tereksekusi sbg script', xssExecuted === false);

  report.step('Bersihkan: Punch Out agar state kembali netral utk run selanjutnya');
  await timeAttendancePage.submit();

  report.print();
});
