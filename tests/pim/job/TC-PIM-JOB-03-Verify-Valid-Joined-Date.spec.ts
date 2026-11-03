/**
 * ================================================================================
 * TC-PIM-JOB-03 — Verify Valid Joined Date
 * Modul    : PIM - Job
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-JOB-03-Verify-Valid-Joined-Date.spec.ts
 * Path     : tests/pim/job/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengubah Joined Date ke tanggal valid format yyyy-dd-mm
 *   tersimpan sukses.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/job/TC-PIM-JOB-03-Verify-Valid-Joined-Date.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-JOB-03: valid joined date is saved successfully', async ({
  page,
  addEmployeePage,
  jobPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-JOB-03', 'Valid Joined Date', env.baseURL, page);
  const employee = uniqueEmployeeName('QaJobDate');

  report.step('Buat employee baru, navigate ke tab Job');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;
  await jobPage.goto(empNumber);

  report.step('Fill Joined Date = "2020-15-06" (format yyyy-dd-mm valid), klik Save');
  await jobPage.joinedDateInput.fill('2020-15-06');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/job-details') && r.request().method() === 'PUT'),
    jobPage.save(),
  ]);

  report.step('Verify save sukses tanpa error');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  const errorCount = await jobPage.fieldErrors.count();
  report.check('count(error) === 0', errorCount === 0, `count=${errorCount}`);

  report.print();
});
