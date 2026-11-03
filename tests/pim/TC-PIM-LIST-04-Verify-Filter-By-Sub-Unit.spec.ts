/**
 * ================================================================================
 * TC-PIM-LIST-04 — Verify Filter By Sub Unit
 * Modul    : PIM - Employee List
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-04-Verify-Filter-By-Sub-Unit.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi filter Sub Unit (dropdown nested: OrangeHRM > Administration >
 *   Engineering > Development/Quality Assurance) bisa memilih opsi nested dan
 *   memicu search baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-LIST-04-Verify-Filter-By-Sub-Unit.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

test('TC-PIM-LIST-04: filter by nested sub unit triggers a new search', async ({
  page,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-LIST-04', 'Filter By Sub Unit', env.baseURL, page);

  report.step('Navigate ke Employee List, pilih Sub Unit = "Engineering" (nested dropdown)');
  await employeeListPage.goto();
  await employeeListPage.selectDropdownOption(employeeListPage.subUnitSelect, 'Engineering');

  report.step('Klik Search, verify request GET terkirim dengan status 200');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'GET'),
    employeeListPage.search(),
  ]);
  report.check('[API] Response status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.print();
});
