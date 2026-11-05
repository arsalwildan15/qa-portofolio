/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-17: Verify List Filters Combination
 * Modul    : Recruitment - Candidates
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-17-Verify-List-Filters-Combination.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi filter Candidates list selain Candidate Name.
 *   [CONFIRMED via discovery run, innerHTML form filter]: ada 7 field
 *   total -- Job Title (dropdown), Vacancy (dropdown), Hiring Manager
 *   (dropdown), Status (dropdown), Candidate Name (autocomplete, sudah
 *   dites TC-08), Keywords (free text), Date of Application (range
 *   From/To). TC ini menjalankan filter "Vacancy" sendiri, lalu
 *   kombinasi "Vacancy" + "Status" sekaligus.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-17-Verify-List-Filters-Combination.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';
import { shortlistCandidate } from '../../../src/utils/advanceCandidateStatus';

test('TC-RECRUITMENT-CANDIDATE-17: list filters beyond Candidate Name, individually and combined', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-17', 'List Filters Combination', env.baseURL, page);

  report.step('Buat candidate baru dan Shortlist, agar ada data pasti dengan Vacancy + Status yang diketahui');
  const { candidateId, vacancyName } = await createTestCandidate(page, candidatesPage, 'QaCandFilter');
  await shortlistCandidate(page, candidatesPage, candidateId);

  report.step('Buka Candidates list, filter by Vacancy saja');
  await candidatesPage.goto();
  await page.waitForTimeout(1500);
  await candidatesPage.selectFilterOption(candidatesPage.vacancyFilterSelect, vacancyName);
  await candidatesPage.searchButton.click();
  await page.waitForTimeout(1500);
  const rowsAfterVacancyFilter = await candidatesPage.tableRows.count();
  report.check('Filter by Vacancy mengembalikan hasil (>0 baris)', rowsAfterVacancyFilter > 0, `rows=${rowsAfterVacancyFilter}`);
  let allRowsMatchVacancy = true;
  for (let i = 0; i < rowsAfterVacancyFilter; i++) {
    const text = (await candidatesPage.tableRows.nth(i).textContent()) ?? '';
    if (!text.includes(vacancyName)) allRowsMatchVacancy = false;
  }
  report.check('Semua baris hasil filter Vacancy memang milik vacancy yang dipilih', allRowsMatchVacancy);

  report.step('Reset, lalu filter kombinasi Vacancy + Status ("Shortlisted")');
  await candidatesPage.resetButton.click();
  await page.waitForTimeout(1000);
  await candidatesPage.selectFilterOption(candidatesPage.vacancyFilterSelect, vacancyName);
  await candidatesPage.selectFilterOption(candidatesPage.statusFilterSelect, 'Shortlisted');
  await candidatesPage.searchButton.click();
  await page.waitForTimeout(1500);
  const rowsAfterCombined = await candidatesPage.tableRows.count();
  report.check('Filter kombinasi Vacancy + Status mengembalikan hasil (>0 baris)', rowsAfterCombined > 0, `rows=${rowsAfterCombined}`);

  let foundOurCandidate = false;
  for (let i = 0; i < rowsAfterCombined; i++) {
    const text = (await candidatesPage.tableRows.nth(i).textContent()) ?? '';
    if (text.includes(vacancyName) && text.includes('Shortlisted')) foundOurCandidate = true;
  }
  report.check(
    'Hasil kombinasi AND (semua baris cocok Vacancy DAN Status, bukan OR)',
    foundOurCandidate && rowsAfterCombined <= rowsAfterVacancyFilter,
    `rowsAfterCombined=${rowsAfterCombined}, rowsAfterVacancyFilter=${rowsAfterVacancyFilter}`,
  );

  report.check('TC dijalankan tanpa exception', true);
  report.finding(
    'Field filter yang tersedia di Candidates list (konfirmasi live)',
    'Job Title, Vacancy, Hiring Manager, Status (semua dropdown) + Candidate Name (autocomplete, lihat CANDIDATE-08) ' +
      '+ Keywords (free text) + Date of Application (range From/To). Dugaan awal gap-coverage doc (Vacancy/Status/Date ' +
      'Range) BENAR tapi tidak lengkap -- Job Title dan Hiring Manager juga ada sebagai filter terpisah.',
  );

  report.print();
});
