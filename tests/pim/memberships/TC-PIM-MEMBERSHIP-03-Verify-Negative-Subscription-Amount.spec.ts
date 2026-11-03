/**
 * ================================================================================
 * TC-PIM-MEMBERSHIP-03 — Verify Negative Subscription Amount
 * Modul    : PIM - Memberships
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-MEMBERSHIP-03-Verify-Negative-Subscription-Amount.spec.ts
 * Path     : tests/pim/memberships/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Subscription Amount diisi angka negatif — apakah ada
 *   validasi logis atau diterima begitu saja. Hasil didokumentasikan
 *   sebagai observasi (sama pola dengan TC-PIM-SALARY-03).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/memberships/TC-PIM-MEMBERSHIP-03-Verify-Negative-Subscription-Amount.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-MEMBERSHIP-03: negative subscription amount behavior is documented', async ({
  page,
  addEmployeePage,
  membershipsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-MEMBERSHIP-03', 'Negative Subscription Amount', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Memberships');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaMemNeg');
  await membershipsPage.goto(empNumber);

  report.step('Isi field wajib, Subscription Amount = "-500" (negatif), klik Save');
  await membershipsPage.addButton.click();
  await membershipsPage.membershipSelect.waitFor({ state: 'visible' });
  await membershipsPage.selectDropdownOption(membershipsPage.membershipSelect, 'ACCA');
  await membershipsPage.selectDropdownOption(membershipsPage.subscriptionPaidBySelect, 'Company');
  await membershipsPage.selectDropdownOption(membershipsPage.currencySelect, 'Euro');
  await membershipsPage.subscriptionAmountInput.fill('-500');
  let serverErrorStatus: number | null = null;
  page.on('response', (r) => {
    if (r.status() >= 500) serverErrorStatus = r.status();
  });
  await membershipsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify server tidak crash, catat apakah ada validasi angka negatif');
  report.check('Tidak ada response 5xx', serverErrorStatus === null, `status=${serverErrorStatus}`);
  const errorCount = await membershipsPage.fieldErrors.count();
  report.finding(
    'Validasi Subscription Amount negatif',
    errorCount > 0
      ? 'Ada validasi yang menolak Amount negatif.'
      : 'Subscription Amount "-500" DITERIMA tanpa validasi logis.',
  );

  report.print();
});
