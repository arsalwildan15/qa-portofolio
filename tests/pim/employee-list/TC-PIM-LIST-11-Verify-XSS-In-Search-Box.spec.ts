/**
 * ================================================================================
 * TC-PIM-LIST-11 — Verify XSS In Search Box
 * Modul    : PIM - Employee List
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-11-Verify-XSS-In-Search-Box.spec.ts
 * Path     : tests/pim/employee-list/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Employee Name search box tidak memicu
 *   alert() dan GET request tetap terkirim normal (dikonfirmasi langsung:
 *   tidak ada dialog yang fire, response 200).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/employee-list/TC-PIM-LIST-11-Verify-XSS-In-Search-Box.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PIM-LIST-11: XSS payload in search box does not execute', async ({
  page,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-LIST-11', 'XSS In Search Box', env.baseURL, page);

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step('Navigate ke Employee List, isi Employee Id filter dengan payload XSS');
  await employeeListPage.goto();
  await employeeListPage.employeeIdFilter.fill("<script>alert('xss')</script>");

  report.step('Klik Search, verify tidak ada dialog alert() dan request tetap terkirim');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'GET'),
    employeeListPage.search(),
  ]);
  report.check('Tidak ada dialog alert() yang terpicu', dialogFired === false);
  report.check('[API] Response status === 200', resp.status() === 200, `status=${resp.status()}`);
  report.check(
    'count(script:has-text("alert")) === 0 di DOM',
    (await page.locator('script:has-text("alert(\'xss\')")').count()) === 0,
  );

  report.print();
});
