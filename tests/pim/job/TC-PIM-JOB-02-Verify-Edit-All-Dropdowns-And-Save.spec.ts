/**
 * ================================================================================
 * TC-PIM-JOB-02 — Verify Edit All Dropdowns And Save
 * Modul    : PIM - Job
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-JOB-02-Verify-Edit-All-Dropdowns-And-Save.spec.ts
 * Path     : tests/pim/job/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengubah Job Category, Sub Unit, Location, dan
 *   Employment Status sekaligus lalu Save berhasil tanpa error.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/job/TC-PIM-JOB-02-Verify-Edit-All-Dropdowns-And-Save.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

async function pickFirstOption(page: import('@playwright/test').Page, select: import('@playwright/test').Locator) {
  await select.click();
  const option = page.getByRole('option').nth(1);
  await option.click();
}

test('TC-PIM-JOB-02: editing all Job dropdowns and saving succeeds', async ({
  page,
  addEmployeePage,
  jobPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-JOB-02', 'Edit All Dropdowns And Save', env.baseURL, page);
  const employee = uniqueEmployeeName('QaJobAll');

  report.step('Buat employee baru, navigate ke tab Job');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;
  await jobPage.goto(empNumber);

  report.step('Pilih opsi pertama untuk Job Category, Sub Unit, Location, Employment Status');
  await pickFirstOption(page, jobPage.jobCategorySelect);
  await pickFirstOption(page, jobPage.subUnitSelect);
  await pickFirstOption(page, jobPage.locationSelect);
  await pickFirstOption(page, jobPage.employmentStatusSelect);

  report.step('Klik Save');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/job-details') && r.request().method() === 'PUT'),
    jobPage.save(),
  ]);

  report.step('Verify save sukses tanpa error validasi');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  const errorCount = await jobPage.fieldErrors.count();
  report.check('count(error) === 0', errorCount === 0, `count=${errorCount}`);

  report.print();
});
