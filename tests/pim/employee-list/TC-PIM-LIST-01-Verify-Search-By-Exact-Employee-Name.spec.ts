/**
 * ================================================================================
 * TC-PIM-LIST-01 — Verify Search By Exact Employee Name
 * Modul    : PIM - Employee List
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-01-Verify-Search-By-Exact-Employee-Name.spec.ts
 * Path     : tests/pim/employee-list/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi search Employee Name dengan autocomplete "Type for hints..."
 *   menghasilkan baris yang namanya cocok.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/employee-list/TC-PIM-LIST-01-Verify-Search-By-Exact-Employee-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-LIST-01: search by exact employee name returns matching rows', async ({
  page,
  addEmployeePage,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-LIST-01', 'Search By Exact Employee Name', env.baseURL, page);
  const employee = uniqueEmployeeName('QaListSearch');

  report.step(`Buat employee baru "${employee.firstName} ${employee.lastName}" sebagai data uji`);
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 15_000 });

  report.step('Navigate ke Employee List, search by nama yang baru dibuat');
  await employeeListPage.goto();
  await employeeListPage.employeeNameFilter.fill(employee.firstName);
  await page.getByRole('option', { name: new RegExp(employee.firstName) }).first().click();
  await employeeListPage.search();

  report.step('Verify hasil search menampilkan employee yang dicari');
  report.check(
    'Baris hasil search mengandung nama employee',
    await isVisibleWithWait(page.getByText(employee.lastName)),
  );

  report.print();
});
