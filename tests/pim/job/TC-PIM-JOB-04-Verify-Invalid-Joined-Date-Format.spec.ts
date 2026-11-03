/**
 * ================================================================================
 * TC-PIM-JOB-04 — Verify Invalid Joined Date Format
 * Modul    : PIM - Job
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-JOB-04-Verify-Invalid-Joined-Date-Format.spec.ts
 * Path     : tests/pim/job/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Joined Date diisi string bukan tanggal valid ditolak
 *   dengan pesan "Should be a valid date in yyyy-dd-mm format"
 *   (dikonfirmasi langsung), PUT tidak pernah terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/job/TC-PIM-JOB-04-Verify-Invalid-Joined-Date-Format.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-JOB-04: invalid joined date format is rejected', async ({
  page,
  addEmployeePage,
  jobPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-JOB-04', 'Invalid Joined Date Format', env.baseURL, page);
  const employee = uniqueEmployeeName('QaJobBadDate');

  report.step('Buat employee baru, navigate ke tab Job');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;
  await jobPage.goto(empNumber);

  let putFired = false;
  page.on('request', (req) => {
    if (req.url().includes('/job-details') && req.method() === 'PUT') putFired = true;
  });

  report.step('Fill Joined Date = "invalid-date", klik Save');
  await jobPage.joinedDateInput.fill('invalid-date');
  await jobPage.save();
  await page.waitForTimeout(1000);

  report.step('Verify validasi format muncul dan PUT tidak terkirim');
  report.check(
    'Error "Should be a valid date in yyyy-dd-mm format" visible',
    await isVisibleWithWait(page.getByText('Should be a valid date in yyyy-dd-mm format')),
  );
  report.check('PUT job-details TIDAK terkirim', putFired === false);

  report.print();
});
