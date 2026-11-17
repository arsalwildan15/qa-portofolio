/**
 * ================================================================================
 * TC-PIM-JOB-API-02 — Verify Job Termination API: Date Order Business Rule And Concurrent Termination Race
 * Modul    : PIM > Employee > Job (U093)
 * Kategori : Positive (+) 1.2 | Edge Case (!) 4.4 | Security (S) 5.9
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-JOB-API-02-Verify-Termination-Business-Rule-And-Concurrent-Termination-Race.spec.ts
 * Path     : tests/pim/job/
 * ================================================================================
 *
 * LATAR (body direkam LIVE dari UI via page.on('request')): POST pim/employees/<N>/terminations
 * body {date, note, terminationReasonId}. TC-PIM-JOB-API-01 sudah menutup 1.1-R/2.1/2.5/2.6/
 * 5.2-MassAssign/6.3/6.4/6.5 utk job-details & employment-contract, DAN sudah mendokumentasikan
 * (via finding, tanpa kode literal) bhw Job TIDAK punya field teks bebas -- 3.1/4.1/5.1-SQLi/
 * 5.1-XSS-Stored TETAP GAP di matrix krn flag 'T' diterapkan generik ke SEMUA EMP_TABS termasuk
 * Job (keterbatasan struktural tooling, dicatat terpisah di Execution-Plan, BUKAN diuji di sini).
 * TC ini sempit, hanya menutup 4.4 (race condition pd aksi terminate, mutually-exclusive) & 5.9
 * (business logic: urutan tanggal terminasi vs tanggal bergabung).
 *
 * TUJUAN:
 *   1.2  jobTitleId/empStatusId/locationId (semua opsional) kosong (null) vs semua terisi ->
 *        200 pd kedua kombinasi. [TEMUAN] subUnitId HARUS DIHILANGKAN dari body (bukan dikirim
 *        null) kalau tidak diisi -- mengirim subUnitId:null ATAU subUnitId dgn id valid manapun
 *        (termasuk id root "OrangeHRM"=1 & "Engineering"=3) SAMA-SAMA 422, hanya meng-OMIT key
 *        itu sepenuhnya yg diterima -- inkonsistensi kecil, dicatat sbg finding bukan bug baru
 *        (clientnya/form UI tidak pernah mengirim subUnitId scr terpisah dari form Save biasa).
 *   5.9  Tanggal terminasi SEBELUM joinedDate -> seharusnya DITOLAK (lihat HASIL utk bug).
 *   4.4  2 request terminate ditembak bersamaan pd karyawan yg SAMA -> seharusnya hanya 1 yg
 *        sukses (locking) ATAU yg kedua ditolak krn status sudah Terminated (lihat HASIL).
 *
 * HASIL 18 Nov 2026: SENGAJA FAILED (R3), 2 BUG BARU:
 *   BG-473 (Medium, 5.9) -- tanggal terminasi SEBELUM joinedDate DITERIMA 200, bukan ditolak;
 *     tidak ada validasi urutan tanggal sama sekali pd endpoint terminations (beda dgn
 *     employment-contract yg SUDAH menegakkan startDate<endDate, lihat TC-PIM-JOB-API-01).
 *   BG-474 (Medium, 4.4) -- 2 request terminate bersamaan pd karyawan yg SAMA KEDUANYA
 *     sukses 200 (tidak ada locking/status-check); hasil akhir employeeTerminationRecord
 *     hanya menyimpan SATU record (last-write-wins), record pertama "hilang" tanpa pesan
 *     apa pun ke caller -- karyawan yg sudah Terminated seharusnya menolak terminate kedua
 *     (2.5-state-transition-invalid), bukan menerimanya diam-diam.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/job/TC-PIM-JOB-API-02-Verify-Termination-Business-Rule-And-Concurrent-Termination-Race.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

type JobDetails = { employeeTerminationRecord: { id: number | null; date: string | null } };

test('TC-PIM-JOB-API-02: Job termination API - date order business rule, concurrent termination race', async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-JOB-API-02', 'Job Termination Date Order Business Rule Concurrent Race', env.baseURL);
  const emp1 = await createEmployee(page.request, 'QaJobRule', `L${Date.now() % 100000}`);
  const emp2 = await createEmployee(page.request, 'QaJobRace', `L${Date.now() % 100000}`);

  try {
    report.step('1.2 Variasi field opsional (jobTitleId/empStatusId/locationId)');
    const jobApi1 = `/web/index.php/api/v2/pim/employees/${emp1}/job-details`;
    const filled = await page.request.put(jobApi1, { data: { joinedDate: '2024-01-01', jobTitleId: 1, empStatusId: 1, locationId: 1 } });
    report.check('1.2 [U093] jobTitleId/empStatusId/locationId semua TERISI (subUnitId di-omit) -> 200', filled.status() === 200, `status=${filled.status()}`);
    const emptied = await page.request.put(jobApi1, { data: { joinedDate: '2024-01-01', jobTitleId: null, empStatusId: null, locationId: null } });
    report.check('1.2 [U093] jobTitleId/empStatusId/locationId semua KOSONG (null) -> 200', emptied.status() === 200, `status=${emptied.status()}`);
    const subUnitOmitted = await page.request.put(jobApi1, { data: { joinedDate: '2024-01-01' } });
    const subUnitNull = await page.request.put(jobApi1, { data: { joinedDate: '2024-01-01', subUnitId: null } });
    report.finding('subUnitId: omit vs null tidak setara', `subUnitId di-OMIT dari body -> ${subUnitOmitted.status()} (diterima); subUnitId: null -> ${subUnitNull.status()} (ditolak) -- API memperlakukan key yg tidak dikirim berbeda dari key dgn value null utk field ini, berbeda dgn jobTitleId/empStatusId/locationId yg menerima null scr normal.`);

    report.step('5.9 Urutan tanggal: terminasi sebelum joinedDate');
    await page.request.put(`/web/index.php/api/v2/pim/employees/${emp1}/job-details`, { data: { joinedDate: '2024-01-01' } });
    const api1 = `/web/index.php/api/v2/pim/employees/${emp1}/terminations`;
    const before = await page.request.post(api1, { data: { date: '2020-01-01', note: null, terminationReasonId: 6 } });
    report.check('5.9 [U093] Tanggal terminasi SEBELUM joinedDate -> DITOLAK (seharusnya 422)', before.status() === 422, `status=${before.status()}`);

    report.step('4.4 Race condition: 2 terminate bersamaan pd karyawan yg sama');
    await page.request.put(`/web/index.php/api/v2/pim/employees/${emp2}/job-details`, { data: { joinedDate: '2024-01-01' } });
    const api2 = `/web/index.php/api/v2/pim/employees/${emp2}/terminations`;
    const [r1, r2] = await Promise.all([
      page.request.post(api2, { data: { date: '2025-01-01', note: null, terminationReasonId: 6 } }),
      page.request.post(api2, { data: { date: '2025-02-01', note: null, terminationReasonId: 7 } }),
    ]);
    report.check('4.4 [U093] 2 terminate bersamaan -> HANYA SATU yg sukses 200 (yg lain ditolak krn sudah Terminated)', [r1.status(), r2.status()].filter((s) => s === 200).length === 1, `status1=${r1.status()} status2=${r2.status()}`);
    const after = ((await (await page.request.get(`/web/index.php/api/v2/pim/employees/${emp2}/job-details`)).json()) as { data?: JobDetails }).data;
    report.finding('Status akhir karyawan setelah 2 terminate bersamaan', `employeeTerminationRecord=${JSON.stringify(after?.employeeTerminationRecord)} (kedua request status: ${r1.status()}/${r2.status()})`);
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp1, emp2] } }).catch(() => null);
  }
  report.print();
});
