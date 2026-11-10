/**
 * ================================================================================
 * TC-ADMIN-LANGPACK-04: Verify Cancel Discards Add Dialog
 * Modul    : Admin - Configuration - Language Packages
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LANGPACK-04-Verify-Cancel-Discards.spec.ts
 * Path     : tests/admin/language-packages/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Cancel pada dialog Add membatalkan, jumlah baris
 *   Language Packages tidak berubah.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/language-packages/TC-ADMIN-LANGPACK-04-Verify-Cancel-Discards.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-LANGPACK-04: Cancel on Add dialog discards without saving', async ({
  page,
  adminLanguagePackagesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LANGPACK-04', 'Verify Cancel Discards', env.baseURL, page);
  const lp = adminLanguagePackagesPage;

  report.step('Buka Language Packages, catat jumlah baris, klik Add, klik Cancel');
  await lp.goto();
  const baselineCount = await lp.tableRows.count();
  await lp.addButton.click();
  await page.waitForTimeout(800);
  await lp.cancelButton.click();
  await lp.tableRows.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(500);

  report.step('Verify jumlah baris tidak berubah');
  const afterCancelCount = await lp.tableRows.count();
  report.check('Jumlah Language Package tidak berubah setelah Cancel', afterCancelCount === baselineCount, `baseline=${baselineCount} afterCancel=${afterCancelCount}`);

  report.print();
});
