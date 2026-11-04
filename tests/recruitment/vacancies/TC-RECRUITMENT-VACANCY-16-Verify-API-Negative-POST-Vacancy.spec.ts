/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-16: Verify API Negative POST Vacancy
 * Modul    : Recruitment - Vacancies
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-16-Verify-API-Negative-POST-Vacancy.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi POST langsung ke /api/v2/recruitment/vacancies dengan
 *   body kosong / tanpa field wajib ditolak dengan error 4xx yang jelas,
 *   bukan 500 ataupun 200 dengan data kosong ter-create. [CONFIRMED via
 *   discovery run]: body kosong -> 422 "Invalid Parameter" dengan
 *   invalidParamKeys=["name","status","jobTitleId","isPublished",
 *   "employeeId"]; body tanpa "name" -> 422 serupa tanpa "jobTitleId"
 *   (karena jobTitleId memang diisi di request ini, name yang hilang).
 *   page.request dipakai (berbagi cookie session dengan page yang sudah
 *   login via authenticatedTest), bukan APIRequestContext terpisah.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-16-Verify-API-Negative-POST-Vacancy.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-RECRUITMENT-VACANCY-16: POST vacancies without required fields is rejected with 4xx', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-16', 'API Negative POST Vacancy', env.baseURL, page);
  const url = `${env.baseURL}/web/index.php/api/v2/recruitment/vacancies`;

  report.step('[API] POST body kosong {}');
  const r1 = await page.request.post(url, { data: {} });
  report.check('Body kosong -> status 4xx (bukan 500/200)', r1.status() >= 400 && r1.status() < 500, `status=${r1.status()}`);
  const body1 = await r1.json().catch(() => null);
  report.check('Body kosong -> error message field-level ada', !!body1?.error?.message, `body=${JSON.stringify(body1)}`);

  report.step('[API] POST tanpa field "name"');
  const r2 = await page.request.post(url, { data: { jobTitleId: 1, employeeId: 1, numOfPositions: 1 } });
  report.check('Tanpa "name" -> status 4xx (bukan 500/200)', r2.status() >= 400 && r2.status() < 500, `status=${r2.status()}`);
  const body2 = await r2.json().catch(() => null);
  const invalidKeys2: string[] = body2?.error?.data?.invalidParamKeys ?? [];
  report.check('Tanpa "name" -> "name" muncul di invalidParamKeys', invalidKeys2.includes('name'), `invalidParamKeys=${JSON.stringify(invalidKeys2)}`);

  report.step('[API] POST tanpa "hiringManagerId" (field app yang sebenarnya bernama "employeeId")');
  const r3 = await page.request.post(url, { data: { name: 'Qa Negative Vacancy', jobTitleId: 1, numOfPositions: 1 } });
  report.check('Tanpa employeeId -> status 4xx (bukan 500/200)', r3.status() >= 400 && r3.status() < 500, `status=${r3.status()}`);
  const body3 = await r3.json().catch(() => null);
  const invalidKeys3: string[] = body3?.error?.data?.invalidParamKeys ?? [];
  report.check('Tanpa employeeId -> "employeeId" muncul di invalidParamKeys', invalidKeys3.includes('employeeId'), `invalidParamKeys=${JSON.stringify(invalidKeys3)}`);

  report.print();
});
