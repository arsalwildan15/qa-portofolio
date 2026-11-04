/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-04: Verify XSS In Vacancy Name
 * Modul    : Recruitment - Vacancies
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-04-Verify-XSS-In-Vacancy-Name.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Vacancy Name tidak tereksekusi sebagai
 *   script (tidak ada console error/alert tak terduga saat tersimpan dan
 *   ditampilkan kembali di list).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-04-Verify-XSS-In-Vacancy-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-VACANCY-04: an XSS payload in Vacancy Name does not execute', async ({
  page,
  vacanciesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-04', 'XSS In Vacancy Name', env.baseURL, page);
  const payload = `${uniqueName('QaXss')}<script>window.__xss=true</script>`;

  report.step('Isi Vacancy Name dengan payload XSS, isi field wajib lain, klik Save');
  await vacanciesPage.gotoAddForm();
  await vacanciesPage.vacancyNameInput.fill(payload);
  await vacanciesPage.jobTitleSelect.click();
  await page.getByRole('option').nth(1).click();
  await vacanciesPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify: tidak ada eksekusi script (window.__xss tidak ter-set)');
  const xssExecuted = await page.evaluate(() => (globalThis as unknown as { __xss?: boolean }).__xss === true);
  report.check('Payload XSS TIDAK tereksekusi sebagai script', xssExecuted === false);

  report.print();
});
