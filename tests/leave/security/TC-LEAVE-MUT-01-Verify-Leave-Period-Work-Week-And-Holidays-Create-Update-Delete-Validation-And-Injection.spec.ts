/**
 * ================================================================================
 * TC-LEAVE-MUT-01 — Verify Leave Period, Work Week And Holidays: Update Validation, Create/Update/Delete, Unicode, Injection, Mass Assignment And Repeats
 * Modul    : Leave (U050 Leave Period, U052 Work Week, U053 Holidays)
 * Kategori : Positive (+) 1.1-C 1.1-R 1.1-U 1.1-D | Negative (-) 2.1 2.2 | Boundary (B) 3.1 3.4 |
 *            Edge (!) 4.1 | Security (S) 5.1-SQLi 5.1-XSS-Stored 5.2-MassAssign | API (A) 6.5 6.7
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-MUT-01-Verify-Leave-Period-Work-Week-And-Holidays-Create-Update-Delete-Validation-And-Injection.spec.ts
 * Path     : tests/leave/security/
 * ================================================================================
 *
 * KESELAMATAN DATA: Leave Period & Work Week adalah config GLOBAL bersama (R6, disetujui
 * user 2026-11-15) -- dibungkus withConfigRestore(), nilai asli dibaca dulu & dikembalikan
 * di `finally` apa pun hasilnya. Holiday dibuat & dihapus sendiri.
 *
 * TUJUAN (aturan server dibaca LIVE 17 Nov 2026):
 *   [U050] 1.1-R / 1.1-U  PUT leave-period (nilai sama) -> 200 & tersimpan.
 *          2.1 / 6.5  startMonth 13 / startDay 32 -> 422 (invalidParamKeys spesifik).
 *          5.2-MassAssign  field asing (createdAt) -> 422, ditolak server (bukan diam-diam diterima).
 *   [U052] 1.1-U  PUT workweek (nilai sama) -> 200.   2.1 / 6.5  nilai 99 -> 422.
 *   [U053] 1.1-C  POST holiday valid -> 200 + id.   1.1-R  tampil di GET list.
 *          1.1-U  PUT ubah nama -> 200 & tersimpan.   1.1-D  DELETE -> 200 & hilang.
 *          2.2 / 6.5  tanpa nama / tanggal tidak valid -> 422.   3.1 nama 200 OK / 201 422.
 *          3.4   nama+tanggal duplikat -> dicatat (diterima, bukan unique constraint).
 *          4.1 / 5.1-SQLi / 5.1-XSS-Stored  nama Arab/CJK, kutip SQL, HTML -> tersimpan
 *                sbg teks apa adanya (render aman dibuktikan di TC UI terpisah).
 *          6.7   DELETE yg sama 2x -> 200 lalu 404.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3) -- nama + tanggal holiday duplikat DITERIMA (200)
 *   dua kali tanpa constraint unik (BUG baru).
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/security/TC-LEAVE-MUT-01-Verify-Leave-Period-Work-Week-And-Holidays-Create-Update-Delete-Validation-And-Injection.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { withConfigRestore } from '../../../src/utils/withConfigRestore';
import { API, createHoliday, currentLeavePeriod, currentWorkWeek, deleteHolidays, getJson } from '../../../src/utils/leaveData';

const keysOf = async (r: { json(): Promise<unknown> }) => (((await r.json().catch(() => null)) as { error?: { data?: { invalidParamKeys?: string[] } } } | null)?.error?.data?.invalidParamKeys ?? []).join(',');

test('TC-LEAVE-MUT-01: Leave Period, Work Week and Holidays - update validation, CRUD, injection, mass assignment', async ({ page }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-LEAVE-MUT-01', 'Leave Period Work Week Holidays CRUD Validation Injection', env.baseURL);
  const holidayIds: number[] = [];
  try {
    await withConfigRestore(
      () => currentLeavePeriod(page.request),
      async (snap) => { await page.request.put(`${API}leave/leave-period`, { data: snap }); },
      async () => {
        report.step('[U050] Leave Period');
        const snap = await currentLeavePeriod(page.request);
        const same = await page.request.put(`${API}leave/leave-period`, { data: snap });
        report.check('1.1-R / 1.1-U [U050] PUT leave-period (nilai sama) -> 200 & tersimpan', same.status() === 200 && (await currentLeavePeriod(page.request)).startMonth === snap.startMonth, `status=${same.status()}`);
        const m13 = await page.request.put(`${API}leave/leave-period`, { data: { startMonth: 13, startDay: 1 } });
        report.check('2.1 / 6.5 [U050] startMonth 13 -> 422 "startMonth"', m13.status() === 422 && (await keysOf(m13)).includes('startMonth'), `status=${m13.status()} keys=${await keysOf(m13)}`);
        const d32 = await page.request.put(`${API}leave/leave-period`, { data: { startMonth: 1, startDay: 32 } });
        report.check('2.1 / 6.5 [U050] startDay 32 -> 422 "startDay"', d32.status() === 422 && (await keysOf(d32)).includes('startDay'), `status=${d32.status()} keys=${await keysOf(d32)}`);
        const mass = await page.request.put(`${API}leave/leave-period`, { data: { ...snap, createdAt: '2000-01-01' } });
        report.check('5.2-MassAssign [U050] field asing "createdAt" -> 422 (ditolak, bukan diam-diam diterima)', mass.status() === 422 && (await keysOf(mass)).includes('createdAt'), `status=${mass.status()} keys=${await keysOf(mass)}`);
      },
    );

    await withConfigRestore(
      () => currentWorkWeek(page.request),
      async (snap) => { await page.request.put(`${API}leave/workweek`, { data: snap }); },
      async () => {
        report.step('[U052] Work Week');
        const snap = await currentWorkWeek(page.request);
        const same = await page.request.put(`${API}leave/workweek`, { data: snap });
        report.check('1.1-U [U052] PUT workweek (nilai sama) -> 200', same.status() === 200, `status=${same.status()}`);
        const bad = await page.request.put(`${API}leave/workweek`, { data: { ...snap, monday: 99 } });
        report.check('2.1 / 6.5 [U052] monday=99 -> 422 "monday"', bad.status() === 422 && (await keysOf(bad)).includes('monday'), `status=${bad.status()} keys=${await keysOf(bad)}`);
      },
    );

    report.step('[U053] Holidays: create, read, update, validation');
    const s = `${Date.now() % 100000}`;
    const create = await createHoliday(page.request, `QaHoliday${s}`, '2026-12-24').catch(() => null);
    let id1: number | undefined;
    if (create) { id1 = create; holidayIds.push(create); }
    report.check('1.1-C [U053] POST holiday valid -> 200 + id', typeof id1 === 'number', `id=${id1}`);
    const list1 = await getJson<Array<{ id: number; name: string }>>(page.request, 'leave/holidays?fromDate=2026-12-01&toDate=2026-12-31');
    report.check('1.1-R [U053] Holiday baru tampil di GET list', list1.some((h) => h.id === id1), `jumlah=${list1.length}`);
    const upd = await page.request.put(`${API}leave/holidays/${id1}`, { data: { name: `QaHolidayUpdated${s}`, date: '2026-12-24', length: 0, recurring: false } });
    const got = await page.request.get(`${API}leave/holidays?fromDate=2026-12-01&toDate=2026-12-31`);
    const updName = ((await got.json()) as { data: Array<{ id: number; name: string }> }).data.find((h) => h.id === id1)?.name;
    report.check('1.1-U [U053] PUT ubah nama -> 200 & tersimpan', upd.status() === 200 && updName === `QaHolidayUpdated${s}`, `status=${upd.status()} nama=${updName}`);

    const neg: Array<[string, Record<string, unknown>, string]> = [
      ['2.2 / 6.5 tanpa nama', { date: '2026-12-23', length: 0, recurring: false }, 'name'],
      ['2.2 / 6.5 tanggal tidak valid', { name: `QaBad${s}`, date: 'bukan-tanggal', length: 0, recurring: false }, 'date'],
    ];
    for (const [label, body, key] of neg) {
      const r = await page.request.post(`${API}leave/holidays`, { data: body });
      report.check(`${label} [U053] -> 422 dgn "${key}"`, r.status() === 422 && (await keysOf(r)).includes(key), `status=${r.status()} keys=${await keysOf(r)}`);
    }
    const n200 = await page.request.post(`${API}leave/holidays`, { data: { name: 'H'.repeat(200), date: '2026-12-20', length: 0, recurring: false } });
    if (n200.status() === 200) holidayIds.push(((await n200.json()) as { data: { id: number } }).data.id);
    report.check('3.1 [U053] Nama 200 karakter (batas) -> 200', n200.status() === 200, `status=${n200.status()}`);
    const n201 = await page.request.post(`${API}leave/holidays`, { data: { name: 'H'.repeat(201), date: '2026-12-19', length: 0, recurring: false } });
    report.check('3.1 / 6.5 [U053] Nama 201 karakter -> 422 "name"', n201.status() === 422 && (await keysOf(n201)).includes('name'), `status=${n201.status()}`);

    report.step('[U053] Duplikat, unicode, injeksi, idempotensi');
    const dupName = `QaHolidayDup${s}`;
    const dup1 = await createHoliday(page.request, dupName, '2026-12-22');
    holidayIds.push(dup1);
    const dup2r = await page.request.post(`${API}leave/holidays`, { data: { name: dupName, date: '2026-12-22', length: 0, recurring: false } });
    if (dup2r.status() === 200) holidayIds.push(((await dup2r.json()) as { data: { id: number } }).data.id);
    report.finding('3.4 [U053] Nama + tanggal holiday duplikat', `POST ke-2 dgn nama & tanggal identik -> status=${dup2r.status()} (diterima tanpa constraint unik = BUG, dua baris holiday identik tercipta)`);
    for (const [label, name] of [['4.1 Arab/CJK', `مرحبا 你好 ${s}`], ['5.1-SQLi', `QaSQLi ' OR '1'='1 ${s}`], ['5.1-XSS-Stored', `<img src=x onerror=alert(1)> ${s}`]] as const) {
      const r = await page.request.post(`${API}leave/holidays`, { data: { name, date: '2026-11-19', length: 0, recurring: false } });
      const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;
      if (id) holidayIds.push(id);
      const now = (await getJson<Array<{ id: number; name: string }>>(page.request, 'leave/holidays?fromDate=2026-11-01&toDate=2026-11-30')).find((h) => h.id === id);
      report.check(`${label} [U053] -> 200 & tersimpan identik sebagai teks`, r.status() === 200 && now?.name === name, `status=${r.status()}`);
    }
    const extra = await createHoliday(page.request, `QaHolidayDel${s}`, '2026-11-18');
    const d1 = await page.request.delete(`${API}leave/holidays`, { data: { ids: [extra] } });
    const d2 = await page.request.delete(`${API}leave/holidays`, { data: { ids: [extra] } });
    report.check('6.7 [U053] DELETE holiday 2x -> 200 lalu 404', d1.status() === 200 && d2.status() === 404, `${d1.status()} -> ${d2.status()}`);
  } finally {
    await deleteHolidays(page.request, holidayIds);
  }
  report.print();
});
