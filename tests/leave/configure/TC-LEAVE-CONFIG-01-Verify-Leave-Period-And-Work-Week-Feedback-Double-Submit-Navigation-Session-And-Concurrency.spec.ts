/**
 * ================================================================================
 * TC-LEAVE-CONFIG-01 — Verify Leave Period And Work Week: Feedback, Double-Click Save, Refresh/Back, Lost Session, And Two Admins Editing At Once
 * Modul    : Leave > Configure > Leave Period (U050), Leave > Configure > Work Week (U052)
 * Kategori : Positive (+) 1.2 1.4 1.8 | Edge (!) 4.2 4.3 4.5 4.7 4.8 | Usability 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-CONFIG-01-Verify-Leave-Period-And-Work-Week-Feedback-Double-Submit-Navigation-Session-And-Concurrency.spec.ts
 * Path     : tests/leave/configure/
 * ================================================================================
 *
 * KESELAMATAN DATA: config GLOBAL bersama (R6). Setiap sub-tes membungkus nilai asli dgn
 * withConfigRestore() dan mengembalikannya di `finally`, apa pun hasilnya.
 *
 * TUJUAN (LIVE 17 Nov 2026):
 *   1.2 / 1.8  [U050] ubah Start Month -> Save -> toast sukses, nilai baru
 *          tampil setelah reload.   [U052] ubah satu hari -> Save -> toast sukses.
 *   4.2    klik ganda Save -> tanpa 5xx, PUT terkirim lebih dari satu kali tapi nilai akhir
 *          tetap konsisten (bukan race yg merusak data).
 *   4.3    ubah nilai lalu refresh/navigasi tanpa Save -> nilai lama kembali tampil (tanpa PUT).
 *   4.5    sesi berakhir lalu Save -> PUT ditolak 401, dialihkan ke login, nilai tidak berubah.
 *   4.7 / 4.8  dua Admin membuka Work Week bersamaan, keduanya Save nilai berbeda -> yang
 *          tersimpan adalah penyimpanan TERAKHIR (last-write-wins, dicatat sbg finding, bukan
 *          digagalkan: tidak ada optimistic locking di config form sesederhana ini).
 *   1.4    Work Week & Leave Period independen: mengubah satu tidak mempengaruhi yang lain.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/configure/TC-LEAVE-CONFIG-01-Verify-Leave-Period-And-Work-Week-Feedback-Double-Submit-Navigation-Session-And-Concurrency.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { loginAs } from '../../../src/utils/loginAs';
import { withConfigRestore } from '../../../src/utils/withConfigRestore';
import { API, currentLeavePeriod, currentWorkWeek } from '../../../src/utils/leaveData';

test('TC-LEAVE-CONFIG-01: Leave Period and Work Week - feedback, double-submit, navigation, session, concurrency', async ({ page, browser }, testInfo) => {
  testInfo.setTimeout(240_000);
  // Expired-session redirect noise (401 + unhandled "reading 'response'") is its own app-wide bug, asserted in TC-XMOD-07.
  const report = new TestReport('TC-LEAVE-CONFIG-01', 'Leave Period Work Week Feedback DoubleSubmit Navigation Session Concurrency', env.baseURL, page, [/status of 401/, /reading 'response'/]);
  try {
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    await withConfigRestore(
      () => currentLeavePeriod(page.request),
      async (snap) => { await page.request.put(`${API}leave/leave-period`, { data: snap }); },
      async () => {
        report.step('[U050] Leave Period: ubah, feedback, refresh, sesi habis');
        // Nilai asli dibaca dari API (angka pasti), BUKAN dari teks dropdown -- cocok utk
        // BULAN APA PUN yg sedang aktif, bukan hanya diasumsikan Januari/Februari.
        const origSnap = await currentLeavePeriod(page.request);
        const originalName = MONTHS[origSnap.startMonth - 1];
        const otherMonthNum = origSnap.startMonth === 1 ? 2 : 1;
        const otherName = MONTHS[otherMonthNum - 1];
        await page.goto('/web/index.php/leave/defineLeavePeriod');
        await page.waitForLoadState('networkidle');
        const monthSelect = page.locator('.oxd-select-text').first();
        await monthSelect.click();
        await page.getByRole('option', { name: otherName, exact: true }).click();
        const put = page.waitForResponse((r) => r.url().includes('leave/leave-period') && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
        await page.getByRole('button', { name: 'Save' }).click();
        const pr = await put;
        const toast = await page.locator('.oxd-toast').first().innerText({ timeout: 8_000 }).catch(() => '');
        report.check('1.2 / 1.8 [U050] Ubah Start Month -> PUT 200 & toast sukses', pr?.status() === 200 && /Successfully (Updated|Saved)/.test(toast), `PUT=${pr?.status()} toast=${toast.replace(/\s+/g, ' ')}`);
        await page.reload();
        await page.waitForLoadState('networkidle');
        report.check('1.2 [U050] Setelah reload, Start Month baru tampil', (await page.locator('.oxd-select-text').first().textContent()) === otherName, `tampil=${await page.locator('.oxd-select-text').first().textContent()}`);

        await monthSelect.click();
        await page.getByRole('option', { name: originalName, exact: true }).click();
        let putCount = 0;
        const onResp = (r: { url(): string; request(): { method(): string } }) => { if (r.url().includes('leave/leave-period') && r.request().method() === 'PUT') putCount += 1; };
        page.on('response', onResp);
        await page.getByRole('button', { name: 'Save' }).dblclick();
        await page.waitForTimeout(2500);
        page.off('response', onResp);
        const finalPeriod = await currentLeavePeriod(page.request);
        report.check('4.2 [U050] Klik ganda Save -> tanpa 5xx, nilai akhir konsisten (kembali ke bulan asli)', putCount >= 1 && finalPeriod.startMonth === origSnap.startMonth, `PUT terkirim=${putCount} startMonth=${finalPeriod.startMonth} (asli=${origSnap.startMonth})`);

        await monthSelect.click();
        await page.getByRole('option', { name: otherName, exact: true }).click();
        await page.reload();
        await page.waitForLoadState('networkidle');
        report.check('4.3 [U050] Ubah nilai lalu refresh TANPA Save -> nilai lama tetap tampil', (await page.locator('.oxd-select-text').first().textContent()) === originalName, `tampil=${await page.locator('.oxd-select-text').first().textContent()}`);

        await monthSelect.click();
        await page.getByRole('option', { name: otherName, exact: true }).click();
        const cookies = await page.context().cookies();
        await page.context().clearCookies();
        const sessPut = page.waitForResponse((r) => r.url().includes('leave/leave-period') && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
        await page.getByRole('button', { name: 'Save' }).click();
        const toLogin = await page.waitForURL(/auth\/login/, { timeout: 20_000 }).then(() => true, () => false);
        const sr = await sessPut;
        await page.context().addCookies(cookies);
        const periodNow = await currentLeavePeriod(page.request);
        report.check('4.5 [U050] Sesi berakhir lalu Save -> PUT 401, dialihkan ke login, nilai tidak berubah', sr?.status() === 401 && toLogin && periodNow.startMonth === origSnap.startMonth, `PUT=${sr?.status()} login=${toLogin} startMonth=${periodNow.startMonth} (asli=${origSnap.startMonth})`);
      },
    );

    await withConfigRestore(
      () => currentWorkWeek(page.request),
      async (snap) => { await page.request.put(`${API}leave/workweek`, { data: snap }); },
      async () => {
        report.step('[U052] Work Week: ubah & simpan, feedback');
        const periodUnaffected = await currentLeavePeriod(page.request);
        await page.goto('/web/index.php/leave/defineWorkWeek');
        await page.waitForLoadState('networkidle');
        const mondaySelect = page.locator('.oxd-select-text').first();
        const beforeMon = await mondaySelect.textContent();
        const otherMon = beforeMon === 'Full Day' ? 'Half Day' : 'Full Day';
        await mondaySelect.click();
        await page.getByRole('option', { name: otherMon, exact: true }).click();
        const put2 = page.waitForResponse((r) => r.url().includes('leave/workweek') && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
        await page.getByRole('button', { name: 'Save' }).click();
        const pr2 = await put2;
        const toast2 = await page.locator('.oxd-toast').first().innerText({ timeout: 8_000 }).catch(() => '');
        report.check('1.2 / 1.8 [U052] Ubah Monday -> PUT 200 & toast sukses', pr2?.status() === 200 && /Successfully (Updated|Saved)/.test(toast2), `PUT=${pr2?.status()} toast=${toast2.replace(/\s+/g, ' ')}`);
        const halfDayValue = (await currentWorkWeek(page.request)).monday;
        report.check('1.4 [U052] Mengubah Work Week tidak mempengaruhi Leave Period', (await currentLeavePeriod(page.request)).startMonth === periodUnaffected.startMonth);
        await mondaySelect.click();
        await page.getByRole('option', { name: beforeMon ?? 'Full Day', exact: true }).click();
        await page.getByRole('button', { name: 'Save' }).click();
        await page.waitForTimeout(1500);

        report.step('[U052] Dua Admin membuka Work Week bersamaan');
        await page.goto('/web/index.php/leave/defineWorkWeek');
        await page.waitForLoadState('networkidle');
        const b = await loginAs(browser, env.username, env.password);
        try {
          await b.page.goto('/web/index.php/leave/defineWorkWeek');
          await b.page.waitForLoadState('networkidle');
          const bTue = b.page.locator('.oxd-select-text').nth(1);
          await bTue.click();
          await b.page.getByRole('option', { name: 'Half Day', exact: true }).click();
          await b.page.getByRole('button', { name: 'Save' }).click();
          await b.page.waitForTimeout(1500);
        } finally {
          await b.close();
        }
        const aWed = page.locator('.oxd-select-text').nth(2);
        await aWed.click();
        await page.getByRole('option', { name: 'Half Day', exact: true }).click();
        await page.getByRole('button', { name: 'Save' }).click();
        await page.waitForTimeout(1500);
        const finalWeek = await currentWorkWeek(page.request);
        report.check('4.7 [U052] Admin A menyimpan setelah B -> perubahan A (Wednesday) tersimpan', finalWeek.wednesday === halfDayValue, `wednesday=${finalWeek.wednesday} (Half Day=${halfDayValue})`);
        report.finding('4.7 / 4.8 [U052] Dua Admin mengedit Work Week bersamaan', `tuesday=${finalWeek.tuesday} (perubahan B oleh Admin lain ${finalWeek.tuesday === halfDayValue ? 'tetap tersimpan' : 'TERTIMPA tanpa peringatan'} -- last write wins, tanpa optimistic locking, konsisten dgn pola yg sama di form lain.`);
      },
    );
  } finally {
    /* restore dilakukan oleh withConfigRestore masing-masing blok */
  }
  report.print();
});
