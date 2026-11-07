/**
 * ================================================================================
 * TC-ADMIN-JOBTITLE-04: Verify XSS In Job Title
 * Modul    : Admin - Job Titles
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-JOBTITLE-04-Verify-XSS-In-Job-Title.spec.ts
 * Path     : tests/admin/job-titles/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Job Title tidak tereksekusi sebagai
 *   script saat tersimpan dan ditampilkan kembali di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/job-titles/TC-ADMIN-JOBTITLE-04-Verify-XSS-In-Job-Title.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-JOBTITLE-04: an XSS payload in Job Title does not execute', async ({
  page,
  adminJobTitlesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-JOBTITLE-04', 'XSS In Job Title', env.baseURL, page);
  const payload = `${uniqueName('QaXss')}<script>window.__xss=true</script>`;

  report.step('Isi Job Title dengan payload XSS, klik Save');
  await adminJobTitlesPage.gotoAdd();
  await adminJobTitlesPage.jobTitleInput.fill(payload);
  await adminJobTitlesPage.save();
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(1500);

  report.step('Verify: tidak ada eksekusi script (window.__xss tidak ter-set)');
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xss?: boolean }).__xss === true)
    .catch(() => false);
  report.check('Payload XSS TIDAK tereksekusi sebagai script', xssExecuted === false);

  report.print();
});
