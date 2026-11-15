/**
 * ================================================================================
 * TC-MYINFO-JOB-01 — Verify Job, Salary And Report-To Are Read-Only For An Employee In My Info
 * Modul    : My Info - Job / Salary / Report-to (ESS)
 * Kategori : Negative (-) 2.4 | Security (S) 5.2-BFLAC 5.2-PrivEsc
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-JOB-01-Verify-Job-Salary-Report-To-Read-Only-For-Employee.spec.ts
 * Path     : tests/my-info/job-salary-report-to/
 * ================================================================================
 *
 * TUJUAN:
 *   Job, Salary dan Report-to adalah data yg dikelola Admin; di My Info karyawan hanya boleh
 *   MELIHAT. Confirmed live 16 Nov 2026: tab Job field disabled tanpa tombol Save; Salary &
 *   Report-to tanpa tombol Add/Save. TC memverifikasi, dari sesi ESS sendiri:
 *     2.4   tab Job: tidak ada tombol Save (hanya baca); tab Salary & Report-to: tidak ada
 *           tombol Add.
 *     5.2-BFLAC / 5.2-PrivEsc  via API: PUT job-details, POST salary-components, POST supervisors,
 *           POST subordinates atas diri sendiri -> 403, dan tidak ada data yg terbentuk/berubah.
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/job-salary-report-to/TC-MYINFO-JOB-01-Verify-Job-Salary-Report-To-Read-Only-For-Employee.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession, openMyInfoFromMenu } from '../../../src/utils/myInfo';

test('TC-MYINFO-JOB-01: Job, Salary and Report-to are read-only for an employee in My Info', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-JOB-01', 'Job Salary Report-To Read-Only For Employee', env.baseURL, page);

  report.step('Setup: akun ESS, buka My Info');
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaMyInfoJob');
  const empNumber = await openMyInfoFromMenu(essPage);
  const base = `/web/index.php/api/v2/pim/employees/${empNumber}`;

  report.step('[ESS UI] Tab Job: read-only (tanpa tombol Save)');
  await essPage.goto(`/web/index.php/pim/viewJobDetails/empNumber/${empNumber}`);
  await essPage.locator('.oxd-layout-context').waitFor({ state: 'visible', timeout: 15_000 });
  await essPage.waitForLoadState('networkidle').catch(() => {});
  report.check('2.4 Tab Job tidak punya tombol Save', (await essPage.getByRole('button', { name: 'Save' }).count()) === 0);

  report.step('[ESS UI] Tab Salary: tanpa tombol Add');
  await essPage.goto(`/web/index.php/pim/viewSalaryList/empNumber/${empNumber}`);
  await essPage.locator('.oxd-layout-context').waitFor({ state: 'visible', timeout: 15_000 });
  await essPage.waitForLoadState('networkidle').catch(() => {});
  report.check('2.4 Tab Salary tidak punya tombol Add', (await essPage.getByRole('button', { name: /Add/i }).count()) === 0);

  report.step('[ESS UI] Tab Report-to: tanpa tombol Add');
  await essPage.goto(`/web/index.php/pim/viewReportToDetails/empNumber/${empNumber}`);
  await essPage.locator('.oxd-layout-context').waitFor({ state: 'visible', timeout: 15_000 });
  await essPage.waitForLoadState('networkidle').catch(() => {});
  report.check('2.4 Tab Report-to tidak punya tombol Add', (await essPage.getByRole('button', { name: /Add/i }).count()) === 0);

  report.step('[ESS API] Mutasi Job/Salary/Supervisor/Subordinate atas diri sendiri');
  const jobTitleId = (await (await page.request.get('/web/index.php/api/v2/admin/job-titles?limit=1')).json().catch(() => null))?.data?.[0]?.id;
  const job = await essPage.request.put(`${base}/job-details`, { data: { joinedDate: null, jobTitleId } });
  report.check('5.2-BFLAC PUT job-details -> 403', job.status() === 403, `status=${job.status()}`);
  const salary = await essPage.request.post(`${base}/salary-components`, { data: { salaryComponent: 'Bonus', salaryAmount: '99999', currencyId: 'USD', payGradeId: null, payFrequencyId: null, comment: null, addDirectDeposit: false } });
  report.check('5.2-PrivEsc POST salary-components -> 403', salary.status() === 403, `status=${salary.status()}`);
  const sup = await essPage.request.post(`${base}/supervisors`, { data: { empNumber: 7, reportingMethodId: 1 } });
  report.check('5.2-PrivEsc POST supervisors -> 403', sup.status() === 403, `status=${sup.status()}`);
  const sub = await essPage.request.post(`${base}/subordinates`, { data: { empNumber: 7, reportingMethodId: 1 } });
  report.check('5.2-PrivEsc POST subordinates -> 403', sub.status() === 403, `status=${sub.status()}`);

  report.step('[Admin API] Tidak ada data yg terbentuk/berubah');
  const jobAfter = (await (await page.request.get(`${base}/job-details`)).json().catch(() => null))?.data;
  const salAfter = (await (await page.request.get(`${base}/salary-components?limit=50&offset=0`)).json().catch(() => null))?.meta?.total;
  const supAfter = (await (await page.request.get(`${base}/supervisors?limit=50&offset=0`)).json().catch(() => null))?.meta?.total;
  report.check('Job Title tetap kosong, salary & supervisor tetap 0', jobAfter?.jobTitle?.id == null && salAfter === 0 && supAfter === 0, `jobTitle=${JSON.stringify(jobAfter?.jobTitle?.id)}, salary=${salAfter}, sup=${supAfter}`);

  await close();
  report.print();
});
