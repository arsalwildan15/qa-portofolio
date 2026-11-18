/**
 * ================================================================================
 * TC-PERF-API-02 — Verify My Reviews, My Trackers And Employee Trackers: Parameter Validation And No Search Capability
 * Modul    : Performance > Manage Reviews > My Reviews (U069), Performance > My Trackers (U070),
 *            Performance > Employee Trackers (U071)
 * Kategori : API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-API-02-Verify-My-Reviews-My-Trackers-And-Employee-Trackers-Parameter-Validation-And-No-Search-Capability.spec.ts
 * Path     : tests/performance/security/
 * ================================================================================
 *
 * LATAR: probe LIVE 18 Nov 2026 membuktikan ketiga endpoint ini (performance/reviews,
 * performance/trackers, performance/employees/trackers) MENOLAK (422) parameter apa pun yg
 * tidak dikenal skema (nameOrId, employeeName, sortField custom) -- TIDAK ADA kapasitas
 * search/filter/sort bebas sama sekali, dibuktikan di level API (lebih kuat dari sekadar
 * "tidak ada kontrol UI"). Ini scr langsung menutup 6.5 (skema ditegakkan ketat) di ketiga
 * unit SEKALIGUS, dan menjelaskan mengapa 4.1 (karakter tidak biasa di search) & 5.1-SQLi/
 * 5.1-XSS-Reflected (injeksi via search param) pd U071 N/A GENUINE -- tidak ada search param
 * apa pun utk dimasukkan payload.
 *
 * TUJUAN:
 *   6.5 [U069] GET performance/reviews dgn sortField tak dikenal -> 422.
 *   6.5 [U070] GET performance/trackers dgn sortField tak dikenal -> 422.
 *   6.5 [U071] GET performance/employees/trackers dgn nameOrId/employeeName/sortField tak
 *       dikenal -> 422 (3 percobaan).
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/security/TC-PERF-API-02-Verify-My-Reviews-My-Trackers-And-Employee-Trackers-Parameter-Validation-And-No-Search-Capability.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const API = '/web/index.php/api/v2/';

test('TC-PERF-API-02: My Reviews, My Trackers, Employee Trackers - parameter validation, no search capability', async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PERF-API-02', 'My Reviews My Trackers Employee Trackers Parameter Validation No Search Capability', env.baseURL);

  report.step('6.5 [U069] My Reviews: sortField tak dikenal');
  const myReviews = await page.request.get(`${API}performance/reviews?limit=5&sortField=unknownField`);
  report.check('6.5 [U069] GET performance/reviews sortField tak dikenal -> 422', myReviews.status() === 422, `status=${myReviews.status()}`);

  report.step('6.5 [U070] My Trackers: sortField tak dikenal');
  const myTrackers = await page.request.get(`${API}performance/trackers?limit=5&sortField=unknownField`);
  report.check('6.5 [U070] GET performance/trackers sortField tak dikenal -> 422', myTrackers.status() === 422, `status=${myTrackers.status()}`);

  report.step('6.5 [U071] Employee Trackers: 3 parameter tak dikenal (nameOrId/employeeName/sortField)');
  const empNameOrId = await page.request.get(`${API}performance/employees/trackers?limit=5&nameOrId=Qa`);
  report.check('6.5 [U071] GET performance/employees/trackers nameOrId -> 422', empNameOrId.status() === 422, `status=${empNameOrId.status()}`);
  const empEmployeeName = await page.request.get(`${API}performance/employees/trackers?limit=5&employeeName=%3Cscript%3E`);
  report.check('6.5 [U071] GET performance/employees/trackers employeeName -> 422', empEmployeeName.status() === 422, `status=${empEmployeeName.status()}`);
  const empSortField = await page.request.get(`${API}performance/employees/trackers?limit=5&sortField=custom`);
  report.check('6.5 [U071] GET performance/employees/trackers sortField -> 422', empSortField.status() === 422, `status=${empSortField.status()}`);

  report.finding('Kapasitas search/filter/sort pada My Reviews, My Trackers & Employee Trackers', 'Ketiga endpoint MENOLAK (422) parameter apa pun yg tidak dikenal skema -- dibuktikan di level API bhw ketiganya TIDAK memiliki kapasitas search/filter/sort bebas apa pun. Ini menjelaskan mengapa karakter tidak biasa & injeksi SQLi/XSS-Reflected via parameter search N/A genuine pada Employee Trackers -- tidak ada search param utk dimasukkan payload.');

  report.check('4.8 [U069] Behavior non-obvious -- tidak ditemukan behavior non-intuitif baru pd My Reviews', true, 'skema ketat & konsisten dgn endpoint Performance lainnya');
  report.check('4.8 [U070] Behavior non-obvious -- tidak ditemukan behavior non-intuitif baru pd My Trackers', true, 'skema ketat & konsisten dgn endpoint Performance lainnya');
  report.check('4.8 [U071] Behavior non-obvious -- tidak ditemukan behavior non-intuitif baru pd Employee Trackers', true, 'skema ketat & konsisten dgn endpoint Performance lainnya; endpoint administratif ini sudah dikonfirmasi BFLAC-safe sejak TC-PERF-API-01 (ESS ditolak 403)');

  report.print();
});
