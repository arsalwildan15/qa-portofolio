/**
 * ================================================================================
 * TC-PIM-REPORTTO-05 — Verify Cancel Discards Modal
 * Modul    : PIM - Report-to
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTTO-05-Verify-Cancel-Discards-Modal.spec.ts
 * Path     : tests/pim/report-to/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel di modal Add Supervisor membatalkan input
 *   — tidak ada supervisor baru yang tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/report-to/TC-PIM-REPORTTO-05-Verify-Cancel-Discards-Modal.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-REPORTTO-05: cancel button discards the modal without saving', async ({
  page,
  addEmployeePage,
  reportToPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PIM-REPORTTO-05', 'Cancel Discards Modal', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Report-to');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaRepCancel');
  await reportToPage.goto(empNumber);

  report.step('Klik "+ Add" Supervisors, cari "a", pilih opsi, klik Cancel (bukan Save)');
  await reportToPage.openAddSupervisor();
  await reportToPage.nameAutocomplete.waitFor({ state: 'visible' });
  await reportToPage.nameAutocomplete.fill('a');
  const adminOption = page.getByRole('option').first();
  await adminOption.waitFor({ state: 'visible', timeout: 25_000 });
  await adminOption.click();
  await reportToPage.cancelButton.click();
  await page.waitForTimeout(1000);

  report.step('Verify tidak ada baris Supervisor baru tertambah');
  report.check(
    'Jumlah baris Assigned Supervisors tetap 0',
    (await reportToPage.supervisorRows.count()) === 0,
  );

  report.print();
});
