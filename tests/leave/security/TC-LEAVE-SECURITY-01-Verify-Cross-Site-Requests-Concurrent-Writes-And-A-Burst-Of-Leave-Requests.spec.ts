/**
 * ================================================================================
 * TC-LEAVE-SECURITY-01 — Verify Leave Settings And Requests Under Cross-Site Requests, Concurrent Writes And A Burst Of Applications
 * Modul    : Leave (U043 Apply, U050 Leave Period, U052 Work Week, U053 Holidays, U054 Assign Leave)
 * Kategori : Edge (!) 4.4 | Security (S) 5.4 5.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-SECURITY-01-Verify-Cross-Site-Requests-Concurrent-Writes-And-A-Burst-Of-Leave-Requests.spec.ts
 * Path     : tests/leave/security/
 * ================================================================================
 *
 * KESELAMATAN DATA: Leave Period & Work Week dibungkus withConfigRestore() (R6). Holiday &
 * karyawan uji dibuat & dihapus sendiri.
 *
 * TUJUAN (LIVE 17 Nov 2026):
 *   5.4  Halaman di situs lain (https://attacker.test), dibuka Admin yg sedang login: fetch
 *        no-cors & fetch JSON ber-credentials ke PUT leave-period, PUT workweek, POST holiday
 *        -> cookie sesi tidak ikut terkirim & config/data tidak berubah; sesi Admin tetap aktif.
 *   4.4  [U053] 3 POST holiday paralel -> semua 200 (3 baris, tidak ada yg hilang).
 *        [U053] 2 DELETE holiday yg sama paralel -> tepat satu 200, lainnya 404.
 *   5.5  [U054] 6 POST Assign Leave paralel (tanggal beda-beda, ditarget ke karyawan uji sendiri)
 *        -> dicatat ada/tidaknya rate limit (finding, spt pola BG-067 di Recruitment).
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/security/TC-LEAVE-SECURITY-01-Verify-Cross-Site-Requests-Concurrent-Writes-And-A-Burst-Of-Leave-Requests.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';
import { withConfigRestore } from '../../../src/utils/withConfigRestore';
import { API, cleanupLeave, currentLeavePeriod, currentWorkWeek, deleteHolidays, firstLeaveTypeId, getJson, grantEntitlement } from '../../../src/utils/leaveData';

const ATTACKER = 'https://attacker.test';

test('TC-LEAVE-SECURITY-01: cross-site requests, concurrent writes and a burst of applications', async ({ page }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-LEAVE-SECURITY-01', 'Cross Site Requests Concurrent Writes Burst Leave', env.baseURL);
  const emp = await createEmployee(page.request, 'QaLeaveSec', `L${Date.now() % 100000}`);
  const typeId = await firstLeaveTypeId(page.request);
  await grantEntitlement(page.request, emp, typeId, '100');
  const s = `${Date.now() % 100000}`;
  const holidayIds: number[] = [];
  const burstLeaveIds: number[] = [];
  try {
    report.step('5.4 Situs lain memakai sesi Admin');
    const origin = new URL(env.baseURL).origin;
    const periodSnap = await currentLeavePeriod(page.request);
    const weekSnap = await currentWorkWeek(page.request);
    await withConfigRestore(
      async () => ({ periodSnap, weekSnap }),
      async (snap) => { await page.request.put(`${API}leave/leave-period`, { data: snap.periodSnap }); await page.request.put(`${API}leave/workweek`, { data: snap.weekSnap }); },
      async () => {
        const sent: string[] = [];
        const withCookie: string[] = [];
        page.context().on('request', async (r) => {
          if (!r.url().startsWith(`${origin}/web/index.php/api/v2/leave/`)) return;
          const h = await r.allHeaders().catch(() => ({} as Record<string, string>));
          if ((h['referer'] ?? '').startsWith(ATTACKER) || (h['origin'] ?? '') === ATTACKER) {
            sent.push(`${r.method()} ${r.url().replace(origin, '')}`);
            if (/orangehrm=/.test(h['cookie'] ?? '')) withCookie.push(`${r.method()} ${r.url().replace(origin, '')}`);
          }
        });
        const calls = [
          [`${origin}${API}leave/leave-period`, 'PUT', { startMonth: 6, startDay: 6 }],
          [`${origin}${API}leave/workweek`, 'PUT', { monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 0, sunday: 0 }],
          [`${origin}${API}leave/holidays`, 'POST', { name: `QaCsrf${s}`, date: '2026-12-31', length: 0, recurring: false }],
        ] as const;
        const js = calls.map(([url, method, body]) => `
          fetch(${JSON.stringify(url)}, { method: '${method}', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'text/plain' }, body: ${JSON.stringify(JSON.stringify(body))} }).then(() => results.push('no-cors ${method}'), (e) => results.push('no-cors gagal ' + e));
          fetch(${JSON.stringify(url)}, { method: '${method}', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: ${JSON.stringify(JSON.stringify(body))} }).then((r) => results.push('cors ' + r.status), (e) => results.push('cors diblok ' + e.name));`).join('\n');
        await page.context().route(`${ATTACKER}/**`, (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body><script>window.results = [];\n${js}\n</script></body></html>` }));
        const attacker = await page.context().newPage();
        await attacker.goto(`${ATTACKER}/cuti-gratis`);
        await attacker.waitForFunction(() => (window as unknown as { results: string[] }).results?.length >= 6, null, { timeout: 20_000 }).catch(() => {});
        const results = await attacker.evaluate(() => (window as unknown as { results: string[] }).results).catch(() => [] as string[]);
        await attacker.close();
        report.check('5.4 Request dari situs penyerang terkirim TANPA cookie sesi', sent.length > 0 && withCookie.length === 0, `terkirim=${sent.join(', ') || '(tidak terlihat)'}; dgn cookie=${withCookie.join(', ') || 'tidak ada'}; fetch=${results.join(' | ')}`);
        report.check('5.4 [U050] Leave Period TIDAK berubah oleh situs penyerang', JSON.stringify(await currentLeavePeriod(page.request)) === JSON.stringify(periodSnap));
        report.check('5.4 [U052] Work Week TIDAK berubah oleh situs penyerang', JSON.stringify(await currentWorkWeek(page.request)) === JSON.stringify(weekSnap));
        const holNow = await getJson<Array<{ name: string }>>(page.request, 'leave/holidays?fromDate=2026-12-01&toDate=2026-12-31');
        report.check('5.4 [U053] Holiday TIDAK bertambah oleh situs penyerang', !holNow.some((h) => h.name === `QaCsrf${s}`), `jumlah=${holNow.length}`);
        report.check('5.4 Sesi Admin tetap aktif setelah halaman penyerang dibuka', (await page.request.get(`${API}leave/leave-types?limit=1`)).status() === 200);
      },
    );

    report.step('4.4 Request paralel');
    const pc = await Promise.all([1, 2, 3].map((i) => page.request.post(`${API}leave/holidays`, { data: { name: `QaParHol${s}-${i}`, date: `2026-11-1${i}`, length: 0, recurring: false } })));
    for (const r of pc) { const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id; if (id) holidayIds.push(id); }
    report.check('4.4 [U053] 3 POST holiday paralel -> semua 200 & 3 baris tersimpan', pc.every((r) => r.status() === 200) && holidayIds.length === 3, `status=${pc.map((r) => r.status()).join(',')}`);
    const extraHol = await page.request.post(`${API}leave/holidays`, { data: { name: `QaDelHol${s}`, date: '2026-11-17', length: 0, recurring: false } });
    const extraId = ((await extraHol.json()) as { data: { id: number } }).data.id;
    const [d1, d2] = await Promise.all([page.request.delete(`${API}leave/holidays`, { data: { ids: [extraId] } }), page.request.delete(`${API}leave/holidays`, { data: { ids: [extraId] } })]);
    report.check('4.4 [U053] 2 DELETE holiday paralel atas record yg sama -> tepat satu 200, lainnya 404', [d1.status(), d2.status()].sort().join(',') === '200,404', `${d1.status()},${d2.status()}`);

    report.step('5.5 Burst Assign Leave (ditarget ke karyawan UJI sendiri, bukan sesi Admin -- Apply Leave/leave-requests selalu self-service atas nama Admin yg dipakai bersama seluruh suite, jadi tidak dipakai di sini)');
    const burst = await Promise.all(Array.from({ length: 6 }, (_, i) => page.request.post(`${API}leave/employees/leave-requests`, { data: { empNumber: emp, leaveTypeId: typeId, fromDate: '2026-12-0' + (i + 1), toDate: '2026-12-0' + (i + 1), comment: `QaBurst${s}-${i}`, duration: { type: 'full_day' } } })));
    for (const r of burst) { const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id; if (id) burstLeaveIds.push(id); }
    const okCount = burst.filter((r) => r.status() === 200).length;
    const limited = burst.filter((r) => r.status() === 429).length;
    report.check('5.5 [U054] 6 POST Assign Leave paralel -> tanpa 5xx', burst.every((r) => r.status() < 500), burst.map((r) => r.status()).join(','));
    report.finding('5.5 [U054] Rate limit Assign Leave', `${okCount}/6 tersimpan, 429=${limited} (${limited ? 'ada rate limit' : 'tanpa rate limit, sama spt BG-067 Recruitment'})`);
  } finally {
    for (const id of burstLeaveIds) await page.request.put(`${API}leave/leave-requests/${id}/status`, { data: { status: 'CANCELLED' } }).catch(() => null);
    await deleteHolidays(page.request, holidayIds);
    await cleanupLeave(page.request, [emp]);
  }
  report.print();
});
