/**
 * ================================================================================
 * TC-PIM-REPORTTO-04 — Verify NonExistent Name Search
 * Modul    : PIM - Report-to
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTTO-04-Verify-NonExistent-Name-Search.spec.ts
 * Path     : tests/pim/report-to/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mencari nama employee yang tidak ada di autocomplete
 *   Name tidak menghasilkan opsi apapun untuk dipilih, dan submit tanpa
 *   memilih opsi tetap diblokir validasi required (karena nilai field
 *   belum ter-set secara resmi meski ada teks di input).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/report-to/TC-PIM-REPORTTO-04-Verify-NonExistent-Name-Search.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-REPORTTO-04: searching a non-existent name yields no option and blocks submit', async ({
  page,
  addEmployeePage,
  reportToPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORTTO-04', 'NonExistent Name Search', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Report-to');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaRepNoName');
  await reportToPage.goto(empNumber);

  report.step('Klik "+ Add" Supervisors, cari nama acak "ZzNoSuchEmployeeXyz", tunggu hasil pencarian');
  await reportToPage.openAddSupervisor();
  await reportToPage.nameAutocomplete.waitFor({ state: 'visible' });
  await reportToPage.nameAutocomplete.fill('ZzNoSuchEmployeeXyz');
  await page.waitForTimeout(2000);

  report.step('Verify tidak ada opsi hasil nyata (selain "No Matching Options"), klik Save tetap diblokir');
  const realOptions = await page.getByRole('option').filter({ hasText: 'ZzNoSuchEmployeeXyz' }).count();
  report.check('Tidak ada opsi yang cocok dengan nama acak', realOptions === 0, `count=${realOptions}`);

  await reportToPage.save();
  await page.waitForTimeout(800);
  const errorCount = await reportToPage.fieldErrors.count();
  report.check('Validasi required tetap muncul (Name belum ter-set resmi)', errorCount > 0, `count=${errorCount}`);

  report.print();
});
