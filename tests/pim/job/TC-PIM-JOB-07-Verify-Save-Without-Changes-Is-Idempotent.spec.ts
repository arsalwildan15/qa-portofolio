/**
 * ================================================================================
 * TC-PIM-JOB-07 — Verify Save Without Changes Is Idempotent
 * Modul    : PIM - Job
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-JOB-07-Verify-Save-Without-Changes-Is-Idempotent.spec.ts
 * Path     : tests/pim/job/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Save langsung tanpa mengubah apapun di tab Job
 *   tetap berhasil (200), bukan error atau no-op yang menampilkan pesan
 *   aneh.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/job/TC-PIM-JOB-07-Verify-Save-Without-Changes-Is-Idempotent.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-JOB-07: saving without any change is idempotent', async ({
  page,
  addEmployeePage,
  jobPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-JOB-07', 'Save Without Changes Is Idempotent', env.baseURL, page);
  const employee = uniqueEmployeeName('QaJobIdempotent');

  report.step('Buat employee baru, navigate ke tab Job');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;
  await jobPage.goto(empNumber);

  report.step('Langsung klik Save tanpa mengubah field apapun');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/job-details') && r.request().method() === 'PUT'),
    jobPage.save(),
  ]);

  report.step('Verify save tetap sukses');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.print();
});
