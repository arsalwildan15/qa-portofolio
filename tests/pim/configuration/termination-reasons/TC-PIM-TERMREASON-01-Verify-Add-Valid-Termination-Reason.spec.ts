/**
 * ================================================================================
 * TC-PIM-TERMREASON-01: Verify Add Valid Termination Reason
 * Modul    : PIM - Configuration - Termination Reasons
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-TERMREASON-01-Verify-Add-Valid-Termination-Reason.spec.ts
 * Path     : tests/pim/configuration/termination-reasons/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Termination Reason baru dengan Name valid
 *   berhasil tersimpan dan muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/termination-reasons/TC-PIM-TERMREASON-01-Verify-Add-Valid-Termination-Reason.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { uniqueName } from '../../../../src/data/testData';

test('TC-PIM-TERMREASON-01: adding a valid termination reason succeeds', async ({
  page,
  terminationReasonsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-TERMREASON-01', 'Add Valid Termination Reason', env.baseURL, page);
  const name = uniqueName('QaTermReason');

  report.step('Buka Termination Reasons, klik Add, isi Name');
  await terminationReasonsPage.goto();
  await terminationReasonsPage.addButton.click();
  await terminationReasonsPage.nameInput.waitFor({ state: 'visible' });
  await terminationReasonsPage.nameInput.fill(name);

  report.step('Klik Save, verify response sukses');
  const [saveResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/termination-reasons') && r.request().method() === 'POST',
      { timeout: 10_000 },
    ),
    terminationReasonsPage.save(),
  ]);
  report.check('[API] status === 200', saveResp.status() === 200, `status=${saveResp.status()}`);

  report.step('Verify muncul di list');
  await terminationReasonsPage.goto();
  const row = terminationReasonsPage.rowByName(name);
  await row.waitFor({ state: 'visible', timeout: 10_000 });
  report.check('Termination reason baru terlihat di list', await row.isVisible());

  report.print();
});
