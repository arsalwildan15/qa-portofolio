/**
 * ================================================================================
 * TC-PIM-LIST-09 — Verify Search No Match Shows No Records
 * Modul    : PIM - Employee List
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-09-Verify-Search-No-Match-Shows-No-Records.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi search Employee Id yang pasti tidak ada menampilkan
 *   "No Records Found". ID dibatasi <=10 karakter — dikonfirmasi langsung
 *   bahwa Employee Id search field TIDAK membatasi panjang input di
 *   client, jadi ID >10 karakter dikirim ke server dan membalas HTTP 422
 *   (ditolak sebagai request tidak valid, BUKAN "No Records Found") lalu
 *   UI diam-diam fallback menampilkan semua data tanpa filter.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-LIST-09-Verify-Search-No-Match-Shows-No-Records.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-PIM-LIST-09: searching a non-existent employee id shows No Records Found', async ({
  page,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-LIST-09', 'Search No Match Shows No Records', env.baseURL, page);

  report.step('Navigate ke Employee List, search Employee Id = "ZZNOTEXIST" (10 char, dalam batas valid)');
  await employeeListPage.goto();
  await employeeListPage.employeeIdFilter.fill('ZZNOTEXIST');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'GET'),
    employeeListPage.search(),
  ]);
  report.check('[API] status === 200 (bukan 422)', resp.status() === 200, `status=${resp.status()}`);

  report.step('Verify "No Records Found" muncul');
  report.check('"No Records Found" visible', await isVisibleWithWait(employeeListPage.noRecordsFound));

  report.print();
});
