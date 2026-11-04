/**
 * ================================================================================
 * TC-PIM-TERMREASON-02: Verify Empty Submit Validation
 * Modul    : PIM - Configuration - Termination Reasons
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-TERMREASON-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/pim/configuration/termination-reasons/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit modal Add Termination Reason kosong menampilkan
 *   validasi required, request simpan tidak terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/termination-reasons/TC-PIM-TERMREASON-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

test('TC-PIM-TERMREASON-02: empty submit shows required validation', async ({
  page,
  terminationReasonsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-TERMREASON-02', 'Empty Submit Validation', env.baseURL, page);

  let saveRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('termination-reasons')) saveRequestFired = true;
  });

  report.step('Buka Termination Reasons, klik Add, langsung klik Save tanpa isi apapun');
  await terminationReasonsPage.goto();
  await terminationReasonsPage.addButton.click();
  await terminationReasonsPage.nameInput.waitFor({ state: 'visible' });
  await terminationReasonsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify validasi muncul dan save tidak terkirim');
  const errorCount = await terminationReasonsPage.fieldErrors.count();
  report.check('count(error) > 0', errorCount > 0, `count=${errorCount}`);
  report.check('POST termination-reasons TIDAK terkirim', saveRequestFired === false);

  report.print();
});
