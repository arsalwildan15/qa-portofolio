/**
 * ================================================================================
 * TC-PIM-MEMBERSHIP-01 — Verify Add Valid Membership
 * Modul    : PIM - Memberships
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-MEMBERSHIP-01-Verify-Add-Valid-Membership.spec.ts
 * Path     : tests/pim/memberships/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Membership dengan Subscription Paid By,
 *   Amount, Currency, Commence/Renewal Date lengkap berhasil tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/memberships/TC-PIM-MEMBERSHIP-01-Verify-Add-Valid-Membership.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-MEMBERSHIP-01: add valid membership succeeds', async ({
  page,
  addEmployeePage,
  membershipsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-MEMBERSHIP-01', 'Add Valid Membership', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Memberships');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaMemValid');
  await membershipsPage.goto(empNumber);

  report.step('Klik "+ Add", pilih Membership, Paid By, Currency, isi Amount dan tanggal, klik Save');
  await membershipsPage.addButton.click();
  await membershipsPage.membershipSelect.waitFor({ state: 'visible' });
  await membershipsPage.selectDropdownOption(membershipsPage.membershipSelect, 'ACCA');
  await membershipsPage.selectDropdownOption(membershipsPage.subscriptionPaidBySelect, 'Company');
  await membershipsPage.selectDropdownOption(membershipsPage.currencySelect, 'Euro');
  await membershipsPage.subscriptionAmountInput.fill('500000');
  await membershipsPage.commenceDateInput.fill('2024-01-01');
  await membershipsPage.renewalDateInput.fill('2025-01-01');
  await membershipsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify "ACCA" muncul di tabel Memberships');
  report.check('"ACCA" muncul di tabel', await isVisibleWithWait(page.getByText('ACCA')));

  report.print();
});
