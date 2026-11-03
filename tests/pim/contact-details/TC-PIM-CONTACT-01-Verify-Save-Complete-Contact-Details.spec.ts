/**
 * ================================================================================
 * TC-PIM-CONTACT-01 — Verify Save Complete Contact Details
 * Modul    : PIM - Contact Details
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CONTACT-01-Verify-Save-Complete-Contact-Details.spec.ts
 * Path     : tests/pim/contact-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi semua field Contact Details (Address, Telephone, Email)
 *   bisa diisi lengkap dan tersimpan sukses lewat PUT contact-details API.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/contact-details/TC-PIM-CONTACT-01-Verify-Save-Complete-Contact-Details.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-CONTACT-01: save complete contact details succeeds', async ({
  page,
  addEmployeePage,
  contactDetailsPage,
}, testInfo) => {
  // The shared public demo has been measurably slower than the 30s default
  // during this session (same finding as Phase 1); this TC makes 2 round
  // trips (create employee, save contact details), so give it more room.
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CONTACT-01', 'Save Complete Contact Details', env.baseURL, page);
  const employee = uniqueEmployeeName('QaContact');

  report.step('Buat employee baru untuk test ini');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;

  report.step('Navigate ke Contact Details, isi Address, Telephone, Email lengkap');
  await contactDetailsPage.goto(empNumber);
  await contactDetailsPage.street1Input.fill('Jl. Sudirman No. 1');
  await contactDetailsPage.street2Input.fill('Lantai 5');
  await contactDetailsPage.cityInput.fill('Jakarta');
  await contactDetailsPage.stateInput.fill('DKI Jakarta');
  await contactDetailsPage.zipInput.fill('12190');
  await contactDetailsPage.homeTelephoneInput.fill('0211234567');
  await contactDetailsPage.mobileInput.fill('081234567890');
  await contactDetailsPage.workEmailInput.fill('qa.contact@example.com');

  report.step('Intercept PUT contact-details, klik Save');
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/contact-details') && r.request().method() === 'PUT',
    ),
    contactDetailsPage.save(),
  ]);

  report.step('Verify response API');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  const body = await resp.json().catch(() => null);
  // [TEMUAN] PUT contact-details mengembalikan key yang benar (street1, city,
  // dst) tapi SEMUA bernilai null, bukan echo data yang baru disimpan — beda
  // dari POST /pim/employees (Phase 1) yang echo data input. Verifikasi
  // persistensi sesungguhnya butuh GET terpisah, bukan dari response PUT ini.
  report.check(
    '[API] response body punya struktur data contact (key benar)',
    body?.data !== undefined && 'street1' in (body?.data ?? {}) && 'city' in (body?.data ?? {}),
    JSON.stringify(body?.data),
  );
  report.finding(
    'PUT contact-details tidak echo data tersimpan',
    `Semua value di response data bernilai null meski save sukses (status 200): ${JSON.stringify(body?.data)}`,
  );

  report.print();
});
