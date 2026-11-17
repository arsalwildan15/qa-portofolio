/**
 * ================================================================================
 * TC-TIME-API-01 — Verify The Attendance, Project Info And Timesheet APIs: Contract, Paging, Wrong Method, No Session, Unknown Records, Sensitive Data And What An ESS User May Not Do
 * Modul    : Time (U004 Employee Timesheets, U055 My Timesheets, U056 Attendance My Records,
 *            U057 Punch In/Out, U058 Attendance Employee Records, U059 Attendance Configuration,
 *            U060/U061/U062 Reports, U063 Customers, U064 Projects, U106 Timesheet Edit & Approval)
 * Kategori : Negative (-) 2.6 | Boundary (B) 3.5 3.6 | Edge (!) 4.6 | Security (S) 5.2-BFLAC 5.8 |
 *            API (A) 6.1 6.2 6.3 6.4 6.5 6.6
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-API-01-Verify-Attendance-Project-And-Timesheet-APIs-Contract-Methods-Session-Unknown-Ids-And-ESS-Access.spec.ts
 * Path     : tests/time/security/
 * ================================================================================
 *
 * TUJUAN (endpoint direkam LIVE dari UI 17 Nov 2026; karyawan uji dibuat lewat API & dihapus):
 *   6.1 / 6.2  GET tiap endpoint (Admin) -> 200; list -> data[] + meta; objek -> field kunci.
 *   5.8   tanpa field sensitif.  6.6 limit=-1 -> 422 (yg berpaging).  3.6 limit=1 -> maks 1 baris.
 *   3.5 / 4.6  offset=9999 -> data [].  6.3 PATCH -> 405.  6.4 tanpa sesi -> 401.
 *   2.6   id/empNumber 999999 pada GET/PUT -> 4xx (bukan 2xx/5xx).
 *   5.2-BFLAC  sesi ESS: Attendance Configuration, Customers, Projects, daftar timesheet
 *        semua karyawan, approve/reject timesheet orang lain -> 403; ESS tetap boleh baca/tulis
 *        attendance & timesheet MILIK SENDIRI.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-457 (Low) -- [U064] POST time/project/999999/activities (menambah
 *   activity ke project yg tidak ada) -> 500 "Unexpected Error Occurred", bukan 404 (endpoint lain
 *   konsisten menjawab 404/422 utk id yg tidak ada).
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/security/TC-TIME-API-01-Verify-Attendance-Project-And-Timesheet-APIs-Contract-Methods-Session-Unknown-Ids-And-ESS-Access.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession } from '../../../src/utils/myInfo';
import { API, createCustomer, createProject, deleteCustomers, deleteProjects, getJson } from '../../../src/utils/timeData';

const SENSITIVE = /"(password|passwordHash|hash|secret|token|salt)"\s*:/i;
const is4xx = (n: number) => n >= 400 && n < 500;

test('TC-TIME-API-01: attendance, project info & timesheet APIs - contract, paging, method, session, unknown ids, ESS', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-TIME-API-01', 'Attendance Project Timesheet APIs Contract Paging Methods Session ESS', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  const custId = await createCustomer(page.request, `QaTimeApi${Date.now() % 100000}`);
  const projId = await createProject(page.request, custId, `QaTimeApiProj${Date.now() % 100000}`);
  type Ep = { unit: string; path: string; list: boolean; keys?: string[] };
  const EPS: Ep[] = [
    { unit: 'U059', path: 'attendance/configs', list: false, keys: ['canUserChangeCurrentTime', 'canUserModifyAttendance'] },
    { unit: 'U056', path: 'attendance/records?limit=5', list: true },
    { unit: 'U063', path: 'time/customers', list: true },
    { unit: 'U064', path: 'time/projects', list: true },
    { unit: 'U055', path: 'time/employees/7/timesheets?limit=5', list: true },
  ];
  try {
    for (const e of EPS) {
      const tag = `[${e.unit} ${e.path.split('?')[0]}]`;
      const base = `${API}${e.path}`;
      const sep = e.path.includes('?') ? '&' : '?';
      report.step(tag);
      const r = await page.request.get(base);
      const text = await r.text();
      const body = JSON.parse(text || '{}') as { data?: unknown };
      report.check(`${tag} 6.1 GET (Admin) -> 200`, r.status() === 200, `status=${r.status()}`);
      const ok = e.list ? Array.isArray(body.data) : !!body.data && (e.keys ?? []).every((k) => k in (body.data as object));
      report.check(`${tag} 6.2 Kontrak ${e.list ? 'data[]' : (e.keys ?? []).join('/')}`, ok, text.slice(0, 120));
      report.check(`${tag} 5.8 Tanpa field sensitif`, !SENSITIVE.test(text), SENSITIVE.exec(text)?.[0] ?? 'tidak ada');
      if (e.list) {
        const bad = await page.request.get(`${base}${sep}limit=-1`);
        report.check(`${tag} 6.6 limit=-1 -> 422`, bad.status() === 422, `status=${bad.status()}`);
        const one = ((await (await page.request.get(`${base}${sep}limit=1&offset=0`)).json()) as { data?: unknown[] }).data;
        report.check(`${tag} 3.6 limit=1 -> maks 1 baris`, Array.isArray(one) && one.length <= 1, `baris=${one?.length}`);
        const far = await page.request.get(`${base}${sep}limit=10&offset=9999`);
        const farData = ((await far.json().catch(() => null)) as { data?: unknown[] } | null)?.data;
        report.check(`${tag} 3.5 / 4.6 offset=9999 -> 200 & data []`, far.status() === 200 && Array.isArray(farData) && farData.length === 0, `status=${far.status()}`);
      }
      const patch = await page.request.patch(base, { data: {} });
      report.check(`${tag} 6.3 PATCH -> 405`, patch.status() === 405, `status=${patch.status()}`);
      const noAuth = await anon.get(base);
      report.check(`${tag} 6.4 Tanpa sesi -> 401`, noAuth.status() === 401, `status=${noAuth.status()}`);
    }

    report.step('Record yang tidak ada (id 999999)');
    const ghosts: Array<[string, () => Promise<number>]> = [
      ['[U063] PUT customer 999999', async () => (await page.request.put(`${API}time/customers/999999`, { data: { name: 'x', description: '' } })).status()],
      ['[U064] PUT project 999999', async () => (await page.request.put(`${API}time/projects/999999`, { data: { customerId: custId, name: 'x', description: null } })).status()],
      ['[U064] POST activity utk project 999999', async () => (await page.request.post(`${API}time/project/999999/activities`, { data: { name: 'x' } })).status()],
      ['[U106] PUT timesheet action empNumber 999999', async () => (await page.request.put(`${API}time/employees/999999/timesheets/999999`, { data: { action: 'APPROVE' } })).status()],
    ];
    for (const [label, fn] of ghosts) {
      const st = await fn();
      report.check(`2.6 ${label} -> 4xx (bukan 2xx/5xx)`, is4xx(st), `status=${st}`);
    }

    report.step('ESS: batas akses endpoint administratif');
    const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaTimeApiEss');
    try {
      const essCalls: Array<[string, () => Promise<number>]> = [
        ['[U059] PUT attendance/configs', async () => (await essPage.request.put(`${API}attendance/configs`, { data: { canUserChangeCurrentTime: true, canUserModifyAttendance: true, canSupervisorModifyAttendance: true } })).status()],
        ['[U063] POST customer', async () => (await essPage.request.post(`${API}time/customers`, { data: { name: 'EssHack', description: '' } })).status()],
        ['[U064] POST project', async () => (await essPage.request.post(`${API}time/projects`, { data: { customerId: custId, name: 'EssHack', description: null } })).status()],
        ['[U055] GET timesheet karyawan lain', async () => (await essPage.request.get(`${API}time/employees/7/timesheets?limit=5`)).status()],
        ['[U106] PUT approve timesheet (karyawan lain)', async () => (await essPage.request.put(`${API}time/employees/7/timesheets/999999`, { data: { action: 'APPROVE' } })).status()],
      ];
      for (const [label, fn] of essCalls) {
        const st = await fn();
        report.check(`5.2-BFLAC ESS ${label} -> 403`, st === 403, `status=${st}`);
      }
      const myAtt = await essPage.request.get(`${API}attendance/records?limit=5`);
      report.check('5.2-BFLAC [U056] ESS boleh membaca attendance MILIK SENDIRI -> 200', myAtt.status() === 200, `status=${myAtt.status()}`);
      // Self-service "My Timesheet" is a DIFFERENT endpoint from the admin-facing
      // time/employees/<empNumber>/timesheets used above (confirmed live via network trace) --
      // ESS correctly gets 403 on the admin path; this is the real self-service one.
      const myTs = await essPage.request.get(`${API}time/timesheets/default?date=2026-11-17`);
      report.check('5.2-BFLAC [U055] ESS boleh membaca timesheet MILIK SENDIRI (endpoint self-service) -> 200', myTs.status() === 200, `status=${myTs.status()}`);
    } finally {
      await close();
    }
    const custList = await getJson<Array<{ id: number; name: string }>>(page.request, `time/customers?limit=50`);
    const custNow = custList.find((c) => c.id === custId);
    report.check('5.2-BFLAC Customer tidak berubah oleh ESS', custNow?.name !== 'EssHack', `nama=${custNow?.name}`);
  } finally {
    await anon.dispose();
    await deleteProjects(page.request, [projId]);
    await deleteCustomers(page.request, [custId]);
  }
  report.print();
});
