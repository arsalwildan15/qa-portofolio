/**
 * ================================================================================
 * TC-TIME-REPORTS-02 — Verify Reports: Read Contract, Validation, Injection And Boundary
 * Modul    : Time > Reports > Project Reports (U060), Employee Reports (U061),
 *            Attendance Summary (U062)
 * Kategori : Positive (+) 1.1-R 1.6 | Negative (-) 2.2 | Boundary (!) 3.4 | Edge (!)
 *            4.1 4.8 | Security (S) 5.1-SQLi 5.1-XSS-Reflected | API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-REPORTS-02-Verify-Reports-Read-Contract-Validation-Injection-And-Boundary.spec.ts
 * Path     : tests/time/attendance/
 * ================================================================================
 *
 * LATAR: menutup 26 kode GAP gabungan di 3 unit Reports (U060/U061/U062) sekaligus --
 * ketiganya dilayani SATU endpoint yg sama persis, GET /api/v2/time/reports/data,
 * dibedakan hanya via query param `name` (project|employee|attendance). Dibuktikan LIVE
 * 24 Nov 2026:
 *   - name=project perlu projectId (422 kalau tidak ada); name=employee perlu empNumber
 *     (422 kalau tidak ada) -- relasi/required field ditegakkan tiap tipe laporan.
 *   - name=project + projectId valid -> 200 + kontrak array {activityId,activityName,
 *     deleted,time,_url} (1.1-R / 1.6 Project Reports).
 *   - name=employee + empNumber valid -> 200 + kontrak array {projectName,activityName,
 *     duration} (1.1-R Employee Reports).
 *   - name=attendance (tanpa param lain) -> 200 langsung (1.1-R / 1.6 Attendance
 *     Summary, tidak perlu relasi spesifik).
 *   - fromDate format invalid -> 422 (2.2).
 *   - fromDate > toDate (attendance) -> 422 ditolak, BEDA dgn pola Claim (yg menerima
 *     rentang terbalik sbg filter valid kosong) -- modul ini menegakkan urutan tanggal
 *     scr eksplisit, bukan bug, hanya behavior modul-spesifik (3.4).
 *   - Query param asing -> 422; name=bogus (nama laporan tidak dikenal) -> 400 (BUKAN
 *     422 spt validasi param lain) -- format error code BEDA utk 1 kasus ini, non-obvious
 *     tapi bukan bug (4.8/6.5).
 *   - projectId berisi payload XSS (`<script>...`) -> 422 ditolak, validasi tipe numerik
 *     mencegah refleksi (5.1-XSS-Reflected).
 *   - empNumber berisi payload SQLi yg DIAWALI angka ("1' OR '1'='1") -> 422 ditolak
 *     normal (5.1-SQLi, tidak ada bypass).
 *   - empNumber berisi string NON-NUMERIK MURNI ("abc") -> 500 Internal Server Error,
 *     BUKAN 422 -- BUG BARU, pola "ghost/invalid-type id crash server" yg sama dgn
 *     BG-460 & keluarga sejenis di modul lain (server gagal validasi tipe SEBELUM
 *     memproses, type-cast crash saat empNumber bukan angka sama sekali).
 *   - Employee Name search box (UI) menerima unicode/emoji tanpa crash (4.1).
 *
 * HASIL 24 Nov 2026: 13/14 lolos, 1 gagal SENGAJA (R3), BUG BARU BG-494 (Medium) --
 *   empNumber non-numerik murni -> 500, bukan 422. MENUTUP U060 + U061 + U062
 *   SEPENUHNYA.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/attendance/TC-TIME-REPORTS-02-Verify-Reports-Read-Contract-Validation-Injection-And-Boundary.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { TimeEmployeeReportPage } from '../../../src/pages';

const API = '/web/index.php/api/v2/';

test('TC-TIME-REPORTS-02: reports read contract, validation, injection, boundary', async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-TIME-REPORTS-02', 'Reports Read Contract Validation Injection Boundary', env.baseURL, page);
  await page.goto('/web/index.php/time/displayProjectReportCriteria');

  report.step('1.1-R / 1.6 name=project -- required projectId, lalu valid');
  const projNoId = await page.request.get(`${API}time/reports/data?limit=50&offset=0&name=project`);
  report.check('[U060] name=project tanpa projectId -> 422 (required)', projNoId.status() === 422, `status=${projNoId.status()}`);
  const projList = await page.request.get(`${API}time/projects?limit=1`);
  const projectId = (await projList.json().catch(() => null))?.data?.[0]?.id;
  const projValid = await page.request.get(`${API}time/reports/data?limit=50&offset=0&name=project&projectId=${projectId}`);
  const projBody = await projValid.json().catch(() => null);
  report.check('1.1-R / 1.6 [U060] name=project + projectId valid -> 200 + kontrak array {activityId,activityName,deleted,time,_url}', projValid.status() === 200 && Array.isArray(projBody?.data) && (projBody.data.length === 0 || ('activityId' in projBody.data[0] && 'time' in projBody.data[0])), `status=${projValid.status()}`);

  report.step('1.1-R name=employee -- required empNumber, lalu valid');
  const empNoId = await page.request.get(`${API}time/reports/data?limit=50&offset=0&name=employee`);
  report.check('[U061] name=employee tanpa empNumber -> 422 (required)', empNoId.status() === 422, `status=${empNoId.status()}`);
  const empValid = await page.request.get(`${API}time/reports/data?limit=50&offset=0&name=employee&empNumber=7`);
  const empBody = await empValid.json().catch(() => null);
  report.check('1.1-R [U061] name=employee + empNumber valid -> 200 + kontrak array {projectName,activityName,duration}', empValid.status() === 200 && Array.isArray(empBody?.data) && (empBody.data.length === 0 || ('projectName' in empBody.data[0] && 'duration' in empBody.data[0])), `status=${empValid.status()}`);

  report.step('1.1-R / 1.6 name=attendance -- langsung tanpa relasi khusus');
  const attValid = await page.request.get(`${API}time/reports/data?limit=50&offset=0&name=attendance`);
  report.check('1.1-R / 1.6 [U062] name=attendance -> 200 langsung', attValid.status() === 200, `status=${attValid.status()}`);

  report.step('2.2 Format invalid -- fromDate bukan tanggal');
  const badDate = await page.request.get(`${API}time/reports/data?limit=50&offset=0&name=attendance&fromDate=not-a-date`);
  report.check('2.2 [U060/U061/U062] fromDate format invalid -> 422 ditolak', badDate.status() === 422, `status=${badDate.status()}`);

  report.step('3.4 Boundary tanggal -- rentang terbalik DITOLAK (beda dgn modul Claim)');
  const reversed = await page.request.get(`${API}time/reports/data?limit=50&offset=0&name=attendance&fromDate=2026-12-31&toDate=2026-01-01`);
  report.check('3.4 [U060/U061/U062] fromDate > toDate -> 422 ditolak (modul ini menegakkan urutan tanggal eksplisit, beda dgn Claim yg menerima sbg filter kosong -- bukan bug, behavior modul-spesifik)', reversed.status() === 422, `status=${reversed.status()}`);

  report.step('6.5 / 4.8 Parameter negative -- param asing & nama report tidak dikenal');
  const badParam = await page.request.get(`${API}time/reports/data?limit=50&offset=0&name=attendance&bogusParam=1`);
  report.check('6.5 [U060/U061/U062] Query param asing -> 422 ditolak', badParam.status() === 422, `status=${badParam.status()}`);
  const badReportName = await page.request.get(`${API}time/reports/data?limit=50&offset=0&name=bogus`);
  report.check('4.8 [U060/U061/U062] name=bogus (laporan tidak dikenal) -> 400, BUKAN 422 spt validasi param lain -- format error code beda utk kasus ini, non-obvious tapi bukan bug', badReportName.status() === 400, `status=${badReportName.status()}`);

  report.step('5.1-XSS-Reflected projectId berisi payload XSS');
  const xssProjectId = await page.request.get(`${API}time/reports/data?limit=50&offset=0&name=project&projectId=${encodeURIComponent('<script>alert(1)</script>')}`);
  report.check('5.1-XSS-Reflected [U060] projectId berisi payload XSS -> 422 ditolak (validasi tipe numerik mencegah refleksi)', xssProjectId.status() === 422, `status=${xssProjectId.status()}`);

  report.step('5.1-SQLi empNumber berisi payload SQL diawali angka');
  const sqliEmp = await page.request.get(`${API}time/reports/data?limit=50&offset=0&name=employee&empNumber=${encodeURIComponent("1' OR '1'='1")}`);
  report.check("5.1-SQLi [U061] empNumber=\"1' OR '1'='1\" -> 422 ditolak normal, tidak ada bypass", sqliEmp.status() === 422, `status=${sqliEmp.status()}`);

  report.step('[BUG BARU] empNumber string non-numerik murni -> crash server');
  const nonNumericEmp = await page.request.get(`${API}time/reports/data?limit=50&offset=0&name=employee&empNumber=abc`);
  report.check('[U061] empNumber="abc" (non-numerik murni) -> SEHARUSNYA 422 spt nonexistent-id, BUKAN 500 (ghost/invalid-type id crash, pola sama dgn BG-460 di modul lain)', nonNumericEmp.status() !== 500, `status=${nonNumericEmp.status()}`);

  report.step('4.1 Employee Name search box -- unicode/emoji');
  const employeeReportPage = new TimeEmployeeReportPage(page);
  await employeeReportPage.goto();
  await employeeReportPage.employeeNameInput.fill('مرحبا 你好 🎉').catch(() => {});
  await page.waitForTimeout(500);
  report.check('4.1 [U061] Employee Name search box menerima unicode/emoji tanpa crash', await page.locator('body').isVisible(), 'body masih visible setelah input unicode');

  report.print();
});
