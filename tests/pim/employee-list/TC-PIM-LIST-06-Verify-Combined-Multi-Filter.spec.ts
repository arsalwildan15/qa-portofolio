/**
 * ================================================================================
 * TC-PIM-LIST-06 — Verify Combined Multi Filter
 * Modul    : PIM - Employee List
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-06-Verify-Combined-Multi-Filter.spec.ts
 * Path     : tests/pim/employee-list/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi kombinasi beberapa filter sekaligus (Employment Status + Sub
 *   Unit) terkirim bersamaan dalam satu request, bukan saling menimpa.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/employee-list/TC-PIM-LIST-06-Verify-Combined-Multi-Filter.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PIM-LIST-06: combined status + sub unit filters apply together', async ({
  page,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-LIST-06', 'Combined Multi Filter', env.baseURL, page);

  report.step('Navigate ke Employee List, pilih Employment Status DAN Sub Unit sekaligus');
  await employeeListPage.goto();
  await employeeListPage.selectDropdownOption(employeeListPage.employmentStatusSelect, 'Full-Time Permanent');
  await employeeListPage.selectDropdownOption(employeeListPage.subUnitSelect, 'Engineering');

  report.step('Klik Search, verify kedua filter terkirim bersamaan di query param');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'GET'),
    employeeListPage.search(),
  ]);
  report.check('[API] Response status === 200', resp.status() === 200);
  report.check('[API] URL mengandung empStatusId', resp.url().includes('empStatusId'), `url=${resp.url()}`);
  report.check('[API] URL mengandung subunitId', resp.url().includes('subunitId'), `url=${resp.url()}`);

  report.print();
});
