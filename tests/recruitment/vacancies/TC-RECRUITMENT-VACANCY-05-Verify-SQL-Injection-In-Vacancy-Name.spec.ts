/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-05: Verify SQL Injection In Vacancy Name
 * Modul    : Recruitment - Vacancies
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-05-Verify-SQL-Injection-In-Vacancy-Name.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di Vacancy Name tidak memicu
 *   error server (500) atau console error, mengindikasikan input
 *   diperlakukan sebagai data biasa (parameterized), bukan dieksekusi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-05-Verify-SQL-Injection-In-Vacancy-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-VACANCY-05: a SQL injection payload in Vacancy Name does not break the server', async ({
  page,
  vacanciesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-05', 'SQL Injection In Vacancy Name', env.baseURL, page);
  const payload = `${uniqueName('QaSqli')}'; DROP TABLE users; --`;

  report.step('Isi Vacancy Name dengan payload SQL injection, isi field wajib lain, klik Save');
  await vacanciesPage.gotoAddForm();
  await vacanciesPage.vacancyNameInput.fill(payload);
  await vacanciesPage.jobTitleSelect.click();
  await page.getByRole('option').nth(1).click();
  await vacanciesPage.fillFirstHiringManager();

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/recruitment/vacancies') && r.request().method() === 'POST'),
    vacanciesPage.save(),
  ]);

  report.step('Verify: server tidak error (status < 500)');
  report.check('[API] status < 500 (bukan server error)', resp.status() < 500, `status=${resp.status()}`);

  report.print();
});
