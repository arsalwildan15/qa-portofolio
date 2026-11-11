/**
 * ================================================================================
 * TC-PIM-ADD-33: Verify Connection Dropped During Save Request
 * Modul    : PIM - Add Employee
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-33-Verify-Connection-Dropped-During-Save-Request.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi perilaku form Add Employee saat koneksi terputus TEPAT
 *   SAAT request POST create-employee sedang berjalan. Employee TIDAK
 *   boleh ter-create, dan user harus mendapat indikasi gagal yang
 *   jelas (bukan silent hang/exception tak tertangani -- lihat preseden
 *   TC-ADMIN-USER-08 yang mengonfirmasi bug serupa di modul lain).
 *
 * TEKNIK:
 *   POST /api/v2/pim/employees di-intercept via page.route() dan
 *   di-abort() (simulasi network failure asli).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-33-Verify-Connection-Dropped-During-Save-Request.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-PIM-ADD-33: a dropped connection during create-employee submit shows a failure and does not create the employee', async ({
  page,
  addEmployeePage,
  employeeListPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-PIM-ADD-33', 'Connection Dropped During Save Request', env.baseURL, page);
  const firstName = uniqueName('QaDropEmp');
  const lastName = 'Doe';

  report.step('Isi nama employee, intercept POST employees dgn abort(), klik Save');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(firstName, lastName);

  await page.route('**/api/v2/pim/employees', (route) => route.abort('failed'));
  await addEmployeePage.save().catch(() => {});
  await page.waitForTimeout(2500);

  report.check(
    'Form masih di halaman Add Employee (TIDAK diam-diam redirect ke Personal Details seolah sukses)',
    page.url().includes('/pim/addEmployee'),
    `url=${page.url()}`,
  );

  report.step(`Pulihkan koneksi (unroute), verify employee "${firstName} ${lastName}" TIDAK ter-create`);
  await page.unroute('**/api/v2/pim/employees');
  await employeeListPage.goto();
  await employeeListPage.employeeNameFilter.fill(firstName);
  await page.waitForTimeout(600);
  await page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(500);
  // NOTE: autocomplete SELALU menampilkan tepat 1 "option" bahkan saat tidak ada hasil -- isinya
  // placeholder teks "No Records Found" (dikonfirmasi live), BUKAN array kosong. Jadi count===0
  // BUKAN cara yang benar utk deteksi "tidak ada suggestion"; harus cek TEKS option-nya.
  const firstSuggestionText = (await page.locator('.oxd-autocomplete-option').first().textContent())?.trim() ?? '';
  report.check(
    `Employee "${firstName}" TIDAK ter-create saat koneksi terputus (autocomplete = "No Records Found")`,
    firstSuggestionText === 'No Records Found',
    `firstSuggestionText="${firstSuggestionText}"`,
  );

  report.print();
});
