/**
 * ================================================================================
 * TC-PIM-QUALIFICATION-06 — Verify Cancel Discards Modal
 * Modul    : PIM - Qualifications
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-QUALIFICATION-06-Verify-Cancel-Discards-Modal.spec.ts
 * Path     : tests/pim/qualifications/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel di modal Add Work Experience membatalkan
 *   input — data TIDAK tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/qualifications/TC-PIM-QUALIFICATION-06-Verify-Cancel-Discards-Modal.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-QUALIFICATION-06: cancel button discards the modal without saving', async ({
  page,
  addEmployeePage,
  qualificationsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-QUALIFICATION-06', 'Cancel Discards Modal', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Qualifications');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaQualCancel');
  await qualificationsPage.goto(empNumber);

  report.step('Klik "+ Add" Work Experience, isi Company "Cancelled Co", klik Cancel');
  await qualificationsPage.openAddWorkExperience();
  await qualificationsPage.companyInput.waitFor({ state: 'visible' });
  await qualificationsPage.companyInput.fill('Cancelled Co');
  await qualificationsPage.cancelButton.click();
  await page.waitForTimeout(1000);

  report.step('Verify "Cancelled Co" TIDAK muncul di tabel');
  const count = await page.getByText('Cancelled Co').count();
  report.check('count("Cancelled Co") === 0', count === 0, `count=${count}`);

  report.print();
});
