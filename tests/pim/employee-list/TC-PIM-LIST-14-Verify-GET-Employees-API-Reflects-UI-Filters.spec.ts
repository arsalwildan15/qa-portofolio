/**
 * ================================================================================
 * TC-PIM-LIST-14 — Verify GET Employees API Reflects UI Filters
 * Modul    : PIM - Employee List
 * Kategori : Positive (+) [API VERIFICATION]
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-14-Verify-GET-Employees-API-Reflects-UI-Filters.spec.ts
 * Path     : tests/pim/employee-list/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi struktur dan status GET /api/v2/pim/employees secara
 *   menyeluruh: status 200, query param dasar (limit/offset/model/sortField/
 *   sortOrder/includeEmployees) selalu ada tanpa filter tambahan apapun.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/employee-list/TC-PIM-LIST-14-Verify-GET-Employees-API-Reflects-UI-Filters.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PIM-LIST-14: GET employees API has expected default query params', async ({
  page,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-LIST-14', 'GET Employees API Reflects UI Filters', env.baseURL, page);

  report.step('Navigate ke Employee List, intercept GET /api/v2/pim/employees default (tanpa filter)');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'GET'),
    employeeListPage.goto(),
  ]);

  report.step('Verify status dan query param default');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  const url = new URL(resp.url());
  for (const param of ['limit', 'offset', 'model', 'sortField', 'sortOrder', 'includeEmployees']) {
    report.check(`[API] query param "${param}" ada`, url.searchParams.has(param), `value=${url.searchParams.get(param)}`);
  }
  const body = await resp.json().catch(() => null);
  report.check('[API] response body punya key "data"', body !== null && Array.isArray(body.data));

  report.print();
});
