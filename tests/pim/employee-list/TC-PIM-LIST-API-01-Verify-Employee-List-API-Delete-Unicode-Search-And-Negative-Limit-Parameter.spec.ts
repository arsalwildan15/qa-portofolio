/**
 * ================================================================================
 * TC-PIM-LIST-API-01 — Verify The Employee List API: Delete, Unicode Search, Negative Limit Parameter
 * Modul    : PIM > Employee List (U002)
 * Kategori : Positive (+) 1.1-D | Negative (-) 4.1 | API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-API-01-Verify-Employee-List-API-Delete-Unicode-Search-And-Negative-Limit-Parameter.spec.ts
 * Path     : tests/pim/employee-list/
 * ================================================================================
 *
 * LATAR: DELETE pim/employees {ids:[...]} (sudah dicakup tidak langsung oleh TC lain --
 * TC-PIM-LIST-13 hanya menguji Cancel, belum ada TC yg memverifikasi DELETE SUKSES
 * sungguhan dari Employee List). GET pim/employees?nameOrId=... utk search.
 *
 * TUJUAN:
 *   1.1-D  DELETE employee -> 200 & employee benar2 hilang (GET by id -> 4xx setelahnya).
 *   4.1  Search dgn karakter Arab/CJK -> 200 & tidak error (hasil kosong wajar krn tidak
 *        ada employee dgn nama itu).
 *   6.5  limit=-1 (parameter negatif) -> 422 (ditegakkan).
 *
 * HASIL 17 Nov 2026: lolos penuh, tidak ada bug ditemukan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/employee-list/TC-PIM-LIST-API-01-Verify-Employee-List-API-Delete-Unicode-Search-And-Negative-Limit-Parameter.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

test('TC-PIM-LIST-API-01: Employee List API - delete, unicode search, negative limit parameter', async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PIM-LIST-API-01', 'Employee List API Delete Unicode Search Negative Limit Parameter', env.baseURL);
  const api = '/web/index.php/api/v2/pim/employees';
  const emp = await createEmployee(page.request, 'QaEmpListApi', `L${Date.now() % 100000}`);

  report.step('Unicode search');
  const search = await page.request.get(`${api}?nameOrId=${encodeURIComponent('مرحبا 你好')}`);
  report.check('4.1 [U002] Search dgn Arab/CJK -> 200 & tidak error', search.status() === 200, `status=${search.status()}`);

  report.step('Parameter negatif');
  const badLimit = await page.request.get(`${api}?limit=-1`);
  report.check('6.5 [U002] limit=-1 -> 422 (ditegakkan)', badLimit.status() === 422, `status=${badLimit.status()}`);

  report.step('Delete sungguhan');
  const del = await page.request.delete(api, { data: { ids: [emp] } });
  report.check('1.1-D [U002] DELETE -> 200', del.status() === 200, `status=${del.status()}`);
  const verifyGone = await page.request.get(`${api}/${emp}`);
  report.check('1.1-D [U002] Employee benar2 hilang setelah DELETE (GET by id -> 4xx)', verifyGone.status() >= 400 && verifyGone.status() < 500, `status=${verifyGone.status()}`);

  report.print();
});
