/**
 * ================================================================================
 * TC-LEAVE-API-01 — Verify The Leave Settings And Leave Request APIs: Contract, Paging, Wrong Method, No Session, Unknown Records, Sensitive Data And What An ESS User May Not Do
 * Modul    : Leave (U003 Leave List, U043 Apply, U044 My Leave, U045/U046 Entitlements,
 *            U048/U049 Reports, U050 Leave Period, U051 Leave Types, U052 Work Week,
 *            U053 Holidays, U054 Assign Leave)
 * Kategori : Negative (-) 2.6 | Boundary (B) 3.5 3.6 | Edge (!) 4.6 | Security (S) 5.2-BFLAC 5.8 |
 *            API (A) 6.1 6.2 6.3 6.4 6.5 6.6
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-API-01-Verify-Leave-Settings-And-Request-APIs-Contract-Methods-Session-Unknown-Ids-And-ESS-Access.spec.ts
 * Path     : tests/leave/security/
 * ================================================================================
 *
 * TUJUAN (endpoint direkam LIVE dari UI 17 Nov 2026; karyawan uji dibuat lewat API & dihapus):
 *   6.1 / 6.2  GET tiap endpoint (Admin) -> 200; list -> data[] + meta; objek -> field kunci.
 *   5.8   tanpa field sensitif.  6.6 limit=-1 -> 422 (yg berpaging).  3.6 limit=1 -> maks 1 baris.
 *   3.5 / 4.6  offset=9999 -> data [].  6.3 PATCH -> 405.  6.4 tanpa sesi -> 401.
 *   2.6   id/empNumber 999999 pada GET/PUT -> 4xx (bukan 2xx/5xx).
 *   5.2-BFLAC  sesi ESS: baca/ubah semua endpoint administratif (Leave Period, Work Week,
 *        Holidays, Entitlements orang lain, daftar Assign/Approval semua karyawan,
 *        Report admin) -> 403 (GET entitlements karyawan lain -> 422, dicek terpisah);
 *        ESS tetap boleh membaca entitlement/report MILIK SENDIRI.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-453 (Medium) -- [U046] GET leave/leave-entitlements dgn parameter
 *   offset BERAPA PUN (bahkan offset=5, bukan hanya offset besar) -> 500 "Unexpected Error
 *   Occurred" (endpoint lain yg berpaging -- holidays, employees/leave-requests, leave-types --
 *   menjawab 200 normal utk offset yg sama; GAP ini spesifik ke satu endpoint).
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/security/TC-LEAVE-API-01-Verify-Leave-Settings-And-Request-APIs-Contract-Methods-Session-Unknown-Ids-And-ESS-Access.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';
import { newEssSession } from '../../../src/utils/myInfo';
import { API, cleanupLeave, currentPeriodRange, firstLeaveTypeId, getJson, grantEntitlement } from '../../../src/utils/leaveData';

const SENSITIVE = /"(password|passwordHash|hash|secret|token|salt)"\s*:/i;
const is4xx = (n: number) => n >= 400 && n < 500;

test('TC-LEAVE-API-01: leave settings & request APIs - contract, paging, method, session, unknown ids, ESS', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-LEAVE-API-01', 'Leave Settings And Request APIs Contract Paging Methods Session ESS', env.baseURL);
  const emp = await createEmployee(page.request, 'QaLeaveApi', `L${Date.now() % 100000}`);
  const typeId = await firstLeaveTypeId(page.request);
  await grantEntitlement(page.request, emp, typeId, '10');
  // GET leave-entitlements is scoped to the server's CURRENT global Leave Period (see
  // currentPeriodRange's doc) -- every GET on that endpoint below uses this, not a literal
  // date string, so the check still finds the row even if the shared period has drifted.
  const { fromDate: pFrom, toDate: pTo } = await currentPeriodRange(page.request);
  const anon = await request.newContext({ baseURL: env.baseURL });
  type Ep = { unit: string; path: string; list: boolean; paged?: boolean; keys?: string[] };
  const EPS: Ep[] = [
    { unit: 'U050', path: 'leave/leave-period', list: false, keys: ['startMonth', 'startDay'] },
    { unit: 'U052', path: 'leave/workweek', list: false, keys: ['monday', 'sunday'] },
    { unit: 'U053', path: `leave/holidays?fromDate=2026-01-01&toDate=2026-12-31`, list: true },
    { unit: 'U051', path: 'leave/leave-types', list: true },
    { unit: 'U046', path: `leave/leave-entitlements?empNumber=${emp}&fromDate=${pFrom}&toDate=${pTo}`, list: true },
    { unit: 'U003', path: 'leave/employees/leave-requests?fromDate=2026-01-01&toDate=2026-12-31', list: true },
  ];
  try {
    for (const e of EPS) {
      const tag = `[${e.unit} ${e.path.split('?')[0]}]`;
      const base = `${API}${e.path}`;
      const sep = e.path.includes('?') ? '&' : '?';
      report.step(tag);
      const r = await page.request.get(base);
      const text = await r.text();
      const body = JSON.parse(text || '{}') as { data?: unknown; meta?: unknown };
      report.check(`${tag} 6.1 GET (Admin) -> 200`, r.status() === 200, `status=${r.status()}`);
      const ok = e.list ? Array.isArray(body.data) : !!body.data && (e.keys ?? []).every((k) => k in (body.data as object));
      report.check(`${tag} 6.2 Kontrak ${e.list ? 'data[]' : (e.keys ?? []).join('/')}`, ok, text.slice(0, 120));
      report.check(`${tag} 5.8 Tanpa field sensitif`, !SENSITIVE.test(text), SENSITIVE.exec(text)?.[0] ?? 'tidak ada');
      if (e.list) {
        const bad = await page.request.get(`${base}${sep}limit=-1`);
        const pagedOk = bad.status() === 422;
        report.check(`${tag} 6.6 limit=-1 -> 422`, pagedOk, `status=${bad.status()}`);
        if (pagedOk) {
          const one = ((await (await page.request.get(`${base}${sep}limit=1&offset=0`)).json()) as { data?: unknown[] }).data;
          report.check(`${tag} 3.6 limit=1 -> maks 1 baris`, Array.isArray(one) && one.length <= 1, `baris=${one?.length}`);
          const small = await page.request.get(`${base}${sep}limit=10&offset=5`);
          report.check(`${tag} 3.5 offset=5 (dalam jangkauan wajar) -> 200`, small.status() === 200, `status=${small.status()}`);
          const far = await page.request.get(`${base}${sep}limit=10&offset=9999`);
          const farData = ((await far.json().catch(() => null)) as { data?: unknown[] } | null)?.data;
          report.check(`${tag} 3.5 / 4.6 offset=9999 -> 200 & data []`, far.status() === 200 && Array.isArray(farData) && farData.length === 0, `status=${far.status()}`);
        } else {
          report.finding(`${tag} 6.5 Daftar tanpa paging`, 'limit/offset ditolak 422 (parameter tak dikenal)');
        }
      }
      const patch = await page.request.patch(base, { data: {} });
      report.check(`${tag} 6.3 PATCH -> 405`, patch.status() === 405, `status=${patch.status()}`);
      const noAuth = await anon.get(base);
      report.check(`${tag} 6.4 Tanpa sesi -> 401`, noAuth.status() === 401, `status=${noAuth.status()}`);
    }

    report.step('Record yang tidak ada (id/empNumber 999999)');
    const ghosts: Array<[string, () => Promise<number>]> = [
      ['[U053] PUT holiday 999999', async () => (await page.request.put(`${API}leave/holidays/999999`, { data: { name: 'x', date: '2026-01-01', length: 0, recurring: false } })).status()],
      ['[U053] DELETE holiday 999999', async () => (await page.request.delete(`${API}leave/holidays`, { data: { ids: [999999] } })).status()],
      ['[U046] GET entitlements empNumber=999999', async () => (await page.request.get(`${API}leave/leave-entitlements?empNumber=999999&fromDate=2026-01-01&toDate=2026-12-31`)).status()],
      ['[U045] POST entitlement empNumber=999999', async () => (await page.request.post(`${API}leave/leave-entitlements`, { data: { empNumber: 999999, leaveTypeId: typeId, entitlement: '5', fromDate: '2026-01-01', toDate: '2026-12-31' } })).status()],
      ['[U003] GET leave-requests/999999', async () => (await page.request.get(`${API}leave/leave-requests/999999`)).status()],
      ['[U054] PUT employees/leave-requests/999999 (action)', async () => (await page.request.put(`${API}leave/employees/leave-requests/999999`, { data: { action: 'APPROVE' } })).status()],
    ];
    for (const [label, fn] of ghosts) {
      const st = await fn();
      report.check(`2.6 ${label} -> 4xx (bukan 2xx/5xx)`, is4xx(st), `status=${st}`);
    }

    report.step('ESS: batas akses endpoint administratif');
    const { essPage, close, ess } = await newEssSession(page, browser, addEmployeePage, 'QaLeaveApiEss');
    try {
      const essCalls: Array<[string, () => Promise<number>]> = [
        ['[U050] PUT leave-period', async () => (await essPage.request.put(`${API}leave/leave-period`, { data: { startMonth: 1, startDay: 1 } })).status()],
        ['[U052] PUT workweek', async () => (await essPage.request.put(`${API}leave/workweek`, { data: { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 8, sunday: 8 } })).status()],
        ['[U053] POST holiday', async () => (await essPage.request.post(`${API}leave/holidays`, { data: { name: 'EssHack', date: '2026-12-29', length: 0, recurring: false } })).status()],
        ['[U045] POST entitlement (karyawan lain)', async () => (await essPage.request.post(`${API}leave/leave-entitlements`, { data: { empNumber: emp, leaveTypeId: typeId, entitlement: '99', fromDate: '2026-01-01', toDate: '2026-12-31' } })).status()],
        ['[U045] POST entitlement (diri sendiri, PrivEsc)', async () => (await essPage.request.post(`${API}leave/leave-entitlements`, { data: { empNumber: ess.empNumber, leaveTypeId: typeId, entitlement: '99', fromDate: '2026-01-01', toDate: '2026-12-31' } })).status()],
        ['[U003/U054] GET employees/leave-requests (daftar semua karyawan)', async () => (await essPage.request.get(`${API}leave/employees/leave-requests?limit=10&fromDate=2026-01-01&toDate=2026-12-31`)).status()],
        ['[U048] GET report admin (leave_type_leave_entitlements_and_usage)', async () => (await essPage.request.get(`${API}leave/reports/data?limit=10&offset=0&fromDate=2026-01-01&toDate=2026-12-31&name=leave_type_leave_entitlements_and_usage&leaveTypeId=${typeId}&includeEmployees=onlyCurrent&_dateFormattingEnabled=true`)).status()],
      ];
      for (const [label, fn] of essCalls) {
        const st = await fn();
        report.check(`5.2-BFLAC ESS ${label} -> 403`, st === 403, `status=${st}`);
      }
      // [U046] GET entitlements milik KARYAWAN LAIN: server menjawab 422 "empNumber" di sini
      // (bukan 403) -- dicek terpisah dari daftar di atas supaya tidak jadi false-fail.
      const otherEnt = await essPage.request.get(`${API}leave/leave-entitlements?empNumber=${emp}&fromDate=${pFrom}&toDate=${pTo}`);
      report.check('5.2-BFLAC [U046] ESS GET entitlements karyawan lain -> ditolak (422 "empNumber", bukan 200)', otherEnt.status() === 422, `status=${otherEnt.status()}`);
      // [U054] Approve/Reject ESS atas request SENDIRI dgn id SUNGGUHAN sudah dibuktikan
      // 403 di TC-LEAVE-APPROVAL-03 -- tidak diulang di sini dgn id 999999 (itu akan
      // menguji 2.6 "record tak ada", bukan batas privilege, krn server mengecek
      // keberadaan record dulu dan menjawab 404 utk id yg tak ada apa pun rolenya).
      const myRep = await essPage.request.get(`${API}leave/reports/data?limit=10&offset=0&fromDate=2026-01-01&toDate=2026-12-31&name=my_leave_entitlements_and_usage&_dateFormattingEnabled=true`);
      report.check('5.2-BFLAC [U049] ESS boleh membaca report MILIK SENDIRI -> 200', myRep.status() === 200, `status=${myRep.status()}`);
      const myEnt = await essPage.request.get(`${API}leave/leave-entitlements?empNumber=${ess.empNumber}&fromDate=${pFrom}&toDate=${pTo}`);
      report.check('5.2-BFLAC [U047] ESS boleh membaca entitlement MILIK SENDIRI -> 200', myEnt.status() === 200, `status=${myEnt.status()}`);
    } finally {
      await close();
    }
    const entNow = await getJson<Array<{ entitlement: number }>>(page.request, `leave/leave-entitlements?empNumber=${emp}&fromDate=${pFrom}&toDate=${pTo}`);
    report.check('5.2-BFLAC Entitlement karyawan lain tidak berubah oleh ESS', entNow[0]?.entitlement === 10, `entitlement=${entNow[0]?.entitlement}`);
  } finally {
    await anon.dispose();
    await cleanupLeave(page.request, [emp]);
  }
  report.print();
});
