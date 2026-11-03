/**
 * ================================================================================
 * TC-PIM-MEMBERSHIP-07 — Verify Save API Endpoint
 * Modul    : PIM - Memberships
 * Kategori : Positive (+) [API VERIFICATION]
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-MEMBERSHIP-07-Verify-Save-API-Endpoint.spec.ts
 * Path     : tests/pim/memberships/
 * ================================================================================
 *
 * TUJUAN:
 *   Mengidentifikasi dan memverifikasi endpoint POST yang sesungguhnya
 *   terpanggil saat menyimpan Membership baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/memberships/TC-PIM-MEMBERSHIP-07-Verify-Save-API-Endpoint.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-MEMBERSHIP-07: save membership hits the expected POST endpoint', async ({
  page,
  addEmployeePage,
  membershipsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-MEMBERSHIP-07', 'Save API Endpoint', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Memberships');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaMemApi');
  await membershipsPage.goto(empNumber);

  report.step('Isi field wajib, intercept POST, klik Save');
  await membershipsPage.addButton.click();
  await membershipsPage.membershipSelect.waitFor({ state: 'visible' });
  await membershipsPage.selectDropdownOption(membershipsPage.membershipSelect, 'ACCA');
  await membershipsPage.selectDropdownOption(membershipsPage.subscriptionPaidBySelect, 'Company');
  await membershipsPage.selectDropdownOption(membershipsPage.currencySelect, 'Euro');
  await membershipsPage.subscriptionAmountInput.fill('250000');

  let capturedUrl = '';
  let capturedStatus = 0;
  page.on('response', (r) => {
    if (r.request().method() === 'POST' && r.url().includes(`/employees/${empNumber}/`) && r.url().includes('membership')) {
      capturedUrl = r.url();
      capturedStatus = r.status();
    }
  });
  await membershipsPage.save();
  await page.waitForTimeout(2000);

  report.step('Verify endpoint ter-capture dan status sukses');
  report.check(
    '[API] POST membership endpoint terpanggil dengan status 200',
    capturedStatus === 200,
    `url=${capturedUrl} status=${capturedStatus}`,
  );

  report.print();
});
