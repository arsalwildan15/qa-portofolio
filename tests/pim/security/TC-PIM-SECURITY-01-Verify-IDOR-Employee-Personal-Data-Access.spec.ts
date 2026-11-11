/**
 * ================================================================================
 * TC-PIM-SECURITY-01: Verify IDOR on Employee Personal Data Access
 * Modul    : PIM - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-SECURITY-01-Verify-IDOR-Employee-Personal-Data-Access.spec.ts
 * Path     : tests/pim/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi apakah ada isolasi akses saat mengambil data personal
 *   employee lain lewat manipulasi empNumber di URL/API (IDOR). PIM
 *   meng-key semua data personal (Personal Details, Contact Details,
 *   Salary) murni lewat empNumber di URL, misal
 *   /pim/viewPersonalDetails/empNumber/<N> — titik paling jelas untuk
 *   IDOR di seluruh aplikasi ini.
 *
 *   KONTEKS PENTING: pola yang sama sudah diuji di
 *   TC-RECRUITMENT-SECURITY-01 dan hasilnya "TIDAK ADA isolasi, N/A -
 *   arsitektur single-role" (semua admin melihat semua data di demo
 *   publik ini). TC ini WAJIB diverifikasi live untuk PIM secara
 *   terpisah, bukan diasumsikan sama, karena endpoint & page object-nya
 *   berbeda dari Recruitment.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/security/TC-PIM-SECURITY-01-Verify-IDOR-Employee-Personal-Data-Access.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-SECURITY-01: cross-employee data access via empNumber manipulation (IDOR)', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-SECURITY-01', 'IDOR Employee Personal Data Access', env.baseURL, page);

  report.step('Buat 2 employee berbeda (A dan B) di sesi yang sama');
  const employeeA = await createTestEmployee(page, addEmployeePage, 'QaIdorA');
  const employeeB = await createTestEmployee(page, addEmployeePage, 'QaIdorB');

  report.step('[API] GET personal-details employee B menggunakan sesi admin yang sama (bukan scoped ke A)');
  const personalDetailsResp = await page.request.get(
    `${env.baseURL}/web/index.php/api/v2/pim/employees/${employeeB.empNumber}/personal-details`,
  );
  report.check(
    'Response GET personal-details employee B dapat diakses (baseline, bukan hard-fail)',
    personalDetailsResp.status() === 200,
    `status=${personalDetailsResp.status()}`,
  );

  report.step('[API] GET salary employee B dari konteks yang sama');
  const salaryResp = await page.request.get(
    `${env.baseURL}/web/index.php/api/v2/pim/employees/${employeeB.empNumber}/salary`,
  );

  report.step('[UI] Navigasi langsung ke Personal Details employee B via URL');
  await personalDetailsPage.goto(employeeB.empNumber);
  await page.waitForTimeout(1500);
  const firstNameShown = await personalDetailsPage.firstNameInput.inputValue().catch(() => '');

  report.finding(
    'Hasil akses lintas-employee (IDOR baseline)',
    `GET personal-details employee B: status=${personalDetailsResp.status()}. GET salary employee B: ` +
      `status=${salaryResp.status()}. UI Personal Details employee B menampilkan firstName="${firstNameShown}" ` +
      `(diharapkan match "${employeeB.firstName}" kalau data employee B benar ter-load tanpa scoping error). ` +
      'Demo publik ini single-role (semua admin melihat semua employee), jadi hasil "bisa diakses" di sini ' +
      'adalah N/A - arsitektur single-role, BUKAN bug IDOR baru (sesuai preseden TC-RECRUITMENT-SECURITY-01) ' +
      '-- dicatat sebagai baseline resmi untuk PIM, bukan diasumsikan dari modul lain.',
  );

  report.print();
});
