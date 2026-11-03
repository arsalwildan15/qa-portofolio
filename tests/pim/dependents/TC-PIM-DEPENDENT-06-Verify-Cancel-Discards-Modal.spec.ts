/**
 * ================================================================================
 * TC-PIM-DEPENDENT-06 — Verify Cancel Discards Modal
 * Modul    : PIM - Dependents
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DEPENDENT-06-Verify-Cancel-Discards-Modal.spec.ts
 * Path     : tests/pim/dependents/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel di modal Add Dependent membatalkan input —
 *   data TIDAK tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/dependents/TC-PIM-DEPENDENT-06-Verify-Cancel-Discards-Modal.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-DEPENDENT-06: cancel button discards the modal without saving', async ({
  page,
  addEmployeePage,
  dependentsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-DEPENDENT-06', 'Cancel Discards Modal', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Dependents');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaDepCancel');
  await dependentsPage.goto(empNumber);

  report.step('Klik "+ Add", isi Name "Cancelled Dependent", klik Cancel');
  await dependentsPage.addButton.click();
  await dependentsPage.nameInput.waitFor({ state: 'visible' });
  await dependentsPage.nameInput.fill('Cancelled Dependent');
  await dependentsPage.cancelButton.click();
  await page.waitForTimeout(1000);

  report.step('Verify "Cancelled Dependent" TIDAK muncul di tabel');
  const count = await page.getByText('Cancelled Dependent').count();
  report.check('count("Cancelled Dependent") === 0', count === 0, `count=${count}`);

  report.print();
});
