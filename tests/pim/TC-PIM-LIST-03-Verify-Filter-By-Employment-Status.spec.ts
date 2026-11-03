/**
 * ================================================================================
 * TC-PIM-LIST-03 — Verify Filter By Employment Status
 * Modul    : PIM - Employee List
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-03-Verify-Filter-By-Employment-Status.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi filter dropdown Employment Status (mis. "Full-Time Permanent")
 *   berhasil memfilter list dan mengirim request GET baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-LIST-03-Verify-Filter-By-Employment-Status.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

test('TC-PIM-LIST-03: filter by employment status triggers a new search', async ({
  page,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-LIST-03', 'Filter By Employment Status', env.baseURL, page);

  report.step('Navigate ke Employee List, pilih Employment Status = "Full-Time Permanent"');
  await employeeListPage.goto();
  await employeeListPage.selectDropdownOption(employeeListPage.employmentStatusSelect, 'Full-Time Permanent');

  report.step('Klik Search, verify request GET terkirim dengan status 200');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'GET'),
    employeeListPage.search(),
  ]);
  report.check('[API] Response status === 200', resp.status() === 200, `status=${resp.status()}`);
  report.check(
    '[API] URL filter mengandung empStatusId',
    resp.url().includes('empStatusId'),
    `url=${resp.url()}`,
  );

  report.print();
});
