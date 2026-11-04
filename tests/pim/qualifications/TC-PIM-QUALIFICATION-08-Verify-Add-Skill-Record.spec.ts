/**
 * ================================================================================
 * TC-PIM-QUALIFICATION-08: Verify Add Skill Record
 * Modul    : PIM - Qualifications
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-QUALIFICATION-08-Verify-Add-Skill-Record.spec.ts
 * Path     : tests/pim/qualifications/
 * ================================================================================
 *
 * TUJUAN:
 *   TC representatif untuk sub-section Skills (salah satu dari 5
 *   sub-section Qualifications, menutup gap yang didokumentasikan sejak
 *   Fase 2: Skills/Languages/License belum dicakup). Memverifikasi
 *   menambah Skill (Skill, Years of Experience, Comments) berhasil
 *   tersimpan.
 *
 * [POLA UI BEDA] Berbeda dari Work Experience/Education yang pakai modal
 *   popup, form Skills/Languages/License dirender INLINE langsung di
 *   bawah section-nya di halaman (dikonfirmasi live via screenshot), bukan
 *   dialog terpisah.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/qualifications/TC-PIM-QUALIFICATION-08-Verify-Add-Skill-Record.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-QUALIFICATION-08: add skill record succeeds', async ({
  page,
  addEmployeePage,
  qualificationsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-QUALIFICATION-08', 'Add Skill Record', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Qualifications');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaQualSkill');
  await qualificationsPage.goto(empNumber);

  report.step('Klik "+ Add" (Skills), pilih Skill, isi Years of Experience, klik Save');
  await qualificationsPage.openAddSkill();
  await qualificationsPage.skillSelect.waitFor({ state: 'visible' });
  await qualificationsPage.skillSelect.click();
  const firstSkillOption = page.getByRole('option').nth(1);
  const skillName = (await firstSkillOption.textContent())?.trim();
  await firstSkillOption.click();
  await qualificationsPage.yearsOfExperienceInput.fill('3');
  await qualificationsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify skill yang dipilih muncul di tabel Skills');
  report.check(
    `Skill "${skillName}" muncul di tabel`,
    skillName !== undefined && (await isVisibleWithWait(page.getByText(skillName ?? '', { exact: false }))),
    `skillName=${skillName}`,
  );

  report.print();
});
