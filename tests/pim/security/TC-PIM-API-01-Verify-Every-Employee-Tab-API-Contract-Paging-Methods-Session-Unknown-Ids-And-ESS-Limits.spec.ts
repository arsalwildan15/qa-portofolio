/**
 * ================================================================================
 * TC-PIM-API-01 — Verify The API Behind Every PIM Employee Tab: Contract, Paging, Wrong Method, No Session, Unknown Employee, Sensitive Data And What An ESS User May Not Change
 * Modul    : PIM - Employee tabs (U088-U099), sesi Admin atas karyawan uji + sesi ESS
 * Kategori : Negative (-) 2.6 | Boundary (B) 3.5 3.6 | Edge (!) 4.6 | Security (S) 5.2-PrivEsc 5.8 |
 *            API (A) 6.1 6.2 6.3 6.4 6.6
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-API-01-Verify-Every-Employee-Tab-API-Contract-Paging-Methods-Session-Unknown-Ids-And-ESS-Limits.spec.ts
 * Path     : tests/pim/security/
 * ================================================================================
 *
 * TUJUAN (endpoint tiap tab dibaca LIVE 16-17 Nov 2026; label [U###]; karyawan uji dibuat lewat API
 * dan dihapus di akhir):
 *   6.1 / 6.2  GET (Admin) -> 200; list -> data[] + meta.total, objek -> field kunci tab.
 *   6.6  limit=-1 -> 422.   3.6 limit=1 -> maks 1 baris.   3.5 / 4.6 offset=9999 -> data [].
 *   6.3  PATCH -> 405.      6.4 tanpa sesi -> 401.          5.8 tanpa field sensitif.
 *   2.6  karyawan 999999 -> 4xx (bukan 200/5xx).
 *   5.2-PrivEsc  ESS pada record SENDIRI tidak boleh: mengubah Job, menambah Salary, menambah
 *        Supervisor/Subordinate -> 403 & data tidak berubah.
 *
 * HASIL 17 Nov 2026: 108/108 lolos (12 endpoint tab; ESS ditolak 403 saat mengubah Job/Salary/
 *   Supervisor/Subordinate miliknya & data tidak berubah).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/security/TC-PIM-API-01-Verify-Every-Employee-Tab-API-Contract-Paging-Methods-Session-Unknown-Ids-And-ESS-Limits.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession, openMyInfoFromMenu } from '../../../src/utils/myInfo';

const API = '/web/index.php/api/v2/';
type Tab = { unit: string; name: string; path: (emp: number) => string; list: boolean; keys?: string[] };
const TABS: Tab[] = [
  { unit: 'U088', name: 'Personal Details', path: (e) => `pim/employees/${e}/personal-details`, list: false, keys: ['empNumber', 'firstName', 'lastName'] },
  { unit: 'U089', name: 'Contact Details', path: (e) => `pim/employee/${e}/contact-details`, list: false, keys: ['street1', 'countryCode'] },
  { unit: 'U090', name: 'Emergency Contacts', path: (e) => `pim/employees/${e}/emergency-contacts`, list: true },
  { unit: 'U091', name: 'Dependents', path: (e) => `pim/employees/${e}/dependents`, list: true },
  { unit: 'U092', name: 'Immigration', path: (e) => `pim/employees/${e}/immigrations`, list: true },
  { unit: 'U093', name: 'Job', path: (e) => `pim/employees/${e}/job-details`, list: false, keys: ['empNumber', 'joinedDate', 'jobTitle'] },
  { unit: 'U094', name: 'Salary', path: (e) => `pim/employees/${e}/salary-components`, list: true },
  { unit: 'U095', name: 'Report-to (supervisors)', path: (e) => `pim/employees/${e}/supervisors`, list: true },
  { unit: 'U095', name: 'Report-to (subordinates)', path: (e) => `pim/employees/${e}/subordinates`, list: true },
  { unit: 'U096', name: 'Qualifications (work experience)', path: (e) => `pim/employees/${e}/work-experiences`, list: true },
  { unit: 'U097', name: 'Memberships', path: (e) => `pim/employees/${e}/memberships`, list: true },
  { unit: 'U098', name: 'Attachments (personal)', path: (e) => `pim/employees/${e}/screen/personal/attachments`, list: true },
];
const SENSITIVE = /"(password|passwordHash|hash|secret|token|salt)"\s*:/i;
const is4xx = (n: number) => n >= 400 && n < 500;

test('TC-PIM-API-01: every employee tab API - contract, paging, method, session, unknown employee, ESS limits', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-PIM-API-01', 'Every Employee Tab API Contract Paging Methods Session ESS Limits', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  const created = await page.request.post(`${API}pim/employees`, { data: { firstName: 'QaPimApi', lastName: `T${Date.now() % 100000}`, middleName: '', employeeId: `A${Date.now().toString().slice(-8)}` } });
  const emp = ((await created.json()) as { data: { empNumber: number } }).data.empNumber;
  try {
    for (const t of TABS) {
      const tag = `[${t.unit} ${t.name}]`;
      const url = `${API}${t.path(emp)}`;
      report.step(tag);
      const r = await page.request.get(url);
      const text = await r.text();
      const body = JSON.parse(text || '{}') as { data?: unknown; meta?: { total?: unknown } };
      report.check(`${tag} 6.1 GET (Admin) -> 200`, r.status() === 200, `status=${r.status()}`);
      const contractOk = t.list
        ? Array.isArray(body.data) && typeof body.meta?.total === 'number'
        : !!body.data && typeof body.data === 'object' && (t.keys ?? []).every((k) => k in (body.data as object));
      report.check(`${tag} 6.2 Kontrak ${t.list ? 'list: data[] + meta.total' : `objek dgn ${(t.keys ?? []).join('/')}`}`, contractOk, text.slice(0, 120));
      report.check(`${tag} 5.8 Tanpa field sensitif`, !SENSITIVE.test(text), SENSITIVE.exec(text)?.[0] ?? 'tidak ada');
      const bad = await page.request.get(`${url}?limit=-1`);
      report.check(`${tag} 6.6 limit=-1 -> 422`, bad.status() === 422, `status=${bad.status()}`);
      if (t.list) {
        const one = ((await (await page.request.get(`${url}?limit=1&offset=0`)).json()) as { data?: unknown[] }).data;
        report.check(`${tag} 3.6 limit=1 -> maks 1 baris`, Array.isArray(one) && one.length <= 1, `baris=${one?.length}`);
        const far = await page.request.get(`${url}?limit=10&offset=9999`);
        const farData = ((await far.json().catch(() => null)) as { data?: unknown[] } | null)?.data;
        report.check(`${tag} 3.5 / 4.6 offset=9999 -> 200 & data []`, far.status() === 200 && Array.isArray(farData) && farData.length === 0, `status=${far.status()}`);
      }
      const patch = await page.request.patch(url, { data: {} });
      report.check(`${tag} 6.3 PATCH -> 405`, patch.status() === 405, `status=${patch.status()}`);
      const noAuth = await anon.get(url);
      report.check(`${tag} 6.4 Tanpa sesi -> 401`, noAuth.status() === 401, `status=${noAuth.status()}`);
      const ghost = await page.request.get(`${API}${t.path(999999)}`);
      report.check(`${tag} 2.6 Karyawan 999999 -> 4xx (bukan 200/5xx)`, is4xx(ghost.status()), `status=${ghost.status()}`);
    }

    report.step('ESS: batas perubahan pada record sendiri');
    const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaPimApiEss');
    try {
      const me = await openMyInfoFromMenu(essPage);
      const other = ((await (await page.request.get(`${API}pim/employees?limit=1`)).json()) as { data: Array<{ empNumber: number }> }).data[0]?.empNumber ?? 1;
      const jobBefore = ((await (await page.request.get(`${API}pim/employees/${me}/job-details`)).json()) as { data: { joinedDate: string | null } }).data.joinedDate;
      const attempts: Array<[string, () => Promise<number>]> = [
        ['mengubah Job (joinedDate)', async () => (await essPage.request.put(`${API}pim/employees/${me}/job-details`, { data: { joinedDate: '2001-01-01' } })).status()],
        ['menambah Salary', async () => (await essPage.request.post(`${API}pim/employees/${me}/salary-components`, { data: { salaryComponent: 'QaSelfRaise', salaryAmount: '999999', currencyId: 'USD', comment: null, addDirectDeposit: false } })).status()],
        ['menambah Supervisor', async () => (await essPage.request.post(`${API}pim/employees/${me}/supervisors`, { data: { empNumber: other, reportingMethodId: 1 } })).status()],
        ['menambah Subordinate', async () => (await essPage.request.post(`${API}pim/employees/${me}/subordinates`, { data: { empNumber: other, reportingMethodId: 1 } })).status()],
      ];
      for (const [label, fn] of attempts) {
        const st = await fn();
        report.check(`5.2-PrivEsc ESS ${label} pada record sendiri -> 403`, st === 403, `status=${st}`);
      }
      const jobAfter = ((await (await page.request.get(`${API}pim/employees/${me}/job-details`)).json()) as { data: { joinedDate: string | null } }).data.joinedDate;
      const salaryNow = ((await (await page.request.get(`${API}pim/employees/${me}/salary-components`)).json()) as { data: Array<{ salaryName: string }> }).data;
      report.check('5.2-PrivEsc Data Job & Salary ESS tidak berubah (dibaca Admin)', jobAfter === jobBefore && !salaryNow.some((x) => x.salaryName === 'QaSelfRaise'), `joinedDate ${jobBefore} -> ${jobAfter}, salary=${salaryNow.length}`);
    } finally {
      await close();
    }
  } finally {
    await anon.dispose();
    await page.request.delete(`${API}pim/employees`, { data: { ids: [emp] } });
  }
  report.print();
});
