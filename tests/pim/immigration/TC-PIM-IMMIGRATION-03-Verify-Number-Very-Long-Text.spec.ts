/**
 * ================================================================================
 * TC-PIM-IMMIGRATION-03 — Verify Number Very Long Text
 * Modul    : PIM - Immigration
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-IMMIGRATION-03-Verify-Number-Very-Long-Text.spec.ts
 * Path     : tests/pim/immigration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Number (passport/visa) dengan 300 karakter tidak
 *   membuat server crash.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/immigration/TC-PIM-IMMIGRATION-03-Verify-Number-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-IMMIGRATION-03: number with 300 characters does not crash the server', async ({
  page,
  addEmployeePage,
  immigrationPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-IMMIGRATION-03', 'Number Very Long Text', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Immigration');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaImmLong');
  await immigrationPage.goto(empNumber);

  report.step('Pilih Passport, Number = 300x "1", klik Save');
  await immigrationPage.addButton.click();
  await immigrationPage.passportRadio.waitFor({ state: 'attached' });
  await immigrationPage.clickPassportRadio();
  await immigrationPage.numberInput.fill('1'.repeat(300));
  let serverErrorStatus: number | null = null;
  page.on('response', (r) => {
    if (r.status() >= 500) serverErrorStatus = r.status();
  });
  await immigrationPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify server tidak crash');
  report.check('Tidak ada response 5xx', serverErrorStatus === null, `status=${serverErrorStatus}`);

  report.print();
});
