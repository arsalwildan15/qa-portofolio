/**
 * ================================================================================
 * TC-TIME-MUT-01 — Verify Customers, Projects, Activities And Attendance Configuration: Create/Update/Delete, Server Validation, Unicode, Injection, Mass Assignment And Repeats
 * Modul    : Time > Project Info > Customers (U063), Projects (U064), Attendance > Configuration (U059)
 * Kategori : Positive (+) 1.1-C 1.1-R 1.1-U 1.1-D 1.4 | Negative (-) 2.1 2.2 2.3 | Boundary (B) 3.1 |
 *            Edge (!) 4.1 | Security (S) 5.1-SQLi 5.1-XSS-Stored 5.2-MassAssign | API (A) 6.5 6.7
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-MUT-01-Verify-Customers-Projects-Activities-And-Attendance-Configuration-Create-Update-Delete-Validation-And-Injection.spec.ts
 * Path     : tests/time/security/
 * ================================================================================
 *
 * KESELAMATAN DATA: Attendance Configuration adalah config GLOBAL bersama (R6) -- dibungkus
 * withConfigRestore(), nilai asli dibaca dulu & dikembalikan di `finally`. Customer/Project/
 * Activity dibuat & dihapus sendiri.
 *
 * TUJUAN (aturan server dibaca LIVE 17 Nov 2026):
 *   [U059] 1.1-R / 1.1-U  PUT attendance/configs (nilai sama) -> 200 & tersimpan.
 *          5.2-MassAssign  field asing -> 422 ditolak.
 *   [U063] 1.1-C  POST customer valid -> 200 + id.   1.1-R  tampil di GET list.
 *          1.1-U  PUT ubah nama -> 200.   1.1-D  DELETE -> 200 & hilang.
 *          2.1 / 6.5  tanpa nama -> 422.   2.3  nama duplikat -> 422 (BEDA dari Leave Holidays:
 *          constraint UNIK ditegakkan SERVER, bukan cuma client).
 *          3.1  nama 50 OK / 51 422 (konsisten form & API).
 *          4.1 / 5.1-SQLi / 5.1-XSS-Stored  nama Arab/CJK, kutip SQL, HTML -> tersimpan apa adanya.
 *   [U064] 1.1-C / 1.4  POST project terikat ke customer -> 200, relasi customer tampil di respons.
 *          2.2 / 6.5  customerId 999999 -> 422.
 *          1.1-C (Activity)  POST time/project/<id>/activities {name} -> 200 + id.
 *          1.1-D  DELETE project tanpa activity/time logged -> 200.
 *          6.7   DELETE yg sama 2x -> 200 lalu 404.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-458 (Low) -- [U064] Project Name 51 karakter DITERIMA (200) oleh
 *   API padahal form menolaknya ("Should not exceed 50 characters") -- BEDA dgn Customer Name yg
 *   server-nya KONSISTEN dgn form (422 utk 51 karakter).
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/security/TC-TIME-MUT-01-Verify-Customers-Projects-Activities-And-Attendance-Configuration-Create-Update-Delete-Validation-And-Injection.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { withConfigRestore } from '../../../src/utils/withConfigRestore';
import { API, currentAttendanceConfig, deleteCustomers, deleteProjects, getJson } from '../../../src/utils/timeData';

const keysOf = async (r: { json(): Promise<unknown> }) => (((await r.json().catch(() => null)) as { error?: { data?: { invalidParamKeys?: string[] } } } | null)?.error?.data?.invalidParamKeys ?? []).join(',');

test('TC-TIME-MUT-01: Customers, Projects, Activities and Attendance Configuration - CRUD, validation, injection, mass assignment', async ({ page }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-TIME-MUT-01', 'Customers Projects Activities Attendance Configuration CRUD Validation Injection', env.baseURL);
  const custIds: number[] = [];
  const projIds: number[] = [];
  try {
    await withConfigRestore(
      () => currentAttendanceConfig(page.request),
      async (snap) => { await page.request.put(`${API}attendance/configs`, { data: snap }); },
      async () => {
        report.step('[U059] Attendance Configuration');
        const snap = await currentAttendanceConfig(page.request);
        const same = await page.request.put(`${API}attendance/configs`, { data: snap });
        report.check('1.1-R / 1.1-U [U059] PUT attendance/configs (nilai sama) -> 200 & tersimpan', same.status() === 200 && JSON.stringify(await currentAttendanceConfig(page.request)) === JSON.stringify(snap), `status=${same.status()}`);
        const mass = await page.request.put(`${API}attendance/configs`, { data: { ...snap, isAdmin: true } });
        report.check('5.2-MassAssign [U059] field asing "isAdmin" -> 422 (ditolak)', mass.status() === 422 && (await keysOf(mass)).includes('isAdmin'), `status=${mass.status()} keys=${await keysOf(mass)}`);
      },
    );

    report.step('[U063] Customers: create, read, update, validation, injection');
    const s = `${Date.now() % 100000}`;
    const custR1 = await page.request.post(`${API}time/customers`, { data: { name: `QaCustMut${s}`, description: 'awal' } });
    const cust1 = ((await custR1.json()) as { data: { id: number } }).data.id;
    custIds.push(cust1);
    report.check('1.1-C [U063] POST customer valid -> 200 + id', custR1.status() === 200 && typeof cust1 === 'number', `status=${custR1.status()}`);
    const list1 = await getJson<Array<{ id: number; name: string }>>(page.request, 'time/customers?limit=50');
    report.check('1.1-R [U063] Customer baru tampil di GET list', list1.some((c) => c.id === cust1));
    const upd = await page.request.put(`${API}time/customers/${cust1}`, { data: { name: `QaCustMutUpdated${s}`, description: 'diubah' } });
    report.check('1.1-U [U063] PUT ubah nama -> 200', upd.status() === 200, `status=${upd.status()}`);
    const noName = await page.request.post(`${API}time/customers`, { data: { description: 'x' } });
    report.check('2.1 / 6.5 [U063] POST tanpa nama -> 422 "name"', noName.status() === 422 && (await keysOf(noName)).includes('name'), `status=${noName.status()}`);
    const dup = await page.request.post(`${API}time/customers`, { data: { name: `QaCustMutUpdated${s}`, description: 'dup' } });
    report.check('2.3 [U063] Nama duplikat -> 422 (constraint unik DITEGAKKAN server, beda dgn Leave Holidays)', dup.status() === 422, `status=${dup.status()}`);
    const name50 = ('QaC' + s).padEnd(50, 'x');
    const n50 = await page.request.post(`${API}time/customers`, { data: { name: name50, description: '' } });
    report.check(`3.1 [U063] Nama tepat 50 karakter (unik) -> 200`, n50.status() === 200 && name50.length === 50, `status=${n50.status()} len=${name50.length}`);
    if (n50.status() === 200) custIds.push(((await n50.json()) as { data: { id: number } }).data.id);
    const n51 = await page.request.post(`${API}time/customers`, { data: { name: 'C'.repeat(51), description: '' } });
    report.check('3.1 / 6.5 [U063] Nama 51 karakter -> 422 (konsisten dgn form)', n51.status() === 422, `status=${n51.status()}`);
    for (const [label, name] of [['4.1 Arab/CJK', `مرحبا 你好 ${s}`], ['5.1-SQLi', `QaSQLi' OR '1'='1 ${s}`], ['5.1-XSS-Stored', `<img src=x onerror=alert(1)> ${s}`]] as const) {
      const r = await page.request.post(`${API}time/customers`, { data: { name, description: '' } });
      const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;
      if (id) custIds.push(id);
      const now = (await getJson<Array<{ id: number; name: string }>>(page.request, 'time/customers?limit=50')).find((c) => c.id === id);
      report.check(`${label} [U063] -> 200 & tersimpan identik sebagai teks`, r.status() === 200 && now?.name === name, `status=${r.status()}`);
    }

    report.step('[U064] Projects: relasi ke customer, validasi, Activities');
    const projR = await page.request.post(`${API}time/projects`, { data: { customerId: cust1, name: `QaProjMut${s}`, description: null } });
    const proj1 = ((await projR.json()) as { data: { id: number; customer: { id: number } } }).data;
    projIds.push(proj1.id);
    report.check('1.1-C / 1.4 [U064] POST project -> 200 & relasi customer tampil', projR.status() === 200 && proj1.customer?.id === cust1, `status=${projR.status()}`);
    const badCust = await page.request.post(`${API}time/projects`, { data: { customerId: 999999, name: `QaProjBad${s}`, description: null } });
    report.check('2.2 / 6.5 [U064] customerId 999999 -> 422', badCust.status() === 422 && (await keysOf(badCust)).includes('customerId'), `status=${badCust.status()}`);
    const actR = await page.request.post(`${API}time/project/${proj1.id}/activities`, { data: { name: `QaActMut${s}` } });
    const actId = ((await actR.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;
    report.check('1.1-C [U064] POST activity -> 200 + id', actR.status() === 200 && typeof actId === 'number', `status=${actR.status()}`);

    report.step('[U064] Project Name: batas panjang vs form');
    const projN51 = await page.request.post(`${API}time/projects`, { data: { customerId: cust1, name: 'P'.repeat(51), description: null } });
    report.check('3.1 / 6.5 [U064] Project Name 51 karakter -> 422 (sama spt form)', projN51.status() === 422, `status=${projN51.status()}`);
    if (projN51.status() === 200) projIds.push(((await projN51.json()) as { data: { id: number } }).data.id);

    report.step('[U064] Delete & idempotensi');
    const proj2 = await page.request.post(`${API}time/projects`, { data: { customerId: cust1, name: `QaProjDel${s}`, description: null } });
    const proj2Id = ((await proj2.json()) as { data: { id: number } }).data.id;
    const d1 = await page.request.delete(`${API}time/projects`, { data: { ids: [proj2Id] } });
    const d2 = await page.request.delete(`${API}time/projects`, { data: { ids: [proj2Id] } });
    report.check('1.1-D / 6.7 [U064] DELETE project (tanpa time logged) 2x -> 200 lalu 404', d1.status() === 200 && d2.status() === 404, `${d1.status()} -> ${d2.status()}`);
    const dc = await page.request.delete(`${API}time/customers`, { data: { ids: [cust1] } });
    report.check('1.1-D [U063] DELETE customer -> 200', dc.status() === 200, `status=${dc.status()}`);
    const idx = custIds.indexOf(cust1);
    if (idx !== -1) custIds.splice(idx, 1);
  } finally {
    await deleteProjects(page.request, projIds);
    await deleteCustomers(page.request, custIds);
  }
  report.print();
});
