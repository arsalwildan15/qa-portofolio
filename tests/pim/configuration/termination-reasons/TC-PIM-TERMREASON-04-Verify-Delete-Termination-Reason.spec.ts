/**
 * ================================================================================
 * TC-PIM-TERMREASON-04: Verify Delete Termination Reason
 * Modul    : PIM - Configuration - Termination Reasons
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-TERMREASON-04-Verify-Delete-Termination-Reason.spec.ts
 * Path     : tests/pim/configuration/termination-reasons/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menghapus Termination Reason (via icon trash +
 *   konfirmasi "Yes, Delete") berhasil, tidak lagi muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/termination-reasons/TC-PIM-TERMREASON-04-Verify-Delete-Termination-Reason.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { uniqueName } from '../../../../src/data/testData';

test('TC-PIM-TERMREASON-04: deleting a termination reason removes it from the list', async ({
  page,
  terminationReasonsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-TERMREASON-04', 'Delete Termination Reason', env.baseURL, page);
  const name = uniqueName('QaDeleteTermReason');

  report.step('Buat termination reason baru untuk dihapus');
  await terminationReasonsPage.goto();
  await terminationReasonsPage.addButton.click();
  await terminationReasonsPage.nameInput.waitFor({ state: 'visible' });
  await terminationReasonsPage.nameInput.fill(name);
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/termination-reasons') && r.request().method() === 'POST',
      { timeout: 10_000 },
    ),
    terminationReasonsPage.save(),
  ]);

  report.step('Verify muncul di list sebelum dihapus');
  await terminationReasonsPage.goto();
  const row = terminationReasonsPage.rowByName(name);
  await row.waitFor({ state: 'visible', timeout: 10_000 });
  report.check('Reason terlihat sebelum delete', await row.isVisible());

  report.step('Hapus via icon trash + konfirmasi "Yes, Delete"');
  const [deleteResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/termination-reasons') && r.request().method() === 'DELETE',
      { timeout: 10_000 },
    ),
    terminationReasonsPage.deleteRow(row),
  ]);
  report.check('[API] status === 200', deleteResp.status() === 200, `status=${deleteResp.status()}`);

  report.step('Verify tidak lagi muncul di list');
  await terminationReasonsPage.goto();
  const stillVisible = await terminationReasonsPage.rowByName(name).isVisible().catch(() => false);
  report.check('Reason sudah tidak terlihat setelah delete', stillVisible === false);

  report.print();
});
