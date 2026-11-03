/**
 * ================================================================================
 * TC-PIM-REPORTTO-02 — Verify Empty Submit Validation
 * Modul    : PIM - Report-to
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTTO-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/pim/report-to/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit modal Add Supervisor kosong menampilkan TEPAT
 *   2 pesan "Required" (Name + Reporting Method), dikonfirmasi langsung.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/report-to/TC-PIM-REPORTTO-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-REPORTTO-02: empty submit shows two required errors', async ({
  page,
  addEmployeePage,
  reportToPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORTTO-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Report-to');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaRepEmpty');
  await reportToPage.goto(empNumber);

  let saveRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('supervisor')) saveRequestFired = true;
  });

  report.step('Klik "+ Add" Supervisors, langsung klik Save tanpa isi apapun');
  await reportToPage.openAddSupervisor();
  await reportToPage.nameAutocomplete.waitFor({ state: 'visible' });
  await reportToPage.save();
  await page.waitForTimeout(800);

  report.step('Verify 2 pesan "Required" muncul dan save tidak terkirim');
  const errors = await reportToPage.fieldErrors.allTextContents();
  report.check('count(error) === 2', errors.length === 2, `errors=${JSON.stringify(errors)}`);
  report.check('POST supervisor TIDAK terkirim', saveRequestFired === false);

  report.print();
});
