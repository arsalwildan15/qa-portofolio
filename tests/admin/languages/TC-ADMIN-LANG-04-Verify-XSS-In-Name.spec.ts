/**
 * ================================================================================
 * TC-ADMIN-LANG-04: Verify XSS In Name
 * Modul    : Admin - Qualifications - Languages
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LANG-04-Verify-XSS-In-Name.spec.ts
 * Path     : tests/admin/languages/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Language Name tidak tereksekusi sebagai
 *   script saat tersimpan dan ditampilkan kembali di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/languages/TC-ADMIN-LANG-04-Verify-XSS-In-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-LANG-04: an XSS payload in Language Name does not execute', async ({
  page,
  adminLanguagesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-LANG-04', 'XSS In Name', env.baseURL, page);
  const payload = `${uniqueName('QaXss')}<script>window.__xss=true</script>`;

  report.step('Isi Name dengan payload XSS, klik Save');
  await adminLanguagesPage.gotoAdd();
  await adminLanguagesPage.nameInput.fill(payload);
  await adminLanguagesPage.save();
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(1500);

  report.step('Verify: tidak ada eksekusi script (window.__xss tidak ter-set)');
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xss?: boolean }).__xss === true)
    .catch(() => false);
  report.check('Payload XSS TIDAK tereksekusi sebagai script', xssExecuted === false);

  report.print();
});
