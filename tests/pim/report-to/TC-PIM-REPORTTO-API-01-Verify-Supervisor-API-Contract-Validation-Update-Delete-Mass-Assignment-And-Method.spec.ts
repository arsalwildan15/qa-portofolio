/**
 * ================================================================================
 * TC-PIM-REPORTTO-API-01 — Verify The Supervisor/Subordinate API: Contract, Update, Delete, Server-Side Validation, Mass Assignment, Method And Session
 * Modul    : PIM > Employee > Report-to (U095)
 * Kategori : Positive (+) 1.1-R 1.1-U 1.1-D | Negative (-) 2.2 | Security (S) 5.2-MassAssign |
 *            API (A) 6.3 6.4 6.5 6.7
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTTO-API-01-Verify-Supervisor-API-Contract-Validation-Update-Delete-Mass-Assignment-And-Method.spec.ts
 * Path     : tests/pim/report-to/
 * ================================================================================
 *
 * LATAR (body direkam LIVE dari UI 17 Nov 2026 via page.on('request')):
 *   Add       POST pim/employees/<empNumber>/supervisors {empNumber (SUPERVISOR),
 *             reportingMethodId}
 *   Update    PUT pim/employees/<empNumber>/supervisors/<supervisorEmpNumber>
 *             {reportingMethodId}
 *   Delete    DELETE pim/employees/<empNumber>/supervisors {ids:[supervisorEmpNumber]}
 *   Read      GET pim/employees/<empNumber>/supervisors (arah atasan) & .../subordinates
 *             (arah bawahan, view terbalik dari sisi supervisor)
 *   Endpoint ini TIDAK punya field teks bebas (hanya empNumber & reportingMethodId, dipilih
 *   dari autocomplete/dropdown) -- 3.1 (panjang karakter), 4.1 (unicode), 5.1-SQLi,
 *   5.1-XSS-Stored TIDAK BERLAKU (N/A, dicatat via report.finding(), bukan di-skip diam-diam).
 *
 * TUJUAN:
 *   1.1-R / 1.1-U / 1.1-D  create -> 200; GET supervisors (arah atasan) & subordinates
 *        (arah bawahan, dari sisi supervisor) -> kontrak benar; PUT ubah reportingMethodId
 *        -> 200 & berubah; DELETE -> 200 & hilang.
 *   5.2-MassAssign  field asing (isAdmin) -> 422 ditolak (skema ketat).
 *   2.2 / 6.5 / 6.7  reportingMethodId tidak ada (999), empNumber bukan angka ("abc"),
 *        supervisor tidak ada (999999), dan menambah supervisor yg SAMA 2x (duplicate) ->
 *        dicatat (lihat HASIL).
 *   6.3  PATCH -> 405.  6.4  tanpa sesi -> 401.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-466 (High) -- endpoint POST
 *   .../supervisors TIDAK memvalidasi input sebelum diproses: reportingMethodId di luar
 *   enum (999), empNumber bertipe salah ("abc"), empNumber supervisor yg tidak ada (999999),
 *   dan menambah supervisor yg SAMA 2x (duplicate) KEEMPATNYA mengembalikan HTTP 500
 *   Internal Server Error, bukan 422 Invalid Parameter -- satu-satunya validasi yg benar
 *   adalah skema body (field asing ditolak 422). Operasi valid (create/read/update/delete)
 *   semuanya lolos.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/report-to/TC-PIM-REPORTTO-API-01-Verify-Supervisor-API-Contract-Validation-Update-Delete-Mass-Assignment-And-Method.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

type SupervisorRow = { supervisor: { empNumber: number }; reportingMethod: { id: number; name: string } };
const is5xx = (n: number) => n >= 500;

test('TC-PIM-REPORTTO-API-01: Supervisor API - contract, validation, update, delete, mass assignment, method, session', async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-PIM-REPORTTO-API-01', 'Supervisor API Contract Validation Update Delete Mass Assignment Method Session', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  const empA = await createEmployee(page.request, 'QaRepToApiA', `L${Date.now() % 100000}`);
  const empB = await createEmployee(page.request, 'QaRepToApiB', `L${(Date.now() + 1) % 100000}`);
  const api = `/web/index.php/api/v2/pim/employees/${empA}/supervisors`;

  try {
    report.step('Kontrak create, read, update, delete');
    const ok = await page.request.post(api, { data: { empNumber: empB, reportingMethodId: 1 } });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: SupervisorRow }).data;
    report.check('1.1-R [U095] POST valid -> 200 + kontrak supervisor/reportingMethod', ok.status() === 200 && okData?.supervisor.empNumber === empB && okData?.reportingMethod.id === 1, `status=${ok.status()}`);
    const list = ((await (await page.request.get(api)).json()) as { data: SupervisorRow[] }).data;
    report.check('1.1-R [U095] GET supervisors -> muncul', list.some((r) => r.supervisor.empNumber === empB), `jumlah=${list.length}`);
    const subApi = `/web/index.php/api/v2/pim/employees/${empB}/subordinates`;
    const subList = ((await (await page.request.get(subApi)).json()) as { data: Array<{ subordinate: { empNumber: number } }> }).data;
    report.check('1.1-R [U095] GET subordinates (arah terbalik dari sisi supervisor) -> muncul', subList.some((r) => r.subordinate.empNumber === empA), `jumlah=${subList.length}`);
    const upd = await page.request.put(`${api}/${empB}`, { data: { reportingMethodId: 2 } });
    const updData = ((await upd.json().catch(() => ({}))) as { data?: SupervisorRow }).data;
    report.check('1.1-U [U095] PUT reportingMethodId -> 200 & berubah', upd.status() === 200 && updData?.reportingMethod.id === 2, `status=${upd.status()}`);
    const del = await page.request.delete(api, { data: { ids: [empB] } });
    report.check('1.1-D [U095] DELETE -> 200', del.status() === 200, `status=${del.status()}`);
    const listAfter = ((await (await page.request.get(api)).json()) as { data: SupervisorRow[] }).data;
    report.check('1.1-D [U095] Supervisor hilang dari list setelah DELETE', !listAfter.some((r) => r.supervisor.empNumber === empB), `jumlah=${listAfter.length}`);

    report.step('Catatan cakupan: tidak ada field teks bebas pd endpoint ini');
    report.finding('Field teks bebas tidak ada', 'Endpoint supervisors hanya menerima empNumber (dari autocomplete) dan reportingMethodId (dari dropdown enum) -- tidak ada field teks bebas untuk diuji panjang karakter, unicode, atau injeksi pada unit ini secara spesifik.');

    report.step('Mass assignment');
    const mass = await page.request.post(api, { data: { empNumber: empB, reportingMethodId: 1, isAdmin: true } });
    report.check('5.2-MassAssign [U095] Field asing (isAdmin) di body -> 422 (skema ketat)', mass.status() === 422, `status=${mass.status()}`);
    if (mass.status() === 200) await page.request.delete(api, { data: { ids: [empB] } }).catch(() => null);

    report.step('Validasi input tidak valid (lihat HASIL utk bug)');
    const ghostSup = await page.request.post(api, { data: { empNumber: 999999, reportingMethodId: 1 } });
    report.check('2.6 / 6.5 [U095] empNumber supervisor tidak ada (999999) -> TIDAK 500 (seharusnya 422)', !is5xx(ghostSup.status()), `status=${ghostSup.status()}`);
    const badMethod = await page.request.post(api, { data: { empNumber: empB, reportingMethodId: 999 } });
    report.check('2.2 / 6.5 [U095] reportingMethodId di luar enum (999) -> TIDAK 500 (seharusnya 422)', !is5xx(badMethod.status()), `status=${badMethod.status()}`);
    const badType = await page.request.post(api, { data: { empNumber: 'abc', reportingMethodId: 1 } });
    report.check('2.2 / 6.5 [U095] empNumber bertipe salah ("abc") -> TIDAK 500 (seharusnya 422)', !is5xx(badType.status()), `status=${badType.status()}`);
    const first = await page.request.post(api, { data: { empNumber: empB, reportingMethodId: 1 } });
    const dup = await page.request.post(api, { data: { empNumber: empB, reportingMethodId: 1 } });
    report.check('6.7 [U095] Menambah supervisor yg SAMA 2x (duplicate) -> TIDAK 500 (idempotent atau 422, bukan crash)', first.status() === 200 && !is5xx(dup.status()), `status1=${first.status()} status2=${dup.status()}`);
    await page.request.delete(api, { data: { ids: [empB] } }).catch(() => null);

    report.step('Method & sesi');
    const patch = await page.request.patch(api, { data: {} });
    report.check('6.3 [U095] PATCH -> 405', patch.status() === 405, `status=${patch.status()}`);
    const noAuth = await anon.get(api);
    report.check('6.4 [U095] Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);
  } finally {
    await anon.dispose();
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [empA, empB] } }).catch(() => null);
  }
  report.print();
});
