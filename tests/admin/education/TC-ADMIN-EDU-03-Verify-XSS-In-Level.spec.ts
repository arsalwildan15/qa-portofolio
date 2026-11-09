/**
 * ================================================================================
 * TC-ADMIN-EDU-03: Verify XSS In Level
 * Modul    : Admin - Qualifications - Education
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EDU-03-Verify-XSS-In-Level.spec.ts
 * Path     : tests/admin/education/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Education Level tidak tereksekusi
 *   sebagai script saat tersimpan dan ditampilkan kembali di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/education/TC-ADMIN-EDU-03-Verify-XSS-In-Level.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-EDU-03: an XSS payload in Education Level does not execute', async ({
  page,
  adminEducationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-EDU-03', 'XSS In Level', env.baseURL, page);
  const payload = `${uniqueName('QaXss')}<script>window.__xss=true</script>`;

  report.step('Isi Level dengan payload XSS, klik Save');
  await adminEducationPage.gotoAdd();
  await adminEducationPage.nameInput.fill(payload);
  await adminEducationPage.save();
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(1500);

  report.step('Verify: tidak ada eksekusi script (window.__xss tidak ter-set)');
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xss?: boolean }).__xss === true)
    .catch(() => false);
  report.check('Payload XSS TIDAK tereksekusi sebagai script', xssExecuted === false);

  report.print();
});
