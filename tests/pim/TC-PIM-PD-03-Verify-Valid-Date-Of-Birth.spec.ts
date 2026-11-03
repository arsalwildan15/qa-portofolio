/**
 * ================================================================================
 * TC-PIM-PD-03 — Verify Valid Date Of Birth
 * Modul    : PIM - Personal Details
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-03-Verify-Valid-Date-Of-Birth.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengisi Date of Birth format valid (yyyy-dd-mm, sesuai
 *   placeholder yang dikonfirmasi langsung) berhasil tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-PD-03-Verify-Valid-Date-Of-Birth.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

test('TC-PIM-PD-03: valid Date of Birth saves successfully', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-PD-03', 'Valid Date Of Birth', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPdDob');

  report.step('Buat employee baru, navigate ke Personal Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();

  report.step('Fill Date of Birth = "1990-15-06" (format yyyy-dd-mm)');
  await personalDetailsPage.dateOfBirthInput.fill('1990-15-06');

  report.step('Klik Save, verify berhasil (status 200)');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => /personal-details/.test(r.url()) && r.request().method() === 'PUT'),
    personalDetailsPage.save(),
  ]);
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.print();
});
