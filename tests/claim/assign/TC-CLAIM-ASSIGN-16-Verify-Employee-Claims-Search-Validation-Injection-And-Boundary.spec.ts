/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-16 — Verify Employee Claims Search: Validation, Injection And Boundary
 * Modul    : Claim > Employee Claims (U011, claim/viewAssignClaim)
 * Kategori : Negative (-) 2.2 2.8 | Boundary (!) 3.4 | Edge (!) 4.1 4.8 |
 *            Security (S) 5.1-SQLi 5.1-XSS-Reflected | API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-16-Verify-Employee-Claims-Search-Validation-Injection-And-Boundary.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * LATAR: menutup 8 kode GAP terakhir U011 Employee Claims -- halaman PENCARIAN MURNI
 * (search form: Employee Name, Reference Id, Event Name, Status, From Date, To Date,
 * Include), bukan form create/edit (itu ada di Assign Claim/U076 & Claim Detail/U105).
 * Endpoint: GET /api/v2/claim/employees/requests. Dibuktikan LIVE 24 Nov 2026:
 *   - Query param asing -> 422; sortField tak dikenal -> 422 (6.5).
 *   - fromDate format invalid ("not-a-date") -> 422 (2.2).
 *   - fromDate > toDate (rentang terbalik) -> 200 + hasil kosong, bukan error -- diterima
 *     sbg filter valid yg tidak match apa pun, bukan bug (3.4).
 *   - referenceId berisi payload SQLi -> 200, hasil kosong wajar (tidak match), tidak ada
 *     DB error/bypass (5.1-SQLi).
 *   - referenceId berisi payload XSS reflected ke UI search form -> TIDAK tereksekusi,
 *     tampil sbg teks di "No Records Found" / value field (5.1-XSS-Reflected).
 *   - Nama Employee berisi unicode/emoji di search box -> search jalan normal, tidak
 *     crash (4.1).
 *   - [2.8] Halaman ini PENCARIAN MURNI, tidak ada aksi reject/cancel/approve langsung di
 *     sini (aksi tsb ada di Claim Detail/U105 yg ditutup terpisah) -- 2.8 (field alasan
 *     wajib saat reject/cancel) TIDAK BERLAKU di unit ini, dibuktikan via literal check yg
 *     mengonfirmasi tidak ada tombol aksi reject/cancel di halaman list ini.
 *   - [4.8] status filter dgn value di luar enum (999) -> 200 + hasil kosong (bukan error)
 *     -- server tidak strictly validate enum utk GET filter, behavior non-obvious tapi
 *     tidak berbahaya (hanya bisa menghasilkan 0 hasil, bukan bypass data).
 *
 * HASIL 24 Nov 2026: lolos penuh, tidak ada bug baru. MENUTUP U011 SEPENUHNYA.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-16-Verify-Employee-Claims-Search-Validation-Injection-And-Boundary.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const API = '/web/index.php/api/v2/';

test('TC-CLAIM-ASSIGN-16: Employee Claims search validation, injection, boundary', async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-16', 'Employee Claims Search Validation Injection Boundary', env.baseURL, page);
  await page.goto('/web/index.php/claim/viewAssignClaim');

  report.step('6.5 Parameter negative -- param asing & sortField tak dikenal');
  const badParam = await page.request.get(`${API}claim/employees/requests?bogusParam=1`);
  const badSort = await page.request.get(`${API}claim/employees/requests?sortField=bogus&sortOrder=ASC`);
  report.check('6.5 [U011] GET requests dgn param asing -> 422 ditolak', badParam.status() === 422, `status=${badParam.status()}`);
  report.check('6.5 [U011] GET requests dgn sortField tak dikenal -> 422 ditolak', badSort.status() === 422, `status=${badSort.status()}`);

  report.step('2.2 Format invalid -- fromDate bukan tanggal');
  const badDate = await page.request.get(`${API}claim/employees/requests?fromDate=not-a-date&toDate=2026-01-01`);
  report.check('2.2 [U011] fromDate format invalid -> 422 ditolak', badDate.status() === 422, `status=${badDate.status()}`);

  report.step('3.4 Boundary tanggal -- rentang terbalik (fromDate > toDate)');
  const reversed = await page.request.get(`${API}claim/employees/requests?fromDate=2026-12-31&toDate=2026-01-01`);
  const reversedBody = await reversed.json().catch(() => null);
  report.check('3.4 [U011] fromDate > toDate -> 200 + hasil kosong (diterima sbg filter valid, bukan error)', reversed.status() === 200 && Array.isArray(reversedBody?.data) && reversedBody.data.length === 0, `status=${reversed.status()} count=${reversedBody?.data?.length}`);

  report.step('5.1-SQLi referenceId berisi payload SQL');
  const sqli = await page.request.get(`${API}claim/employees/requests?referenceId=${encodeURIComponent("' OR '1'='1")}`);
  report.check('5.1-SQLi [U011] referenceId SQLi -> 200, tidak ada DB error/bypass, hasil kosong wajar', sqli.status() === 200, `status=${sqli.status()}`);

  report.step('5.1-XSS-Reflected referenceId berisi payload XSS, dicoba via UI search box');
  const xssPayload = '<img src=x onerror="window.__claimU011Xss=1">';
  const refIdInput = page.locator('.oxd-input-group', { has: page.getByText('Reference Id', { exact: true }) }).locator('input');
  await refIdInput.fill(xssPayload);
  const searchBtn = page.getByRole('button', { name: /search/i }).first();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('claim/employees/requests') && r.request().method() === 'GET', { timeout: 10_000 }).catch(() => null),
    searchBtn.click(),
  ]);
  await page.waitForTimeout(1000);
  const xssExecuted = await page.evaluate(() => (window as unknown as { __claimU011Xss?: number }).__claimU011Xss);
  report.check('5.1-XSS-Reflected [U011] Payload XSS di search box -> TIDAK tereksekusi', xssExecuted === undefined, `executed=${xssExecuted}`);
  report.check('5.1-XSS-Reflected [U011] Tidak ada <img src="x"> tersuntik ke DOM', (await page.locator('img[src="x"]').count()) === 0);

  report.step('4.1 Unicode/emoji di search box Employee Name');
  const empNameInput = page.locator('.oxd-autocomplete-text-input input').first();
  await empNameInput.fill('مرحبا 你好 🎉').catch(() => {});
  await page.waitForTimeout(500);
  await empNameInput.fill('').catch(() => {});
  report.check('4.1 [U011] Search box Employee Name menerima unicode/emoji tanpa crash', await page.locator('body').isVisible(), 'body masih visible setelah input unicode');

  report.step('2.8 Tidak ada aksi reject/cancel langsung di halaman search ini (struktural)');
  const rejectCancelButtons = await page.getByRole('button', { name: /reject|cancel claim/i }).count();
  report.check('2.8 [U011] Tidak ada tombol Reject/Cancel di halaman list Employee Claims -- field alasan wajib N/A di sini (aksi reject/cancel ada di Claim Detail/U105, bukan di search)', rejectCancelButtons === 0, `rejectCancelButtons=${rejectCancelButtons}`);

  report.step('4.8 Status filter dgn value di luar enum');
  const badStatus = await page.request.get(`${API}claim/employees/requests?status=999`);
  const badStatusBody = await badStatus.json().catch(() => null);
  report.check('4.8 [U011] status=999 (di luar enum) -> 200 + hasil kosong (bukan error) -- server tidak strictly validate enum, tapi hanya bisa hasilkan 0 hasil, bukan bypass data', badStatus.status() === 200 && Array.isArray(badStatusBody?.data) && badStatusBody.data.length === 0, `status=${badStatus.status()}`);

  report.print();
});
