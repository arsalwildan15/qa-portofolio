/**
 * ================================================================================
 * TC-ADMIN-LICENSE-04: Verify Cancel Discards Form
 * Modul    : Admin - Qualifications - Licenses
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LICENSE-04-Verify-Cancel-Discards-Form.spec.ts
 * Path     : tests/admin/licenses/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel pada form Add License membatalkan isian
 *   dan kembali ke list tanpa menyimpan apa pun.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/licenses/TC-ADMIN-LICENSE-04-Verify-Cancel-Discards-Form.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-LICENSE-04: clicking Cancel discards the Add License form', async ({
  page,
  adminLicensesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LICENSE-04', 'Cancel Discards Form', env.baseURL, page);
  const name = uniqueName('QaCancelledLicense');

  report.step('Isi Name, klik Cancel');
  await adminLicensesPage.gotoAdd();
  await adminLicensesPage.nameInput.fill(name);
  await adminLicensesPage.cancelButton.click();
  await page.waitForTimeout(1200);

  report.step('Verify: kembali ke list, license TIDAK tersimpan');
  report.check('Kembali ke list Licenses', page.url().includes('Licenses'));
  report.check(
    `License "${name}" TIDAK muncul di list`,
    !(await adminLicensesPage.rowByName(name).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
