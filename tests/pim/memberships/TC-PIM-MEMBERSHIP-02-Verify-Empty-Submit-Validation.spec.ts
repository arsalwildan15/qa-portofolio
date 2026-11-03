/**
 * ================================================================================
 * TC-PIM-MEMBERSHIP-02 — Verify Empty Submit Validation
 * Modul    : PIM - Memberships
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-MEMBERSHIP-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/pim/memberships/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit modal Add Membership kosong menampilkan
 *   validasi required, request simpan tidak terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/memberships/TC-PIM-MEMBERSHIP-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-MEMBERSHIP-02: empty submit shows required validation', async ({
  page,
  addEmployeePage,
  membershipsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-MEMBERSHIP-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Memberships');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaMemEmpty');
  await membershipsPage.goto(empNumber);

  let saveRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('membership')) saveRequestFired = true;
  });

  report.step('Klik "+ Add", langsung klik Save tanpa isi apapun');
  await membershipsPage.addButton.click();
  await membershipsPage.membershipSelect.waitFor({ state: 'visible' });
  await membershipsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify validasi muncul dan save tidak terkirim');
  const errorCount = await membershipsPage.fieldErrors.count();
  report.check('count(error) > 0', errorCount > 0, `count=${errorCount}`);
  report.check('POST membership TIDAK terkirim', saveRequestFired === false);

  report.print();
});
