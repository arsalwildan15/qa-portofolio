/**
 * ================================================================================
 * TC-PIM-LIST-05 — Verify Filter By Include
 * Modul    : PIM - Employee List
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-05-Verify-Filter-By-Include.spec.ts
 * Path     : tests/pim/employee-list/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi dropdown "Include" (Current Employees Only / Current and Past
 *   Employees / Past Employees Only) mengubah parameter includeEmployees di request.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/employee-list/TC-PIM-LIST-05-Verify-Filter-By-Include.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-PIM-LIST-05: Include filter changes includeEmployees query param', async ({
  page,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-LIST-05', 'Filter By Include', env.baseURL, page);

  report.step('Navigate ke Employee List, tunggu form settle, pilih Include = "Current and Past Employees"');
  await employeeListPage.goto();
  await isVisibleWithWait(employeeListPage.includeSelect);
  await employeeListPage.selectDropdownOption(employeeListPage.includeSelect, 'Current and Past Employees');

  report.step('Klik Search, verify query param includeEmployees sesuai pilihan');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'GET'),
    employeeListPage.search(),
  ]);
  report.check('[API] Response status === 200', resp.status() === 200, `status=${resp.status()}`);
  report.check(
    '[API] URL mengandung includeEmployees=currentAndPast',
    resp.url().includes('includeEmployees=currentAndPast'),
    `url=${resp.url()}`,
  );

  report.print();
});
