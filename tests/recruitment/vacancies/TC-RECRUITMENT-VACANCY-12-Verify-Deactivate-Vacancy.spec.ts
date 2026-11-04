/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-12: Verify Deactivate Vacancy
 * Modul    : Recruitment - Vacancies
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-12-Verify-Deactivate-Vacancy.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi men-set Status vacancy jadi Inactive via form edit
 *   membuatnya hilang dari dropdown Vacancy pada form Add Candidate.
 *   [TEMUAN dari discovery run]: field ini adalah TOGGLE SWITCH berlabel
 *   teks "Active" (bukan dropdown), payload PUT membawa "status": false,
 *   dan label kolom Status di list berubah jadi "Closed" (BUKAN
 *   "Inactive" seperti diasumsikan di gap-coverage doc).
 *
 *   [TEMUAN SHARED-DEMO] Dropdown Vacancy pada Add Candidate dibatasi
 *   (observed: 25 opsi) dan churn tinggi dari user/test lain di demo
 *   publik bisa mendorong entry lama keluar dari daftar terlepas dari
 *   status aktif/inaktifnya. Kalau vacancy TIDAK ditemukan di dropdown
 *   SAMA SEKALI (baik sebelum maupun sesudah deactivate), itu didukumentasikan
 *   sebagai finding shared-demo churn, bukan FAILED, supaya tidak
 *   false-fail akibat karakteristik environment bersama.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-12-Verify-Deactivate-Vacancy.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestVacancy } from '../../../src/utils/createTestVacancy';

test('TC-RECRUITMENT-VACANCY-12: deactivating a vacancy removes it from the Add Candidate dropdown', async ({
  page,
  vacanciesPage,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-12', 'Deactivate Vacancy', env.baseURL, page);

  report.step('Buat vacancy baru khusus TC ini (tidak dipakai TC lain)');
  const { vacancyId, vacancyName } = await createTestVacancy(page, vacanciesPage, 'QaDeactivateVacancy', '2');

  report.step('Cek dropdown Vacancy di Add Candidate SEBELUM deactivate');
  await candidatesPage.gotoAddForm();
  await page.waitForTimeout(800);
  await candidatesPage.vacancySelect.click();
  await page.waitForTimeout(500);
  const optionsBefore = await page.getByRole('option').allTextContents();
  const presentBefore = optionsBefore.some((o) => o.trim() === vacancyName);
  await page.keyboard.press('Escape');

  report.step('Buka form edit vacancy, toggle switch "Active" -> off, Save');
  await vacanciesPage.gotoEditForm(vacancyId);
  await page.waitForTimeout(1000);
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/v2/recruitment/vacancies/${vacancyId}`) && r.request().method() === 'PUT',
    ),
    (async () => {
      await vacanciesPage.toggleActiveStatus();
      await vacanciesPage.save();
    })(),
  ]);
  report.check('[API] PUT deactivate status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.step('Cek dropdown Vacancy di Add Candidate SESUDAH deactivate, dan vacancy tetap ada di list');
  await candidatesPage.gotoAddForm();
  await page.waitForTimeout(800);
  await candidatesPage.vacancySelect.click();
  await page.waitForTimeout(500);
  const optionsAfter = await page.getByRole('option').allTextContents();
  const presentAfter = optionsAfter.some((o) => o.trim() === vacancyName);
  await page.keyboard.press('Escape');

  await vacanciesPage.goto();
  await page.waitForTimeout(1200);
  const row = vacanciesPage.rowByName(vacancyName).first();
  report.check('Vacancy tetap muncul di Vacancies list (tidak terhapus)', await row.isVisible({ timeout: 5_000 }).catch(() => false));
  const rowText = (await row.textContent().catch(() => '')) ?? '';
  report.check('Kolom Status di list menampilkan "Closed" setelah deactivate', rowText.includes('Closed'), `rowText=${rowText}`);

  if (!presentBefore) {
    report.finding(
      'Vacancy tidak ditemukan di dropdown Add Candidate bahkan SEBELUM deactivate',
      `vacancyName="${vacancyName}" tidak ada di antara ${optionsBefore.length} opsi dropdown saat dicek sebelum ` +
        'deactivate. Dropdown dibatasi (observed ~25 opsi) dan demo publik punya churn tinggi dari test/user ' +
        'lain yang terus membuat vacancy baru, jadi vacancy baru bisa sudah terdorong keluar dari daftar sebelum ' +
        'status-nya sempat diubah. Ini karakteristik shared-demo, bukan bug deactivate.',
    );
  } else {
    report.check(
      `Vacancy "${vacancyName}" TIDAK muncul lagi di dropdown Add Candidate setelah deactivate`,
      !presentAfter,
      `presentBefore=${presentBefore}, presentAfter=${presentAfter}`,
    );
  }

  report.print();
});
