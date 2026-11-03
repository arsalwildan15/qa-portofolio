/**
 * ================================================================================
 * TC-PIM-LIST-08 — Verify Pagination Next Page
 * Modul    : PIM - Employee List
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-08-Verify-Pagination-Next-Page.spec.ts
 * Path     : tests/pim/employee-list/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik nomor halaman "2" di pagination memuat data berbeda dari
 *   halaman 1 (offset berubah di request API).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/employee-list/TC-PIM-LIST-08-Verify-Pagination-Next-Page.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-PIM-LIST-08: clicking page 2 loads a new offset', async ({ page, employeeListPage }) => {
  const report = new TestReport('TC-PIM-LIST-08', 'Pagination Next Page', env.baseURL, page);

  report.step('Navigate ke Employee List, pastikan ada lebih dari 1 halaman data');
  await employeeListPage.goto();
  const [listResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'GET'),
    employeeListPage.search(),
  ]);
  report.check('[API] Response list awal status 200', listResp.status() === 200);

  report.step('Klik tombol halaman "2" pada pagination');
  const page2Button = employeeListPage.pageButton(2);
  const hasPage2 = await isVisibleWithWait(page2Button, 5_000);
  if (hasPage2) {
    const [resp2] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'GET'),
      page2Button.click(),
    ]);
    const offset = new URL(resp2.url()).searchParams.get('offset');
    report.check('[API] offset halaman 2 bukan 0', offset !== '0' && offset !== null, `offset=${offset}`);
  } else {
    report.finding(
      'Pagination halaman 2 tidak tersedia',
      'Data saat ini tidak cukup untuk >1 halaman (limit=50) — TC ini butuh minimal 51 employee di environment.',
    );
  }

  report.print();
});
