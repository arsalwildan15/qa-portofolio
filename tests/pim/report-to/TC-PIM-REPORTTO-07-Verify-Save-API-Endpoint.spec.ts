/**
 * ================================================================================
 * TC-PIM-REPORTTO-07 — Verify Save API Endpoint
 * Modul    : PIM - Report-to
 * Kategori : Positive (+) [API VERIFICATION]
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTTO-07-Verify-Save-API-Endpoint.spec.ts
 * Path     : tests/pim/report-to/
 * ================================================================================
 *
 * TUJUAN:
 *   Mengidentifikasi dan memverifikasi endpoint POST yang sesungguhnya
 *   terpanggil saat menyimpan Supervisor baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/report-to/TC-PIM-REPORTTO-07-Verify-Save-API-Endpoint.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-REPORTTO-07: save supervisor hits the expected POST endpoint', async ({
  page,
  addEmployeePage,
  reportToPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PIM-REPORTTO-07', 'Save API Endpoint', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Report-to');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaRepApi');
  await reportToPage.goto(empNumber);

  report.step('Tambah Admin sebagai Supervisor, intercept semua POST, klik Save');
  await reportToPage.openAddSupervisor();
  await reportToPage.nameAutocomplete.waitFor({ state: 'visible' });
  await reportToPage.nameAutocomplete.fill('a');
  const adminOption = page.getByRole('option').first();
  await adminOption.waitFor({ state: 'visible', timeout: 25_000 });
  await adminOption.click();
  await reportToPage.selectDropdownOption(reportToPage.reportingMethodSelect, 'Direct');

  let capturedUrl = '';
  let capturedStatus = 0;
  page.on('response', (r) => {
    if (r.request().method() === 'POST' && r.url().includes(`/employees/${empNumber}/`) && r.url().includes('report')) {
      capturedUrl = r.url();
      capturedStatus = r.status();
    }
  });
  await reportToPage.save();
  await page.waitForTimeout(2000);

  report.step('Verify endpoint ter-capture dan status sukses');
  report.check('[API] POST report-to endpoint terpanggil dengan status 200', capturedStatus === 200, `url=${capturedUrl} status=${capturedStatus}`);

  report.print();
});
