/**
 * ================================================================================
 * TC-PIM-IMMIGRATION-08 — Verify Save API Endpoint
 * Modul    : PIM - Immigration
 * Kategori : Positive (+) [API VERIFICATION]
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-IMMIGRATION-08-Verify-Save-API-Endpoint.spec.ts
 * Path     : tests/pim/immigration/
 * ================================================================================
 *
 * TUJUAN:
 *   Mengidentifikasi dan memverifikasi endpoint POST yang sesungguhnya
 *   terpanggil saat menyimpan record Immigration baru, beserta status
 *   code dan response body-nya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/immigration/TC-PIM-IMMIGRATION-08-Verify-Save-API-Endpoint.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-IMMIGRATION-08: save immigration record hits the expected POST endpoint', async ({
  page,
  addEmployeePage,
  immigrationPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-IMMIGRATION-08', 'Save API Endpoint', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Immigration');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaImmApi');
  await immigrationPage.goto(empNumber);

  report.step('Pilih Passport, Number "API-TEST-001", intercept POST, klik Save');
  await immigrationPage.addButton.click();
  await immigrationPage.passportRadio.waitFor({ state: 'attached' });
  await immigrationPage.clickPassportRadio();
  await immigrationPage.numberInput.fill('API-TEST-001');

  let capturedUrl = '';
  let capturedStatus = 0;
  page.on('response', (r) => {
    if (r.request().method() === 'POST' && r.url().includes(`/employees/${empNumber}/`) && r.url().includes('immigration')) {
      capturedUrl = r.url();
      capturedStatus = r.status();
    }
  });
  await immigrationPage.save();
  await page.waitForTimeout(2000);

  report.step('Verify endpoint dan response');
  report.check(
    '[API] POST immigration endpoint terpanggil dengan status 200',
    capturedStatus === 200,
    `url=${capturedUrl} status=${capturedStatus}`,
  );

  report.print();
});
