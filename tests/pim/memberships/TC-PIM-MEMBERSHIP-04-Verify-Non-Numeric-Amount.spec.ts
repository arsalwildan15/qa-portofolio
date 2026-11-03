/**
 * ================================================================================
 * TC-PIM-MEMBERSHIP-04 — Verify Non Numeric Amount
 * Modul    : PIM - Memberships
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-MEMBERSHIP-04-Verify-Non-Numeric-Amount.spec.ts
 * Path     : tests/pim/memberships/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Subscription Amount diisi teks bukan angka ("abc")
 *   tidak membuat server crash.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/memberships/TC-PIM-MEMBERSHIP-04-Verify-Non-Numeric-Amount.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-MEMBERSHIP-04: non-numeric subscription amount is handled gracefully', async ({
  page,
  addEmployeePage,
  membershipsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-MEMBERSHIP-04', 'Non Numeric Amount', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Memberships');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaMemNonNum');
  await membershipsPage.goto(empNumber);

  report.step('Isi field wajib, Subscription Amount = "abc" (bukan angka), klik Save');
  await membershipsPage.addButton.click();
  await membershipsPage.membershipSelect.waitFor({ state: 'visible' });
  await membershipsPage.selectDropdownOption(membershipsPage.membershipSelect, 'ACCA');
  await membershipsPage.selectDropdownOption(membershipsPage.subscriptionPaidBySelect, 'Company');
  await membershipsPage.selectDropdownOption(membershipsPage.currencySelect, 'Euro');
  await membershipsPage.subscriptionAmountInput.fill('abc');
  let serverErrorStatus: number | null = null;
  page.on('response', (r) => {
    if (r.status() >= 500) serverErrorStatus = r.status();
  });
  await membershipsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify server tidak crash');
  report.check('Tidak ada response 5xx', serverErrorStatus === null, `status=${serverErrorStatus}`);

  report.print();
});
