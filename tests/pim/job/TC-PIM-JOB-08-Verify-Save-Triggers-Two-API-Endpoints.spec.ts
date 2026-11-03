/**
 * ================================================================================
 * TC-PIM-JOB-08 — Verify Save Triggers Two API Endpoints
 * Modul    : PIM - Job
 * Kategori : Positive (+) [API VERIFICATION]
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-JOB-08-Verify-Save-Triggers-Two-API-Endpoints.spec.ts
 * Path     : tests/pim/job/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan dan memverifikasi bahwa 1 klik Save di tab Job
 *   memicu DUA PUT request sekaligus: /job-details dan
 *   /employment-contract (dikonfirmasi langsung — bukan 1 endpoint
 *   gabungan seperti dugaan awal).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/job/TC-PIM-JOB-08-Verify-Save-Triggers-Two-API-Endpoints.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-JOB-08: save triggers both job-details and employment-contract endpoints', async ({
  page,
  addEmployeePage,
  jobPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-JOB-08', 'Save Triggers Two API Endpoints', env.baseURL, page);
  const employee = uniqueEmployeeName('QaJobTwoApi');

  report.step('Buat employee baru, navigate ke tab Job');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;
  await jobPage.goto(empNumber);

  report.step('Klik Save, intercept kedua PUT request');
  const [jobDetailsResp, contractResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/job-details') && r.request().method() === 'PUT'),
    page.waitForResponse((r) => r.url().includes('/employment-contract') && r.request().method() === 'PUT'),
    jobPage.save(),
  ]);

  report.step('Verify kedua endpoint merespon 200');
  report.check('[API] PUT /job-details status === 200', jobDetailsResp.status() === 200, `status=${jobDetailsResp.status()}`);
  report.check(
    '[API] PUT /employment-contract status === 200',
    contractResp.status() === 200,
    `status=${contractResp.status()}`,
  );

  report.finding(
    'Save Job memicu 2 endpoint sekaligus',
    'Berbeda dari Contact Details (1 endpoint) atau Add Employee (1 endpoint), Save di tab Job memanggil PUT job-details DAN PUT employment-contract secara bersamaan.',
  );

  report.print();
});
