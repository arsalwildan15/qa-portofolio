/**
 * ================================================================================
 * TC-PIM-JOB-API-01 — Verify The Job Details And Employment Contract APIs: Contract, Server-Side Validation, Unknown Lookup Ids, Mass Assignment, Method And Session
 * Modul    : PIM > Employee > Job (U093)
 * Kategori : Positive (+) 1.1-R | Negative (-) 2.1 2.5 2.6 | Security (S) 5.2-MassAssign |
 *            API (A) 6.3 6.4 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-JOB-API-01-Verify-Job-Details-And-Employment-Contract-API-Contract-Validation-Mass-Assignment-Method-And-Session.spec.ts
 * Path     : tests/pim/job/
 * ================================================================================
 *
 * LATAR (body direkam LIVE dari UI 17 Nov 2026 via page.on('request')):
 *   Job details          PUT pim/employees/<N>/job-details {joinedDate, jobTitleId?,
 *                         empStatusId?, subUnitId?, locationId?} -- SEMUA field opsional
 *                         (null diterima), tidak ada field teks bebas (hanya tanggal & id
 *                         lookup) -- 3.1/4.1/5.1-SQLi/5.1-XSS-Stored N/A, dicatat via
 *                         report.finding() TANPA kode literal.
 *   Employment contract  PUT pim/employees/<N>/employment-contract {startDate, endDate}
 *
 * TUJUAN:
 *   1.1-R  GET job-details -> 200 & kontrak (jobTitle/jobCategory/empStatus/subunit/
 *        location semua object dgn id/name).
 *   2.1  joinedDate: null (semua field opsional) -> 200, BUKAN wajib diisi (dicatat, bukan
 *        bug -- behavior yg didesain demikian).
 *   6.5  joinedDate tidak valid ("not-a-date") -> 422.
 *   2.5  employment-contract endDate sebelum startDate -> 422 (urutan tanggal ditegakkan).
 *   5.2-MassAssign  field asing (isAdmin) -> 422 ditolak (skema ketat).
 *   2.6 / 6.5  empNumber tidak ada (999999) -> 422 (bukan 500, benar).
 *   6.3  PATCH -> 405.  6.4  tanpa sesi -> 401.
 *   subUnitId yg tidak ada (999999) -> 422 (benar, satu-satunya lookup id yg divalidasi).
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-467 (High) -- TIGA dari EMPAT lookup id pada
 *   job-details TIDAK divalidasi sebelum diproses: jobTitleId, empStatusId, dan locationId yg
 *   tidak ada (999999) KETIGANYA mengembalikan HTTP 500 Internal Server Error, bukan 422 --
 *   HANYA subUnitId yg benar divalidasi (422). Pola sama dgn BG-466 (Report-to): sebagian
 *   lookup id diperiksa, sebagian lain tidak, menunjukkan validasi ditambahkan per-field
 *   secara tidak konsisten di backend.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/job/TC-PIM-JOB-API-01-Verify-Job-Details-And-Employment-Contract-API-Contract-Validation-Mass-Assignment-Method-And-Session.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

const is5xx = (n: number) => n >= 500;
type JobDetails = { empNumber: number; joinedDate: string | null; jobTitle: { id: number | null } };

test('TC-PIM-JOB-API-01: Job Details & Employment Contract APIs - contract, validation, unknown lookup ids, mass assignment, method, session', async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-PIM-JOB-API-01', 'Job Details Employment Contract APIs Contract Validation Unknown Lookup Ids Mass Assignment Method Session', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  const emp = await createEmployee(page.request, 'QaJobApi', `L${Date.now() % 100000}`);
  const api = `/web/index.php/api/v2/pim/employees/${emp}/job-details`;
  const contractApi = `/web/index.php/api/v2/pim/employees/${emp}/employment-contract`;

  try {
    report.step('Kontrak read & update field opsional');
    const ok = await page.request.put(api, { data: { joinedDate: '2024-01-01' } });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: JobDetails }).data;
    report.check('1.1-R [U093] PUT joinedDate valid -> 200 & kontrak', ok.status() === 200 && okData?.joinedDate === '2024-01-01', `status=${ok.status()}`);
    const getRes = await page.request.get(api);
    const getData = ((await getRes.json().catch(() => ({}))) as { data?: JobDetails }).data;
    report.check('1.1-R [U093] GET job-details -> 200 & kontrak field lookup (jobTitle object)', getRes.status() === 200 && typeof getData?.jobTitle === 'object', `status=${getRes.status()}`);
    const allNull = await page.request.put(api, { data: { joinedDate: null } });
    report.check('2.1 [U093] joinedDate null (semua field opsional) -> 200, bukan wajib diisi (by design)', allNull.status() === 200, `status=${allNull.status()}`);

    report.step('Catatan cakupan: tidak ada field teks bebas pd job-details');
    report.finding('Field teks bebas tidak ada', 'job-details hanya menerima tanggal & id lookup (jobTitleId, empStatusId, subUnitId, locationId) -- tidak ada field teks bebas utk diuji panjang karakter, unicode, atau injeksi pada unit ini secara spesifik.');

    report.step('Validasi tanggal');
    const badDate = await page.request.put(api, { data: { joinedDate: 'not-a-date' } });
    report.check('6.5 [U093] joinedDate tidak valid -> 422', badDate.status() === 422, `status=${badDate.status()}`);
    const contractOk = await page.request.put(contractApi, { data: { startDate: '2024-01-01', endDate: '2025-01-01' } });
    report.check('1.1-R [U093] PUT employment-contract valid -> 200', contractOk.status() === 200, `status=${contractOk.status()}`);
    const contractBadOrder = await page.request.put(contractApi, { data: { startDate: '2025-01-01', endDate: '2024-01-01' } });
    report.check('2.5 [U093] employment-contract endDate sebelum startDate -> 422', contractBadOrder.status() === 422, `status=${contractBadOrder.status()}`);

    report.step('Mass assignment, empNumber tidak ada, method, sesi');
    const mass = await page.request.put(api, { data: { joinedDate: '2024-01-01', isAdmin: true } });
    report.check('5.2-MassAssign [U093] Field asing (isAdmin) -> 422 (skema ketat)', mass.status() === 422, `status=${mass.status()}`);
    const ghostEmp = await page.request.put('/web/index.php/api/v2/pim/employees/999999/job-details', { data: { joinedDate: '2024-01-01' } });
    report.check('2.6 / 6.5 [U093] empNumber tidak ada (999999) -> 422 (bukan 500)', ghostEmp.status() === 422, `status=${ghostEmp.status()}`);
    const patch = await page.request.patch(api, { data: {} });
    report.check('6.3 [U093] PATCH -> 405', patch.status() === 405, `status=${patch.status()}`);
    const noAuth = await anon.get(api);
    report.check('6.4 [U093] Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);

    report.step('Lookup id tidak ada (lihat HASIL utk bug)');
    const ghostSubUnit = await page.request.put(api, { data: { joinedDate: '2024-01-01', subUnitId: 999999 } });
    report.check('2.6 / 6.5 [U093] subUnitId tidak ada (999999) -> 422 (benar, satu-satunya yg divalidasi)', ghostSubUnit.status() === 422, `status=${ghostSubUnit.status()}`);
    const ghostJobTitle = await page.request.put(api, { data: { joinedDate: '2024-01-01', jobTitleId: 999999 } });
    report.check('2.6 / 6.5 [U093] jobTitleId tidak ada (999999) -> TIDAK 500 (seharusnya 422)', !is5xx(ghostJobTitle.status()), `status=${ghostJobTitle.status()}`);
    const ghostStatus = await page.request.put(api, { data: { joinedDate: '2024-01-01', empStatusId: 999999 } });
    report.check('2.6 / 6.5 [U093] empStatusId tidak ada (999999) -> TIDAK 500 (seharusnya 422)', !is5xx(ghostStatus.status()), `status=${ghostStatus.status()}`);
    const ghostLocation = await page.request.put(api, { data: { joinedDate: '2024-01-01', locationId: 999999 } });
    report.check('2.6 / 6.5 [U093] locationId tidak ada (999999) -> TIDAK 500 (seharusnya 422)', !is5xx(ghostLocation.status()), `status=${ghostLocation.status()}`);
  } finally {
    await anon.dispose();
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
