/**
 * ================================================================================
 * TC-PIM-MEMBERSHIP-05 — Verify Renewal Date Before Commence Date
 * Modul    : PIM - Memberships
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-MEMBERSHIP-05-Verify-Renewal-Date-Before-Commence-Date.spec.ts
 * Path     : tests/pim/memberships/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Subscription Renewal Date diisi LEBIH AWAL dari
 *   Subscription Commence Date (logis janggal) — apakah ada validasi
 *   urutan tanggal atau diterima begitu saja. Hasil didokumentasikan
 *   sebagai observasi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/memberships/TC-PIM-MEMBERSHIP-05-Verify-Renewal-Date-Before-Commence-Date.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-MEMBERSHIP-05: renewal date before commence date behavior is documented', async ({
  page,
  addEmployeePage,
  membershipsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-MEMBERSHIP-05', 'Renewal Date Before Commence Date', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Memberships');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaMemDateOrder');
  await membershipsPage.goto(empNumber);

  report.step('Isi Commence Date = 2025-01-01, Renewal Date = 2020-01-01 (lebih awal), klik Save');
  await membershipsPage.addButton.click();
  await membershipsPage.membershipSelect.waitFor({ state: 'visible' });
  await membershipsPage.selectDropdownOption(membershipsPage.membershipSelect, 'ACCA');
  await membershipsPage.selectDropdownOption(membershipsPage.subscriptionPaidBySelect, 'Company');
  await membershipsPage.selectDropdownOption(membershipsPage.currencySelect, 'Euro');
  await membershipsPage.subscriptionAmountInput.fill('100000');
  await membershipsPage.commenceDateInput.fill('2025-01-01');
  await membershipsPage.renewalDateInput.fill('2020-01-01');
  let serverErrorStatus: number | null = null;
  page.on('response', (r) => {
    if (r.status() >= 500) serverErrorStatus = r.status();
  });
  await membershipsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify server tidak crash, catat apakah ada validasi urutan tanggal');
  report.check('Tidak ada response 5xx', serverErrorStatus === null, `status=${serverErrorStatus}`);
  const errorCount = await membershipsPage.fieldErrors.count();
  report.finding(
    'Validasi urutan Commence/Renewal Date',
    errorCount > 0
      ? 'Ada validasi yang menolak Renewal Date sebelum Commence Date.'
      : 'Renewal Date sebelum Commence Date DITERIMA tanpa validasi logis urutan tanggal.',
  );

  report.print();
});
