/**
 * ================================================================================
 * TC-PIM-QUALIFICATION-02 — Verify Empty Submit Validation
 * Modul    : PIM - Qualifications
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-QUALIFICATION-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/pim/qualifications/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit modal Add Work Experience kosong menampilkan
 *   validasi required, request simpan tidak terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/qualifications/TC-PIM-QUALIFICATION-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-QUALIFICATION-02: empty submit shows required validation', async ({
  page,
  addEmployeePage,
  qualificationsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-QUALIFICATION-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Qualifications');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaQualEmpty');
  await qualificationsPage.goto(empNumber);

  let saveRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('work-experience')) saveRequestFired = true;
  });

  report.step('Klik "+ Add" (Work Experience), langsung klik Save tanpa isi apapun');
  await qualificationsPage.openAddWorkExperience();
  await qualificationsPage.companyInput.waitFor({ state: 'visible' });
  await qualificationsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify validasi muncul dan save tidak terkirim');
  const errorCount = await qualificationsPage.fieldErrors.count();
  report.check('count(error) > 0', errorCount > 0, `count=${errorCount}`);
  report.check('POST work-experience TIDAK terkirim', saveRequestFired === false);

  report.print();
});
