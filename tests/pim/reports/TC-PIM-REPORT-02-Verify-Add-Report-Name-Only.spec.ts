/**
 * ================================================================================
 * TC-PIM-REPORT-02: Verify Add Report With Required Fields
 * Modul    : PIM - Reports
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORT-02-Verify-Add-Report-Name-Only.spec.ts
 * Path     : tests/pim/reports/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi membuat report baru dengan Report Name + minimal 1
 *   Display Field (Group "Personal" > Field pertama, ditambahkan via
 *   tombol "+") berhasil tersimpan.
 *
 * [TEMUAN] Dugaan awal "Report Name satu-satunya field required, Display
 * Fields opsional" TERNYATA SALAH: dikonfirmasi live, klik Save dengan
 * hanya Report Name terisi TIDAK mengirim POST sama sekali (silent no-op,
 * tanpa pesan error terlihat); minimal 1 Display Field WAJIB ditambahkan
 * dulu via tombol "+" sebelum Save benar-benar submit.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/reports/TC-PIM-REPORT-02-Verify-Add-Report-Name-Only.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-PIM-REPORT-02: adding a report with name and one display field succeeds', async ({
  page,
  pimReportsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORT-02', 'Add Report With Required Fields', env.baseURL, page);
  const reportName = uniqueName('QaReport');

  report.step('Buka form Add Report, isi Report Name, pilih Display Field Group > Field, klik "+"');
  await pimReportsPage.gotoAddForm();
  await pimReportsPage.reportNameInput.waitFor({ state: 'visible' });
  await pimReportsPage.reportNameInput.fill(reportName);
  await pimReportsPage.selectDropdownOption(pimReportsPage.displayFieldGroupSelect, 'Personal');
  await page.waitForTimeout(500);
  await pimReportsPage.selectDropdownOption(pimReportsPage.displayFieldSelect, 'First Name');
  await page.locator('button.orangehrm-report-icon').last().click();
  await page.waitForTimeout(500);

  report.step('Klik Save, verify response sukses');
  const [saveResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/reports/defined') && r.request().method() === 'POST',
      { timeout: 10_000 },
    ),
    pimReportsPage.save(),
  ]);
  report.check('[API] status === 200', saveResp.status() === 200, `status=${saveResp.status()}`);

  report.step('Verify muncul di list');
  await pimReportsPage.goto();
  const row = pimReportsPage.rowByName(reportName);
  await row.waitFor({ state: 'visible', timeout: 10_000 });
  report.check('Report baru terlihat di list', await row.isVisible());

  report.print();
});
