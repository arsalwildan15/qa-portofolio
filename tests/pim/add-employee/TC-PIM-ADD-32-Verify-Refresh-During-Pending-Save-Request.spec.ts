/**
 * ================================================================================
 * TC-PIM-ADD-32: Verify Refresh During Pending Save Request
 * Modul    : PIM - Add Employee
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-32-Verify-Refresh-During-Pending-Save-Request.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi apa yang terjadi kalau user me-refresh halaman TEPAT
 *   SAAT request POST create-employee masih pending. Risiko: employee
 *   bisa ter-SIMPAN di server padahal UI tidak sempat konfirmasi, dan
 *   kalau user mengulang aksi yang sama, berpotensi membuat 2 employee
 *   duplikat dengan nama persis sama.
 *
 * TEKNIK:
 *   POST /api/v2/pim/employees di-intercept via page.route() dan
 *   DITUNDA 4 detik sebelum diteruskan ke server asli.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-32-Verify-Refresh-During-Pending-Save-Request.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-PIM-ADD-32: refreshing while the create-employee request is pending does not create a duplicate', async ({
  page,
  addEmployeePage,
  employeeListPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-PIM-ADD-32', 'Refresh During Pending Save Request', env.baseURL, page);
  const firstName = uniqueName('QaRefreshEmp');
  const lastName = 'Doe';

  report.step('Isi nama employee, intercept+tunda POST employees 4 detik, klik Save TANPA menunggu response');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(firstName, lastName);

  await page.route('**/api/v2/pim/employees', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4_000));
    await route.continue().catch(() => {});
  });
  // .catch() wajib: reload() di bawah sengaja menyela aksi ini di tengah jalan, jadi promise
  // klik ini BISA reject (mis. elemen ter-detach krn navigasi) -- itu hasil yang diharapkan,
  // bukan bug script, dan harus ditangkap supaya tidak jadi unhandled rejection yg mematikan test.
  void addEmployeePage.save().catch(() => {});
  await page.waitForTimeout(800);

  report.step('Reload halaman SAAT request masih pending (sebelum 4 detik delay selesai)');
  await page.reload().catch((e) => {
    report.finding('Reload menyela navigasi/request yang sedang pending', String(e).slice(0, 150));
  });
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(3000);

  // NOTE: employeeNameFilter adalah autocomplete yang HANYA menerima opsi yang dipilih dari
  // suggestion-nya sendiri (sama pola dgn CandidatesPage.filterByCandidateName()/PIM Report-to) --
  // mengisi teks saja tanpa klik suggestion TIDAK memicu parameter nameOrId di request API
  // (dikonfirmasi live: request tanpa klik suggestion tidak menyaring apa pun). Direct
  // page.request.get() ke endpoint yang sama juga TERBUKTI tidak reliable (return kosong
  // walau via sesi yang sama) -- harus lewat interaksi UI asli.
  // [BUG SCRIPT, ditemukan & diperbaiki 2026-11-12]: autocomplete SELALU menampilkan tepat 1
  // "option" bahkan saat tidak ada hasil -- isinya placeholder teks "No Records Found", BUKAN
  // array kosong. Jadi "count() > 0" TIDAK BISA dipakai utk deteksi ada/tidaknya match asli;
  // yang penting cukup klik option apa pun yang muncul (asli atau placeholder, keduanya aman
  // diklik) lalu baca hasil akhir dari tableRows setelah Search, bukan dari jumlah suggestion.
  report.step(`Verify employee "${firstName} ${lastName}" muncul TEPAT 0 atau 1 kali di Employee List (bukan ganda)`);
  await page.unroute('**/api/v2/pim/employees');
  await employeeListPage.goto();
  await employeeListPage.employeeNameFilter.fill(firstName);
  await page.waitForTimeout(600);
  await page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.locator('.oxd-autocomplete-option').first().click();
  await employeeListPage.searchButton.click();
  await page.waitForTimeout(2000);
  const count = await employeeListPage.tableRows.filter({ hasText: firstName }).count();
  report.finding(
    'Hasil refresh saat save pending',
    `Employee muncul ${count}x di list setelah refresh mid-request (0 = request batal total, 1 = ` +
      'tersimpan sukses meski UI tidak sempat konfirmasi -- keduanya wajar; >1 akan jadi BUG nyata).',
  );
  report.check(
    `Employee "${firstName} ${lastName}" TIDAK muncul lebih dari 1 kali (tidak ada duplikat)`,
    count <= 1,
    `count=${count}`,
  );

  report.print();
});
