/**
 * ================================================================================
 * TC-PIM-LIST-05 — Verify Filter By Include
 * Modul    : PIM - Employee List
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-05-Verify-Filter-By-Include.spec.ts
 * Path     : tests/pim/employee-list/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi dropdown "Include" (Current Employees Only / Current and Past
 *   Employees / Past Employees Only) mengubah parameter includeEmployees di request.
 *
 * [KOREKSI 2026-11-11] Reproduce berulang: includeSelect SUDAH benar menampilkan
 *   "Current and Past Employees" terpilih (dikonfirmasi via page snapshot DOM saat
 *   gagal), TAPI response yang ditangkap tetap includeEmployees=onlyCurrent -- race
 *   condition: ada GET lebih dari satu ke endpoint yang sama dalam waktu berdekatan
 *   (kemungkinan GET auto-trigger dari perubahan dropdown itu sendiri, terjadi SEBELUM
 *   state ter-commit penuh, bukan GET dari klik Search yang dimaksud), dan predicate
 *   waitForResponse yang generik (cuma cocok URL endpoint + method GET) bisa menangkap
 *   GET YANG SALAH. Percobaan pertama (tambah jeda 1000ms) MENGURANGI tapi TIDAK
 *   MENGHILANGKAN race ini (masih reproduce 1 dari 3 run). FIX FINAL: predicate
 *   waitForResponse diperketat supaya WAJIB mengandung "includeEmployees=currentAndPast"
 *   di URL-nya sendiri -- GET manapun yang salah akan otomatis diabaikan (predicate tidak
 *   match), Playwright terus menunggu sampai GET yang BENAR muncul, menghilangkan race
 *   sepenuhnya alih-alih cuma mengurangi peluangnya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/employee-list/TC-PIM-LIST-05-Verify-Filter-By-Include.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-PIM-LIST-05: Include filter changes includeEmployees query param', async ({
  page,
  employeeListPage,
}) => {
  const report = new TestReport('TC-PIM-LIST-05', 'Filter By Include', env.baseURL, page);

  report.step('Navigate ke Employee List, tunggu form settle, pilih Include = "Current and Past Employees"');
  await employeeListPage.goto();
  await isVisibleWithWait(employeeListPage.includeSelect);
  await employeeListPage.selectDropdownOption(employeeListPage.includeSelect, 'Current and Past Employees');

  report.step('Klik Search, verify query param includeEmployees sesuai pilihan');
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/api/v2/pim/employees') &&
        r.request().method() === 'GET' &&
        r.url().includes('includeEmployees=currentAndPast'),
      { timeout: 15_000 },
    ),
    employeeListPage.search(),
  ]);
  report.check('[API] Response status === 200', resp.status() === 200, `status=${resp.status()}`);
  report.check(
    '[API] URL mengandung includeEmployees=currentAndPast',
    resp.url().includes('includeEmployees=currentAndPast'),
    `url=${resp.url()}`,
  );

  report.print();
});
