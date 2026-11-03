/**
 * ================================================================================
 * TC-PIM-LIST-10 — Verify Reset Restores Default Filters
 * Modul    : PIM - Employee List
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-10-Verify-Reset-Restores-Default-Filters.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi tombol Reset mengosongkan kembali field Employee Id yang
 *   sudah diisi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-LIST-10-Verify-Reset-Restores-Default-Filters.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

test('TC-PIM-LIST-10: Reset button clears the Employee Id filter', async ({ page, employeeListPage }) => {
  const report = new TestReport('TC-PIM-LIST-10', 'Reset Restores Default Filters', env.baseURL, page);

  report.step('Navigate ke Employee List, isi Employee Id filter');
  await employeeListPage.goto();
  await employeeListPage.employeeIdFilter.fill('0001');

  report.step('Klik Reset, verify field Employee Id kembali kosong');
  await employeeListPage.resetButton.click();
  const valueAfterReset = await employeeListPage.employeeIdFilter.inputValue();
  report.check('Employee Id filter kosong setelah Reset', valueAfterReset === '', `value="${valueAfterReset}"`);

  report.print();
});
