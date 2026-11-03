/**
 * ================================================================================
 * TC-PIM-REPORTTO-06 — Verify Both Lists Render Independently
 * Modul    : PIM - Report-to
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTTO-06-Verify-Both-Lists-Render-Independently.spec.ts
 * Path     : tests/pim/report-to/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Supervisor TIDAK ikut muncul di daftar
 *   Subordinates (dan sebaliknya) — kedua list independen, bukan
 *   gabungan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/report-to/TC-PIM-REPORTTO-06-Verify-Both-Lists-Render-Independently.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-REPORTTO-06: adding a supervisor does not populate the subordinates list', async ({
  page,
  addEmployeePage,
  reportToPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PIM-REPORTTO-06', 'Both Lists Render Independently', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Report-to');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaRepIndep');
  await reportToPage.goto(empNumber);

  report.step('Tambah 1 Supervisor (opsi pertama dari pencarian "a")');
  await reportToPage.openAddSupervisor();
  await reportToPage.nameAutocomplete.waitFor({ state: 'visible' });
  await reportToPage.nameAutocomplete.fill('a');
  const firstOption = page.getByRole('option').first();
  await firstOption.waitFor({ state: 'visible', timeout: 25_000 });
  const selectedName = (await firstOption.textContent())?.trim() ?? '';
  await firstOption.click();
  await reportToPage.selectDropdownOption(reportToPage.reportingMethodSelect, 'Direct');
  await reportToPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify Supervisors berisi 1 baris, Subordinates tetap 0');
  report.check(
    `"${selectedName}" muncul di Supervisors`,
    await isVisibleWithWait(page.getByText(selectedName, { exact: false }).first()),
  );
  report.check('Subordinates tetap 0 baris', (await reportToPage.subordinateRows.count()) === 0);

  report.print();
});
