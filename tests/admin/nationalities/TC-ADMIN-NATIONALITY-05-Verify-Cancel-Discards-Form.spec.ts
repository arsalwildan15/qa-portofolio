/**
 * ================================================================================
 * TC-ADMIN-NATIONALITY-05: Verify Cancel Discards Form
 * Modul    : Admin - Nationalities
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-NATIONALITY-05-Verify-Cancel-Discards-Form.spec.ts
 * Path     : tests/admin/nationalities/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel pada form Add Nationality membatalkan
 *   isian dan kembali ke list tanpa menyimpan apa pun.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/nationalities/TC-ADMIN-NATIONALITY-05-Verify-Cancel-Discards-Form.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-NATIONALITY-05: clicking Cancel discards the Add Nationality form', async ({
  page,
  adminNationalitiesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-NATIONALITY-05', 'Cancel Discards Form', env.baseURL, page);
  const name = uniqueName('QaCancelledNationality');

  report.step('Isi Name, klik Cancel');
  await adminNationalitiesPage.gotoAdd();
  await adminNationalitiesPage.nameInput.fill(name);
  await adminNationalitiesPage.cancelButton.click();
  await page.waitForTimeout(1200);

  report.step('Verify: kembali ke list, nationality TIDAK tersimpan');
  report.check('Kembali ke list Nationalities', page.url().toLowerCase().includes('nationalit'));
  report.check(
    `Nationality "${name}" TIDAK muncul di list`,
    !(await adminNationalitiesPage.rowByName(name).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
