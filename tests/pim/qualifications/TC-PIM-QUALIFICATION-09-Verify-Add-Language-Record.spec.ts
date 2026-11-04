/**
 * ================================================================================
 * TC-PIM-QUALIFICATION-09: Verify Add Language Record
 * Modul    : PIM - Qualifications
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-QUALIFICATION-09-Verify-Add-Language-Record.spec.ts
 * Path     : tests/pim/qualifications/
 * ================================================================================
 *
 * TUJUAN:
 *   TC representatif untuk sub-section Languages (menutup gap yang
 *   didokumentasikan sejak Fase 2). Memverifikasi menambah Language
 *   (Language, Fluency, Competency, Comments) berhasil tersimpan. Semua 3
 *   field utama (Language/Fluency/Competency) adalah dropdown, bukan
 *   field teks (dikonfirmasi live: 3 .oxd-select-text, 0 text input).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/qualifications/TC-PIM-QUALIFICATION-09-Verify-Add-Language-Record.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-QUALIFICATION-09: add language record succeeds', async ({
  page,
  addEmployeePage,
  qualificationsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-QUALIFICATION-09', 'Add Language Record', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Qualifications');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaQualLang');
  await qualificationsPage.goto(empNumber);

  report.step('Klik "+ Add" (Languages), pilih Language/Fluency/Competency, klik Save');
  await qualificationsPage.openAddLanguage();
  await qualificationsPage.languageSelect.waitFor({ state: 'visible' });
  await qualificationsPage.languageSelect.click();
  const firstLanguageOption = page.getByRole('option').nth(1);
  const languageName = (await firstLanguageOption.textContent())?.trim();
  await firstLanguageOption.click();
  await qualificationsPage.fluencySelect.click();
  await page.getByRole('option').nth(1).click();
  await qualificationsPage.competencySelect.click();
  await page.getByRole('option').nth(1).click();
  await qualificationsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify language yang dipilih muncul di tabel Languages');
  report.check(
    `Language "${languageName}" muncul di tabel`,
    languageName !== undefined && (await isVisibleWithWait(page.getByText(languageName ?? '', { exact: false }))),
    `languageName=${languageName}`,
  );

  report.print();
});
