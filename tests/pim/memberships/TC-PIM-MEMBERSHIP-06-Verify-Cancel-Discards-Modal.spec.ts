/**
 * ================================================================================
 * TC-PIM-MEMBERSHIP-06 — Verify Cancel Discards Modal
 * Modul    : PIM - Memberships
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-MEMBERSHIP-06-Verify-Cancel-Discards-Modal.spec.ts
 * Path     : tests/pim/memberships/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel di modal Add Membership membatalkan input
 *   — data TIDAK tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/memberships/TC-PIM-MEMBERSHIP-06-Verify-Cancel-Discards-Modal.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-MEMBERSHIP-06: cancel button discards the modal without saving', async ({
  page,
  addEmployeePage,
  membershipsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-MEMBERSHIP-06', 'Cancel Discards Modal', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Memberships');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaMemCancel');
  await membershipsPage.goto(empNumber);

  report.step('Klik "+ Add", pilih Membership, klik Cancel (bukan Save)');
  await membershipsPage.addButton.click();
  await membershipsPage.membershipSelect.waitFor({ state: 'visible' });
  await membershipsPage.selectDropdownOption(membershipsPage.membershipSelect, 'ACCA');
  await membershipsPage.cancelButton.click();
  await page.waitForTimeout(1000);

  report.step('Verify tidak ada baris Membership baru tertambah');
  report.check('Jumlah baris tabel tetap 0', (await membershipsPage.tableRows.count()) === 0);

  report.print();
});
