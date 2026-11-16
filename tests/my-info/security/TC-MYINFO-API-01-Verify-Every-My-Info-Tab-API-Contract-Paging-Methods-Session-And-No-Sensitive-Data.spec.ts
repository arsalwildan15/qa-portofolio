/**
 * ================================================================================
 * TC-MYINFO-API-01 — Verify The API Behind Every My Info Tab For The Employee's Own Record: Contract, Paging, Wrong Method, No Session, Sensitive Data
 * Modul    : My Info, semua tab (U006, U108-U117), sesi ESS atas record sendiri
 * Kategori : Boundary (B) 3.5 3.6 | Edge (!) 4.6 | Security (S) 5.8 | API (A) 6.1 6.2 6.3 6.4 6.6
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-API-01-Verify-Every-My-Info-Tab-API-Contract-Paging-Methods-Session-And-No-Sensitive-Data.spec.ts
 * Path     : tests/my-info/security/
 * ================================================================================
 *
 * TUJUAN (endpoint yg dipanggil tiap tab My Info, direkam LIVE 16-17 Nov 2026; label [U###]):
 *   6.1 / 6.2  GET (ESS, record sendiri) -> 200; endpoint list -> data[] + meta.total angka,
 *              endpoint objek -> objek dgn field kunci tab tsb.
 *   6.6        limit=-1 -> 422 (parameter paging divalidasi).
 *   3.6        endpoint list: limit=1 -> paling banyak 1 baris.
 *   3.5 / 4.6  endpoint list: offset=9999 -> 200 & data [] (bukan null/error).
 *   6.3        PATCH -> 405.   6.4  tanpa sesi -> 401 tanpa data.
 *   5.8        respons tanpa field password/hash/secret/token/salt.
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/security/TC-MYINFO-API-01-Verify-Every-My-Info-Tab-API-Contract-Paging-Methods-Session-And-No-Sensitive-Data.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession, openMyInfoFromMenu } from '../../../src/utils/myInfo';

type Tab = { unit: string; name: string; path: (emp: number) => string; list: boolean; keys?: string[] };
const TABS: Tab[] = [
  { unit: 'U006', name: 'Personal Details', path: (e) => `pim/employees/${e}/personal-details`, list: false, keys: ['empNumber', 'firstName', 'lastName', 'employeeId'] },
  { unit: 'U006', name: 'Custom Fields (personal)', path: (e) => `pim/employees/${e}/custom-fields?screen=personal`, list: false },
  { unit: 'U108', name: 'Contact Details', path: (e) => `pim/employee/${e}/contact-details`, list: false, keys: ['street1', 'city', 'countryCode'] },
  { unit: 'U109', name: 'Emergency Contacts', path: (e) => `pim/employees/${e}/emergency-contacts`, list: true },
  { unit: 'U110', name: 'Dependents', path: (e) => `pim/employees/${e}/dependents`, list: true },
  { unit: 'U111', name: 'Immigration', path: (e) => `pim/employees/${e}/immigrations`, list: true },
  { unit: 'U112', name: 'Job', path: (e) => `pim/employees/${e}/job-details`, list: false, keys: ['empNumber', 'joinedDate', 'jobTitle', 'empStatus'] },
  { unit: 'U113', name: 'Salary', path: (e) => `pim/employees/${e}/salary-components`, list: true },
  { unit: 'U114', name: 'Report-to (supervisors)', path: (e) => `pim/employees/${e}/supervisors`, list: true },
  { unit: 'U114', name: 'Report-to (subordinates)', path: (e) => `pim/employees/${e}/subordinates`, list: true },
  { unit: 'U115', name: 'Qualifications (work experience)', path: (e) => `pim/employees/${e}/work-experiences`, list: true },
  { unit: 'U115', name: 'Qualifications (skills)', path: (e) => `pim/employees/${e}/skills`, list: true },
  { unit: 'U116', name: 'Memberships', path: (e) => `pim/employees/${e}/memberships`, list: true },
  { unit: 'U117', name: 'Attachments (personal)', path: (e) => `pim/employees/${e}/screen/personal/attachments`, list: true },
];
const SENSITIVE = /"(password|passwordHash|hash|secret|token|salt)"\s*:/i;

test('TC-MYINFO-API-01: every My Info tab API - contract, paging, method, session, sensitive data', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-API-01', 'Every My Info Tab API Contract Paging Methods Session', env.baseURL);
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaMyInfoApi');
  const anon = await request.newContext({ baseURL: env.baseURL });
  try {
    const emp = await openMyInfoFromMenu(essPage);
    const req = essPage.request;
    for (const t of TABS) {
      const tag = `[${t.unit} ${t.name}]`;
      const url = `/web/index.php/api/v2/${t.path(emp)}`;
      const sep = url.includes('?') ? '&' : '?';
      report.step(tag);
      const r = await req.get(url);
      const text = await r.text();
      const body = JSON.parse(text || '{}') as { data?: unknown; meta?: { total?: unknown } };
      report.check(`${tag} 6.1 GET record sendiri (ESS) -> 200`, r.status() === 200, `status=${r.status()}`);
      const contractOk = t.list
        ? Array.isArray(body.data) && typeof body.meta?.total === 'number'
        : !!body.data && typeof body.data === 'object' && !Array.isArray(body.data) && (t.keys ?? []).every((k) => k in (body.data as object));
      report.check(`${tag} 6.2 Kontrak ${t.list ? 'list: data[] + meta.total' : `objek dgn ${(t.keys ?? []).join('/') || 'data'}`}`, contractOk, text.slice(0, 120));
      report.check(`${tag} 5.8 Tanpa field sensitif di respons`, !SENSITIVE.test(text), SENSITIVE.exec(text)?.[0] ?? 'tidak ada');
      const bad = await req.get(`${url}${sep}limit=-1`);
      report.check(`${tag} 6.6 limit=-1 -> 422`, bad.status() === 422, `status=${bad.status()}`);
      if (t.list) {
        const one = await req.get(`${url}${sep}limit=1&offset=0`);
        const oneData = ((await one.json().catch(() => null)) as { data?: unknown[] } | null)?.data;
        report.check(`${tag} 3.6 limit=1 -> maks 1 baris`, one.status() === 200 && Array.isArray(oneData) && oneData.length <= 1, `status=${one.status()}, baris=${oneData?.length}`);
        const far = await req.get(`${url}${sep}limit=10&offset=9999`);
        const farData = ((await far.json().catch(() => null)) as { data?: unknown[] } | null)?.data;
        report.check(`${tag} 3.5 / 4.6 offset=9999 -> 200 & data [] (bukan null/error)`, far.status() === 200 && Array.isArray(farData) && farData.length === 0, `status=${far.status()}, data=${JSON.stringify(farData)?.slice(0, 30)}`);
      }
      const patch = await req.patch(url.split('?')[0] ?? url, { data: {} });
      report.check(`${tag} 6.3 PATCH -> 405`, patch.status() === 405, `status=${patch.status()}`);
      const noAuth = await anon.get(url);
      const noAuthText = await noAuth.text();
      report.check(`${tag} 6.4 Tanpa sesi -> 401 tanpa data`, noAuth.status() === 401 && !/"data"\s*:\s*[[{]\s*["{]/.test(noAuthText), `status=${noAuth.status()}`);
    }
  } finally {
    await anon.dispose();
    await close();
  }
  report.print();
});
