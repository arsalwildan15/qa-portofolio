/**
 * ================================================================================
 * TC-PIM-IMMIGRATION-04 — Verify XSS In Comments
 * Modul    : PIM - Immigration
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-IMMIGRATION-04-Verify-XSS-In-Comments.spec.ts
 * Path     : tests/pim/immigration/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di field Comments tidak pernah tereksekusi.
 *   [TEMUAN] TC ini semula ditarget ke "Issued By", tapi verifikasi live
 *   (screenshot kegagalan pertama) menunjukkan "Issued By" sebenarnya
 *   DROPDOWN, bukan text input — kebalikan dari "Eligible Status" yang
 *   text input. Payload XSS dipindah ke Comments (textarea, benar-benar
 *   free text).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/immigration/TC-PIM-IMMIGRATION-04-Verify-XSS-In-Comments.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-IMMIGRATION-04: XSS payload in Comments is not executed', async ({
  page,
  addEmployeePage,
  immigrationPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-IMMIGRATION-04', 'XSS In Comments', env.baseURL, page);

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step('Buat employee baru, navigate ke Immigration');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaImmXss');
  await immigrationPage.goto(empNumber);

  report.step(`Pilih Passport, Comments = "<script>alert('xss')</script>", klik Save`);
  await immigrationPage.addButton.click();
  await immigrationPage.passportRadio.waitFor({ state: 'attached' });
  await immigrationPage.clickPassportRadio();
  await immigrationPage.commentsInput.fill("<script>alert('xss')</script>");
  await immigrationPage.save();
  await page.reload();
  await page.waitForTimeout(1500);

  report.step('Verify tidak ada dialog alert() yang terpicu');
  report.check('Tidak ada dialog alert() yang terpicu', dialogFired === false);

  report.print();
});
