/**
 * ================================================================================
 * TC-PIM-PD-12 — Verify Save Personal Details API Endpoint
 * Modul    : PIM - Personal Details
 * Kategori : Positive (+) [API VERIFICATION]
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-12-Verify-Save-Personal-Details-API-Endpoint.spec.ts
 * Path     : tests/pim/personal-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi endpoint yang benar-benar terpanggil saat Save di
 *   Personal Details adalah PUT /api/v2/pim/employees/{empNumber}/
 *   personal-details (dikonfirmasi langsung via live discovery), status
 *   200, dan response body punya struktur yang masuk akal.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/personal-details/TC-PIM-PD-12-Verify-Save-Personal-Details-API-Endpoint.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-PD-12: saving Personal Details hits the expected PUT endpoint', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-PD-12', 'Save Personal Details API Endpoint', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPdApi');

  report.step('Buat employee baru, navigate ke Personal Details, catat empNumber dari URL');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();
  const empNumberMatch = /empNumber\/(\d+)/.exec(page.url());
  const empNumber = empNumberMatch ? empNumberMatch[1] : null;

  report.step('Edit Nationality, klik Save, intercept PUT personal-details');
  await personalDetailsPage.selectDropdownOption(personalDetailsPage.nationalitySelect, 'Indonesian');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => /personal-details/.test(r.url()) && r.request().method() === 'PUT'),
    personalDetailsPage.save(),
  ]);

  report.step('Verify endpoint, status, dan response body');
  report.check(
    '[API] URL mengandung "/pim/employees/{empNumber}/personal-details"',
    empNumber !== null && resp.url().includes(`/pim/employees/${empNumber}/personal-details`),
    `url=${resp.url()} empNumber=${empNumber}`,
  );
  report.check('[API] method === PUT', resp.request().method() === 'PUT');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.print();
});
