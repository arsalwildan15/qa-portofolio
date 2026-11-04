/**
 * ================================================================================
 * TC-PIM-REPORT-04: Verify Save Without Display Field Silently No-Ops
 * Modul    : PIM - Reports
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORT-04-Verify-Save-Without-Display-Field-Silently-No-Ops.spec.ts
 * Path     : tests/pim/reports/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan temuan: mengisi Report Name tapi TIDAK menambah
 *   Display Field sama sekali (via tombol "+"), lalu klik Save, TIDAK
 *   mengirim POST dan TIDAK menampilkan pesan error apa pun (silent
 *   no-op). Ini UX issue: user tidak tahu kenapa Save "tidak bereaksi".
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/reports/TC-PIM-REPORT-04-Verify-Save-Without-Display-Field-Silently-No-Ops.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-PIM-REPORT-04: saving without a display field does not submit and shows no error', async ({
  page,
  pimReportsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORT-04', 'Save Without Display Field Silently No-Ops', env.baseURL, page);
  const reportName = uniqueName('QaNoDisplayField');

  let saveRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/pim/reports/defined')) saveRequestFired = true;
  });

  report.step('Isi Report Name saja (TANPA menambah Display Field), klik Save');
  await pimReportsPage.gotoAddForm();
  await pimReportsPage.reportNameInput.waitFor({ state: 'visible' });
  await pimReportsPage.reportNameInput.fill(reportName);
  await pimReportsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify: save tidak terkirim, dan verify ada/tidaknya pesan error terlihat');
  report.check('POST reports/defined TIDAK terkirim (dikonfirmasi: Display Field wajib)', saveRequestFired === false);
  const errorCount = await pimReportsPage.fieldErrors.count();
  report.finding(
    'Pesan error saat Save tanpa Display Field',
    errorCount > 0
      ? `Ada ${errorCount} pesan error terlihat (lebih baik dari dugaan awal).`
      : 'TIDAK ADA pesan error terlihat sama sekali: silent no-op, form tetap di halaman yang sama tanpa penjelasan ke user.',
  );

  report.print();
});
