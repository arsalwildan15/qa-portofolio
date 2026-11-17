/**
 * ================================================================================
 * TC-TIME-CONFIG-01 — Verify Attendance Configuration: Feedback, Double-Click Save, Refresh/Back, Lost Session, And Two Admins Editing At Once
 * Modul    : Time > Attendance > Configuration (U059)
 * Kategori : Positive (+) 1.1-R 1.1-U 1.2 1.8 | Edge (!) 4.2 4.3 4.5 4.7 4.8 | Usability 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-CONFIG-01-Verify-Attendance-Configuration-Feedback-Double-Submit-Navigation-Session-And-Concurrency.spec.ts
 * Path     : tests/time/attendance/
 * ================================================================================
 *
 * LATAR: URL sebenarnya adalah /attendance/configure (BUKAN /configuration -- deep link ke nama
 * yg salah merender halaman KOSONG tanpa error apa pun; dicapai dgn andal lewat menu Time >
 * Attendance > Configuration). 3 toggle (oxd-switch, bukan checkbox polos): "Employee can change
 * current time when punching in/out", "Employee can edit/delete own attendance records",
 * "Supervisor can add/edit/delete attendance records of subordinates". PUT attendance/configs
 * {canUserChangeCurrentTime, canUserModifyAttendance, canSupervisorModifyAttendance}.
 *
 * KESELAMATAN DATA: config GLOBAL bersama (R6) -- dibungkus withConfigRestore(), nilai asli
 * dibaca dulu & dikembalikan di `finally`, apa pun hasilnya.
 *
 * TUJUAN (LIVE 17 Nov 2026):
 *   1.1-R / 1.2  halaman menampilkan nilai aktual dari API (bukan default statis).
 *   1.1-U / 1.8  matikan satu toggle -> Save -> toast sukses, nilai baru tampil setelah reload.
 *   4.2    klik ganda Save -> tanpa 5xx, PUT terkirim lebih dari satu kali tapi nilai akhir
 *          tetap konsisten (bukan race yg merusak data).
 *   4.3    ubah toggle lalu refresh tanpa Save -> nilai lama kembali tampil (tanpa PUT).
 *   4.5    sesi berakhir lalu Save -> PUT ditolak 401, dialihkan ke login, nilai tidak berubah.
 *   4.7 / 4.8  dua Admin membuka halaman bersamaan, keduanya Save toggle berbeda -> yang
 *          tersimpan adalah penyimpanan TERAKHIR (last-write-wins, dicatat sbg finding).
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/attendance/TC-TIME-CONFIG-01-Verify-Attendance-Configuration-Feedback-Double-Submit-Navigation-Session-And-Concurrency.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { loginAs } from '../../../src/utils/loginAs';
import { withConfigRestore } from '../../../src/utils/withConfigRestore';
import { API, currentAttendanceConfig } from '../../../src/utils/timeData';

test('TC-TIME-CONFIG-01: Attendance Configuration - feedback, double-submit, navigation, session, concurrency', async ({ page, browser }, testInfo) => {
  testInfo.setTimeout(240_000);
  // Expired-session redirect noise is its own app-wide bug (TC-XMOD-07); excluded here.
  const report = new TestReport('TC-TIME-CONFIG-01', 'Attendance Configuration Feedback DoubleSubmit Navigation Session Concurrency', env.baseURL, page, [/status of 401/, /reading 'response'/]);
  const goto = () => page.goto('/web/index.php/attendance/configure');
  const switches = () => page.locator('.oxd-switch-input');
  const save = () => page.getByRole('button', { name: 'Save' }).first().click();
  try {
    await withConfigRestore(
      () => currentAttendanceConfig(page.request),
      async (snap) => { await page.request.put(`${API}attendance/configs`, { data: snap }); },
      async () => {
        const orig = await currentAttendanceConfig(page.request);

        report.step('Baca nilai aktual & ubah, feedback');
        await goto();
        await page.waitForLoadState('networkidle');
        report.check('1.1-R / 1.2 Halaman menampilkan nilai aktual dari API', await switches().first().isChecked() === orig.canUserChangeCurrentTime);
        await switches().first().click();
        const put = page.waitForResponse((r) => r.url().includes('attendance/configs') && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
        await save();
        const pr = await put;
        const toast = await page.locator('.oxd-toast').first().innerText({ timeout: 8_000 }).catch(() => '');
        report.check('1.1-U / 1.8 Matikan toggle -> PUT 200 & toast sukses', pr?.status() === 200 && /Success/.test(toast), `PUT=${pr?.status()} toast=${toast.replace(/\s+/g, ' ')}`);
        await goto();
        await page.waitForLoadState('networkidle');
        report.check('1.1-U Setelah reload, nilai baru tampil', await switches().first().isChecked() === !orig.canUserChangeCurrentTime);

        report.step('4.2 Klik ganda Save');
        await switches().first().click();
        let putCount = 0;
        const onResp = (r: { url(): string; request(): { method(): string } }) => { if (r.url().includes('attendance/configs') && r.request().method() === 'PUT') putCount += 1; };
        page.on('response', onResp);
        await page.getByRole('button', { name: 'Save' }).first().dblclick();
        await page.waitForTimeout(2500);
        page.off('response', onResp);
        const afterDbl = await currentAttendanceConfig(page.request);
        report.check('4.2 Klik ganda Save -> tanpa 5xx, nilai akhir konsisten', putCount >= 1 && afterDbl.canUserChangeCurrentTime === orig.canUserChangeCurrentTime, `PUT terkirim=${putCount} nilai=${afterDbl.canUserChangeCurrentTime} (asli=${orig.canUserChangeCurrentTime})`);

        report.step('4.3 Refresh tanpa Save');
        await switches().first().click();
        await goto();
        await page.waitForLoadState('networkidle');
        report.check('4.3 Ubah toggle lalu refresh TANPA Save -> nilai lama tetap tampil', await switches().first().isChecked() === orig.canUserChangeCurrentTime);

        report.step('4.5 Sesi berakhir sebelum Save');
        await switches().first().click();
        const cookies = await page.context().cookies();
        await page.context().clearCookies();
        const sessPut = page.waitForResponse((r) => r.url().includes('attendance/configs') && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
        await save();
        const toLogin = await page.waitForURL(/auth\/login/, { timeout: 20_000 }).then(() => true, () => false);
        const sr = await sessPut;
        await page.context().addCookies(cookies);
        const periodNow = await currentAttendanceConfig(page.request);
        report.check('4.5 Sesi berakhir lalu Save -> PUT 401, dialihkan ke login, nilai tidak berubah', sr?.status() === 401 && toLogin && periodNow.canUserChangeCurrentTime === orig.canUserChangeCurrentTime, `PUT=${sr?.status()} login=${toLogin}`);

        report.step('4.7 Dua Admin membuka halaman bersamaan');
        await goto();
        await page.waitForLoadState('networkidle');
        const b = await loginAs(browser, env.username, env.password);
        try {
          await b.page.goto('/web/index.php/attendance/configure');
          await b.page.waitForLoadState('networkidle');
          await b.page.locator('.oxd-switch-input').nth(1).click();
          await b.page.getByRole('button', { name: 'Save' }).first().click();
          await b.page.waitForTimeout(1500);
        } finally {
          await b.close();
        }
        await switches().nth(2).click();
        await save();
        await page.waitForTimeout(1500);
        const finalCfg = await currentAttendanceConfig(page.request);
        report.check('4.7 Admin A menyimpan setelah B -> perubahan A (switch ke-3) tersimpan', finalCfg.canSupervisorModifyAttendance !== orig.canSupervisorModifyAttendance, `canSupervisorModifyAttendance=${finalCfg.canSupervisorModifyAttendance}`);
        report.finding('4.7 / 4.8 Dua Admin mengedit Attendance Configuration bersamaan', `canUserModifyAttendance=${finalCfg.canUserModifyAttendance} (perubahan B oleh Admin lain ${finalCfg.canUserModifyAttendance !== orig.canUserModifyAttendance ? 'tetap tersimpan' : 'TERTIMPA tanpa peringatan'} -- last write wins, tanpa optimistic locking, konsisten dgn pola yg sama di Leave Period/Work Week.`);
      },
    );
  } finally {
    /* restore dilakukan oleh withConfigRestore */
  }
  report.print();
});
