/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-18: Verify Double-Click Save Does Not Duplicate
 * Modul    : Recruitment - Vacancies
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-18-Verify-Double-Click-Save-Does-Not-Duplicate.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik ganda cepat pada tombol Save di form Add Vacancy
 *   TIDAK membuat 2 vacancy identik tersimpan. Titik create TERPISAH
 *   dari TC-RECRUITMENT-CANDIDATE-21 -- tidak boleh diasumsikan sama
 *   amannya hanya krn satu sudah dites.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-18-Verify-Double-Click-Save-Does-Not-Duplicate.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-VACANCY-18: rapid double-click on Save does not create duplicate vacancies', async ({
  page,
  vacanciesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-18', 'Double-Click Save Does Not Duplicate', env.baseURL, page);
  const vacancyName = uniqueName('QaDoubleVacancy');

  report.step('Isi form vacancy valid, klik Save 2x secepat mungkin');
  await vacanciesPage.gotoAddForm();
  await vacanciesPage.vacancyNameInput.fill(vacancyName);
  await vacanciesPage.jobTitleSelect.click();
  await page.getByRole('option').nth(1).click();
  await vacanciesPage.descriptionTextarea.fill('QA automation role');
  await vacanciesPage.fillFirstHiringManager();
  await vacanciesPage.numberOfPositionsInput.fill('2');

  let postCount = 0;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/recruitment/vacancies')) postCount++;
  });
  await Promise.all([
    vacanciesPage.saveButton.click(),
    vacanciesPage.saveButton.click({ timeout: 2_000 }).catch(() => {}),
  ]);
  await page.waitForTimeout(2500);

  report.step('Verify jumlah POST request dan jumlah row di list');
  report.check(
    'Client TIDAK men-debounce tombol Save (2 request terkirim) -- gap minor, bukan bug kritis',
    postCount === 1,
    `postCount=${postCount}`,
  );
  await vacanciesPage.goto();
  await page.waitForTimeout(1500);
  const count = await vacanciesPage.rowByName(vacancyName).count();
  report.check(
    `Vacancy "${vacancyName}" muncul TEPAT 1 kali di list (TIDAK ada duplikat data)`,
    count === 1,
    `count=${count}`,
  );

  report.print();
  // NOTE 2026-11-12: console-error check (lihat di bawah, via page init TestReport) GAGAL
  // deterministik 3x reproduce: "TypeError: Cannot read properties of undefined (reading 'id')"
  // di Proxy.onSave -- BUG APLIKASI BARU & BERBEDA dari bug app-wide network-drop yang sudah
  // dikonfirmasi (BG-199/200/201/202). Data TIDAK terduplikat (postCount=1, count=1) krn
  // request ke-2 rupanya tidak sempat terkirim (button sempat ter-disable duluan), tapi
  // handler onSave tetap crash saat mencoba proses klik kedua -- indikasi onSave tidak guard
  // terhadap pemanggilan ganda/state yang belum siap. Lihat Bug-List utk entry spesifik TC ini.
});
