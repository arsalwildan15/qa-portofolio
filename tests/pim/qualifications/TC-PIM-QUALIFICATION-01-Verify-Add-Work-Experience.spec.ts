/**
 * ================================================================================
 * TC-PIM-QUALIFICATION-01 — Verify Add Work Experience
 * Modul    : PIM - Qualifications
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-QUALIFICATION-01-Verify-Add-Work-Experience.spec.ts
 * Path     : tests/pim/qualifications/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Work Experience (Company, Job Title, From/To
 *   date) berhasil tersimpan. Qualifications punya 5 sub-section (Work
 *   Experience, Education, Skills, Languages, License) — TC Fase 2 fokus
 *   mendalam di Work Experience, dengan 1 TC representatif untuk Education
 *   (lihat TC-PIM-QUALIFICATION-07).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/qualifications/TC-PIM-QUALIFICATION-01-Verify-Add-Work-Experience.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-QUALIFICATION-01: add work experience succeeds', async ({
  page,
  addEmployeePage,
  qualificationsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-QUALIFICATION-01', 'Add Work Experience', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Qualifications');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaQualValid');
  await qualificationsPage.goto(empNumber);

  report.step('Klik "+ Add" (Work Experience), isi Company/Job Title/From/To, klik Save');
  await qualificationsPage.openAddWorkExperience();
  await qualificationsPage.companyInput.waitFor({ state: 'visible' });
  await qualificationsPage.companyInput.fill('Acme Corp');
  await qualificationsPage.jobTitleInput.fill('QA Engineer');
  await qualificationsPage.fromDateInput.fill('2018-01-01');
  await qualificationsPage.toDateInput.fill('2020-01-01');
  await qualificationsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify "Acme Corp" muncul di tabel Work Experience');
  report.check('"Acme Corp" muncul di tabel', await isVisibleWithWait(page.getByText('Acme Corp')));

  report.print();
});
