/**
 * ================================================================================
 * TC-PIM-LIST-02 — Verify Search By Employee Id
 * Modul    : PIM - Employee List
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-02-Verify-Search-By-Employee-Id.spec.ts
 * Path     : tests/pim/employee-list/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi search by Employee Id (field ketik bebas, bukan autocomplete)
 *   menghasilkan baris yang ID-nya cocok.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/employee-list/TC-PIM-LIST-02-Verify-Search-By-Employee-Id.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-LIST-02: search by employee id returns matching row', async ({
  page,
  addEmployeePage,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-LIST-02', 'Search By Employee Id', env.baseURL, page);
  const employee = uniqueEmployeeName('QaListById');

  report.step('Buat employee baru, catat Employee Id auto-generated-nya');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const employeeId = await addEmployeePage.employeeIdInput.inputValue();
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 15_000 });

  report.step(`Navigate ke Employee List, search by Employee Id = "${employeeId}"`);
  await employeeListPage.goto();
  await employeeListPage.employeeIdFilter.fill(employeeId);
  await employeeListPage.search();

  report.step('Verify hasil search menampilkan employee dengan Id tersebut');
  report.check(
    'Baris hasil search mengandung Employee Id yang dicari',
    await isVisibleWithWait(page.getByText(employeeId, { exact: true })),
  );

  report.print();
});
