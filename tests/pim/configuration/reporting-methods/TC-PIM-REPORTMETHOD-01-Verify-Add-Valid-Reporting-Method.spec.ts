/**
 * ================================================================================
 * TC-PIM-REPORTMETHOD-01: Verify Add Valid Reporting Method
 * Modul    : PIM - Configuration - Reporting Methods
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTMETHOD-01-Verify-Add-Valid-Reporting-Method.spec.ts
 * Path     : tests/pim/configuration/reporting-methods/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Reporting Method baru dengan Name valid
 *   berhasil tersimpan dan muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/reporting-methods/TC-PIM-REPORTMETHOD-01-Verify-Add-Valid-Reporting-Method.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { uniqueName } from '../../../../src/data/testData';

test('TC-PIM-REPORTMETHOD-01: adding a valid reporting method succeeds', async ({
  page,
  reportingMethodsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORTMETHOD-01', 'Add Valid Reporting Method', env.baseURL, page);
  const name = uniqueName('QaReportMethod');

  report.step('Buka Reporting Methods, klik Add, isi Name');
  await reportingMethodsPage.goto();
  await reportingMethodsPage.addButton.click();
  await reportingMethodsPage.nameInput.waitFor({ state: 'visible' });
  await reportingMethodsPage.nameInput.fill(name);

  report.step('Klik Save, verify response sukses');
  const [saveResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/reporting-methods') && r.request().method() === 'POST',
      { timeout: 10_000 },
    ),
    reportingMethodsPage.save(),
  ]);
  report.check('[API] status === 200', saveResp.status() === 200, `status=${saveResp.status()}`);

  report.step('Verify muncul di list');
  await reportingMethodsPage.goto();
  const row = reportingMethodsPage.rowByName(name);
  await row.waitFor({ state: 'visible', timeout: 10_000 });
  report.check('Reporting method baru terlihat di list', await row.isVisible());

  report.print();
});
