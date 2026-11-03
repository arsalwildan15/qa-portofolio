/**
 * ================================================================================
 * TC-PIM-IMMIGRATION-05 — Verify SQL Injection In Comments
 * Modul    : PIM - Immigration
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-IMMIGRATION-05-Verify-SQL-Injection-In-Comments.spec.ts
 * Path     : tests/pim/immigration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di Comments tidak membuat server
 *   crash. [TEMUAN] Dipindah dari "Issued By" (ternyata dropdown, bukan
 *   text input) ke Comments — lihat catatan di TC-PIM-IMMIGRATION-04.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/immigration/TC-PIM-IMMIGRATION-05-Verify-SQL-Injection-In-Comments.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-IMMIGRATION-05: SQL injection in Comments does not crash the server', async ({
  page,
  addEmployeePage,
  immigrationPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-IMMIGRATION-05', 'SQL Injection In Comments', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Immigration');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaImmSqli');
  await immigrationPage.goto(empNumber);

  report.step(`Pilih Passport, Comments = "' OR '1'='1", klik Save`);
  await immigrationPage.addButton.click();
  await immigrationPage.passportRadio.waitFor({ state: 'attached' });
  await immigrationPage.clickPassportRadio();
  await immigrationPage.commentsInput.fill("' OR '1'='1");
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
