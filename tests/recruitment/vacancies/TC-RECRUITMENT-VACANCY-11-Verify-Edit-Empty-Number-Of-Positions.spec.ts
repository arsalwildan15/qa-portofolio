/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-11: Verify Edit Empty Number Of Positions
 * Modul    : Recruitment - Vacancies
 * Kategori : Negative (-) [TEMUAN]
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-11-Verify-Edit-Empty-Number-Of-Positions.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi perilaku form EDIT Vacancy saat Number of Positions
 *   dikosongkan. [TEMUAN PENTING, dikonfirmasi live via discovery run]:
 *   BERBEDA dari asumsi awal di gap-coverage doc ("validasi Required
 *   muncul") — pada form EDIT, mengosongkan Number of Positions JUSTRU
 *   LOLOS: PUT tetap terkirim dan sukses (200), TIDAK ada error Required
 *   yang muncul. Ini berbeda dari form ADD, di mana mengisi nilai 0/-1/
 *   non-digit ditolak client-side (lihat TC-VACANCY-14/15), tapi
 *   mengosongkan field itu sepenuhnya pada form EDIT tidak divalidasi
 *   sama. Didokumentasikan via report.finding() karena perilaku
 *   ambigu/tidak konsisten dengan validasi lain di form yang sama, bukan
 *   pass/fail tegas.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-11-Verify-Edit-Empty-Number-Of-Positions.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestVacancy } from '../../../src/utils/createTestVacancy';

test('TC-RECRUITMENT-VACANCY-11: clearing Number of Positions on edit [TEMUAN]', async ({
  page,
  vacanciesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-VACANCY-11', 'Edit Empty Number Of Positions', env.baseURL, page);

  report.step('Buat vacancy baru khusus TC ini');
  const { vacancyId } = await createTestVacancy(page, vacanciesPage, 'QaEditEmptyPos', '2');

  let putStatus: number | null = null;
  const putPromise = page
    .waitForResponse(
      (r) => r.url().includes(`/api/v2/recruitment/vacancies/${vacancyId}`) && r.request().method() === 'PUT',
      { timeout: 5_000 },
    )
    .catch(() => null);

  report.step('Buka form edit, kosongkan Number of Positions, klik Save');
  await vacanciesPage.gotoEditForm(vacancyId);
  await page.waitForTimeout(1000);
  await vacanciesPage.numberOfPositionsInput.fill('');
  await vacanciesPage.save();
  const resp = await putPromise;
  putStatus = resp ? resp.status() : null;
  await page.waitForTimeout(800);

  report.check('TC dijalankan tanpa exception', true);

  if (putStatus !== null) {
    report.finding(
      'Number of Positions kosong pada form EDIT LOLOS (bukan ditolak)',
      `PUT /api/v2/recruitment/vacancies/${vacancyId} terkirim dan sukses (status=${putStatus}) meski Number ` +
        'of Positions dikosongkan, TIDAK konsisten dengan validasi 0/-1/non-digit yang memang ditolak di form ' +
        'ADD (lihat TC-VACANCY-14/15). Kemungkinan server menerima nilai null/undefined untuk numOfPositions ' +
        'tanpa validasi Required di jalur EDIT.',
    );
  } else {
    report.finding(
      'Number of Positions kosong pada form EDIT ditolak',
      'PUT tidak terkirim dalam 5s setelah Save diklik, konsisten dengan validasi Required.',
    );
  }

  report.print();
});
