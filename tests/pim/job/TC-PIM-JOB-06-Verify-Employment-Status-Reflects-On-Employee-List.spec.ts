/**
 * ================================================================================
 * TC-PIM-JOB-06 — Verify Employment Status Reflects On Employee List
 * Modul    : PIM - Job
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-JOB-06-Verify-Employment-Status-Reflects-On-Employee-List.spec.ts
 * Path     : tests/pim/job/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi perubahan Employment Status di tab Job memengaruhi kolom
 *   Employment Status yang tampil di Employee List — cross-screen check
 *   bahwa data benar-benar konsisten, bukan cuma tersimpan di satu tempat.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/job/TC-PIM-JOB-06-Verify-Employment-Status-Reflects-On-Employee-List.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-JOB-06: employment status change reflects on Employee List', async ({
  page,
  addEmployeePage,
  jobPage,
  employeeListPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-JOB-06', 'Employment Status Reflects On Employee List', env.baseURL, page);

  report.step('Buat employee baru (retry otomatis kalau Employee Id collide), navigate ke tab Job');
  const employee = await createTestEmployee(page, addEmployeePage, 'QaJobStatus');
  const { empNumber } = employee;
  await jobPage.goto(empNumber);

  report.step('Ubah Employment Status ke "Full-Time Permanent", Save');
  await jobPage.employmentStatusSelect.click();
  await page.getByRole('option').filter({ hasText: 'Full-Time Permanent' }).first().click();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/job-details') && r.request().method() === 'PUT'),
    jobPage.save(),
  ]);

  report.step('Buka Employee List, search employee ini, verify kolom Employment Status');
  await employeeListPage.goto();
  await employeeListPage.employeeNameFilter.fill(`${employee.firstName} ${employee.lastName}`);
  await page.getByRole('option').filter({ hasText: employee.firstName }).first().click().catch(() => {});
  await employeeListPage.search();
  await page.waitForTimeout(1500);

  report.check(
    'Kolom Employment Status menampilkan "Full-Time Permanent"',
    await isVisibleWithWait(page.getByText('Full-Time Permanent')),
  );

  report.print();
});
