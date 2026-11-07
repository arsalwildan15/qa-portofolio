/**
 * ================================================================================
 * TC-ADMIN-SHIFT-04: Verify XSS In Shift Name
 * Modul    : Admin - Work Shifts
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SHIFT-04-Verify-XSS-In-Shift-Name.spec.ts
 * Path     : tests/admin/work-shifts/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Shift Name tidak tereksekusi sebagai
 *   script saat tersimpan dan ditampilkan kembali di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/work-shifts/TC-ADMIN-SHIFT-04-Verify-XSS-In-Shift-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-SHIFT-04: an XSS payload in Shift Name does not execute', async ({
  page,
  adminWorkShiftsPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-SHIFT-04', 'XSS In Shift Name', env.baseURL, page);
  const payload = `${uniqueName('QaXss')}<script>window.__xss=true</script>`;

  report.step('Isi Shift Name dengan payload XSS, From/To valid, klik Save');
  await adminWorkShiftsPage.gotoAdd();
  await adminWorkShiftsPage.shiftNameInput.fill(payload);
  await adminWorkShiftsPage.fromTimeInput.fill('09:00 AM');
  await adminWorkShiftsPage.toTimeInput.fill('05:00 PM');
  await adminWorkShiftsPage.save();
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(1500);

  report.step('Verify: tidak ada eksekusi script (window.__xss tidak ter-set)');
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xss?: boolean }).__xss === true)
    .catch(() => false);
  report.check('Payload XSS TIDAK tereksekusi sebagai script', xssExecuted === false);

  report.print();
});
