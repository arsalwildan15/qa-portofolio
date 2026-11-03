/**
 * ================================================================================
 * TC-PIM-QUALIFICATION-07 — Verify Add Education Record
 * Modul    : PIM - Qualifications
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-QUALIFICATION-07-Verify-Add-Education-Record.spec.ts
 * Path     : tests/pim/qualifications/
 * ================================================================================
 *
 * TUJUAN:
 *   TC representatif untuk sub-section Education (salah satu dari 5
 *   sub-section Qualifications: Work Experience, Education, Skills,
 *   Languages, License). Memverifikasi menambah Education (Level, Year,
 *   GPA/Score) berhasil tersimpan — membuktikan pola modal "+ Add" yang
 *   sama berlaku konsisten di sub-section lain, tanpa menguji keempatnya
 *   sedalam Work Experience.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/qualifications/TC-PIM-QUALIFICATION-07-Verify-Add-Education-Record.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-QUALIFICATION-07: add education record succeeds', async ({
  page,
  addEmployeePage,
  qualificationsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-QUALIFICATION-07', 'Add Education Record', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Qualifications');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaQualEdu');
  await qualificationsPage.goto(empNumber);

  report.step('Klik "+ Add" (Education), pilih Level, isi Year dan GPA/Score, klik Save');
  await qualificationsPage.openAddEducation();
  await qualificationsPage.educationLevelSelect.waitFor({ state: 'visible' });
  await qualificationsPage.selectDropdownOption(qualificationsPage.educationLevelSelect, "Bachelor's Degree");
  await qualificationsPage.educationYearInput.fill('4');
  await qualificationsPage.educationGpaInput.fill('3.8');
  await qualificationsPage.save();
  await page.waitForTimeout(1500);

  report.step("Verify \"Bachelor's Degree\" muncul di tabel Education");
  report.check(
    "\"Bachelor's Degree\" muncul di tabel",
    await isVisibleWithWait(page.getByText("Bachelor's Degree")),
  );

  report.print();
});
