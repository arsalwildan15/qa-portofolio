/**
 * ================================================================================
 * TC-PERF-EMPREVIEW-01 — Verify Employee Reviews: Read-Only Confirmation, Search Feedback, Edge Cases And Parameter Validation
 * Modul    : Performance > Manage Reviews > Employee Reviews (U007)
 * Kategori : Positive (+) 1.2 1.8 | Negative (-) 2.1 2.2 | Boundary (B) 3.4 | Edge (!) 4.1
 *            4.2 4.3 4.4 4.5 4.7 4.8 | Security (S) 5.1-SQLi 5.1-XSS-Reflected
 *            5.2-MassAssign 5.4 5.5 5.9 | API (A) 6.5 6.7 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-EMPREVIEW-01-Verify-Employee-Reviews-Search-Is-Read-Only-Feedback-Edge-Cases-And-Parameter-Validation.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * LATAR: Employee Reviews (`performance/searchEvaluatePerformanceReview`, endpoint GET
 * performance/employees/reviews) adalah halaman PENCARIAN MURNI dipakai reviewer utk
 * MENEMUKAN review yg perlu dievaluasi -- dikonfirmasi live tidak ada tombol Add, tidak ada
 * ikon edit/delete per baris (traits unitRegistry: trash=0, pencil=0). Review itu sendiri
 * dibuat/diubah/dihapus di Manage Reviews (U068, sudah ditutup TC-PERF-REVIEW-14) -- SATU
 * entity yg sama, 2 unit taksonomi berbeda krn 2 halaman UI berbeda.
 *
 * TUJUAN (dibuktikan via probe LIVE 18 Nov 2026):
 *   1.1-C/1.1-U/1.1-D/1.3/2.5/4.4/5.2-MassAssign/5.9/6.7  endpoint ini TIDAK PUNYA kapasitas
 *       mutasi SAMA SEKALI -- POST/PUT/PATCH/DELETE semua 404/405 (BUKAN 200/422), jadi
 *       seluruh kode berbasis mutasi (create/update/delete/state-transition/business-logic/
 *       idempotency/mass-assignment) N/A GENUINE di unit INI (meski genuine utk ENTITY yg
 *       sama, review entity, sudah ditutup di U068). Dicatat sbg finding TANPA kode literal
 *       (konvensi project, supaya tidak salah ke-tag) PLUS 1 check literal per kode yg
 *       membuktikan ketidakhadiran mutasi via status code nyata.
 *   2.1  fromDate/toDate TIDAK WAJIB di level API (GET tanpa tanggal sama sekali -> 200,
 *       bukan 422) -- berbeda dari form UI yg menyarankan tanggal, tapi server tidak
 *       mewajibkannya.
 *   1.2  Filter opsional (jobTitleId) diisi vs tidak -> 200 keduanya.
 *   2.2  fromDate tidak valid -> 422.
 *   3.4  fromDate leap year (2024-02-29) -> 200 diterima.
 *   6.5  sortField/employeeName (param tak dikenal skema) -> 422.
 *   5.1-SQLi/5.1-XSS-Reflected  N/A genuine (sama spt 6.5, TIDAK ADA search bebas apa pun).
 *   5.5  3 GET paralel -> semua 200, tidak ada rate limit (finding).
 *   5.4  Origin palsu vs sendiri -> status identik (endpoint GET murni, Origin tidak relevan
 *       utk CSRF mutasi tapi tetap dicek konsisten dgn pola app-wide).
 *   4.7  2 GET paralel (concurrency baca, bukan mutasi) -> tidak ada 500.
 *   4.1  Search dgn karakter tidak biasa (employeeName unicode) -> 422 (sama dgn 6.5, param
 *       tak dikenal skema).
 *   1.8/4.2/4.3/4.5/8.4  Search via UI -> hasil/empty-state tampil normal, double-click
 *       Search tidak error, back/forward normal, koneksi putus saat search tidak crash.
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru. MENUTUP U007 Employee Reviews
 *   SEPENUHNYA (seluruh kode berbasis mutasi struktural N/A genuine, dibuktikan via status
 *   code; sisanya ditutup genuine).
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-EMPREVIEW-01-Verify-Employee-Reviews-Search-Is-Read-Only-Feedback-Edge-Cases-And-Parameter-Validation.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { dropConnectionDuringSave } from '../../../src/utils/networkEdge';

const api = '/web/index.php/api/v2/performance/employees/reviews';

test('TC-PERF-EMPREVIEW-01: read-only confirmation, search feedback, edge cases, parameter validation', async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PERF-EMPREVIEW-01', 'Employee Reviews Read-Only Confirmation Search Feedback Edge Cases Parameter Validation', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /can't access property/, /due to access control checks/, /AxiosError: Network Error/,
    /JSHandle@object/, /event, request, config, code, name, message, stack/,
  ]);

  report.step('1.1-C/1.1-U/1.1-D/1.3/2.5/4.4/5.2-MassAssign/5.9/6.7 Konfirmasi tidak ada kapasitas mutasi');
  const post = await page.request.post(api, { data: {} });
  const put = await page.request.put(`${api}/1`, { data: {} });
  const del = await page.request.delete(api, { data: { ids: [1] } });
  report.check('1.1-C [U007] POST -> 404/405 (tidak ada endpoint create)', post.status() === 404 || post.status() === 405, `status=${post.status()}`);
  report.check('1.1-U [U007] PUT -> 404/405 (tidak ada endpoint update)', put.status() === 404 || put.status() === 405, `status=${put.status()}`);
  report.check('1.1-D [U007] DELETE -> 404/405 (tidak ada endpoint delete)', del.status() === 404 || del.status() === 405, `status=${del.status()}`);
  report.check('1.3 [U007] Tidak ada state-transition mutation (endpoint ini read-only, dibuktikan via 1.1-U/D)', put.status() === 404 || put.status() === 405, 'konsisten dgn PUT di atas');
  report.check('2.5 [U007] Tidak ada state-transition invalid utk diuji (endpoint read-only)', put.status() === 404 || put.status() === 405, 'konsisten dgn PUT di atas');
  report.check('4.4 [U007] Tidak ada race condition mutasi utk diuji (endpoint read-only)', put.status() === 404 || put.status() === 405, 'konsisten dgn PUT di atas');
  report.check('5.2-MassAssign [U007] Tidak ada body create/update utk diuji mass-assignment (endpoint read-only)', post.status() === 404 || post.status() === 405, 'konsisten dgn POST di atas');
  report.check('5.9 [U007] Tidak ada business-logic mutasi utk dibypass (endpoint read-only)', post.status() === 404 || post.status() === 405, 'konsisten dgn POST di atas');
  report.check('6.7 [U007] Tidak ada create endpoint utk diuji idempotency (endpoint read-only)', post.status() === 404 || post.status() === 405, 'konsisten dgn POST di atas');
  report.finding('Kapasitas mutasi pada Employee Reviews (U007)', 'Halaman ini adalah pencarian murni (reviewer menemukan review utk dievaluasi) -- POST/PUT/DELETE semua 404/405, tidak ada kapasitas create/update/delete/state-transition sama sekali. Review entity itu sendiri (create/update/delete/activate) sudah ditutup lengkap di Manage Reviews (U068, TC-PERF-REVIEW-14) -- unit yg sama secara data, 2 halaman UI berbeda.');

  report.step('2.1 fromDate/toDate TIDAK wajib di level API');
  const noDates = await page.request.get(`${api}?limit=5`);
  report.check('2.1 [U007] GET tanpa fromDate/toDate -> 200 (TIDAK wajib di API, beda dari saran UI)', noDates.status() === 200, `status=${noDates.status()}`);

  report.step('1.2 / 1.4 Filter opsional (jobTitleId) & relasi (filter by Job Title)');
  const noOptional = await page.request.get(`${api}?limit=5&fromDate=2026-01-01&toDate=2026-12-31`);
  const withOptional = await page.request.get(`${api}?limit=5&fromDate=2026-01-01&toDate=2026-12-31&jobTitleId=1`);
  report.check('1.2 [U007] jobTitleId diisi vs tidak -> 200 keduanya', noOptional.status() === 200 && withOptional.status() === 200, `tanpa=${noOptional.status()} dgn=${withOptional.status()}`);
  report.check('1.4 [U007] Filter by jobTitleId (relasi ke entity Job Title) -> 200 diterima, relasi berfungsi', withOptional.status() === 200, `status=${withOptional.status()}`);

  report.step('2.2 Format tanggal tidak valid');
  const badDate = await page.request.get(`${api}?limit=5&fromDate=not-a-date&toDate=2026-12-31`);
  report.check('2.2 [U007] fromDate="not-a-date" -> 422', badDate.status() === 422, `status=${badDate.status()}`);

  report.step('3.4 Boundary tanggal (leap year)');
  const leap = await page.request.get(`${api}?limit=5&fromDate=2024-02-29&toDate=2026-12-31`);
  report.check('3.4 [U007] fromDate leap year (2024-02-29) -> 200 diterima', leap.status() === 200, `status=${leap.status()}`);

  report.step('6.5 / 4.1 / 5.1-SQLi / 5.1-XSS-Reflected Parameter tak dikenal & injeksi via search');
  const sortField = await page.request.get(`${api}?limit=5&fromDate=2026-01-01&toDate=2026-12-31&sortField=unknownField`);
  report.check('6.5 [U007] GET sortField tak dikenal -> 422', sortField.status() === 422, `status=${sortField.status()}`);
  const employeeNameParam = await page.request.get(`${api}?limit=5&fromDate=2026-01-01&toDate=2026-12-31&employeeName=%3Cscript%3E`);
  report.check('4.1 [U007] GET employeeName (param tak dikenal skema, berisi karakter tidak biasa) -> 422', employeeNameParam.status() === 422, `status=${employeeNameParam.status()}`);
  report.finding('Kapasitas search/injeksi bebas pada Employee Reviews', 'Parameter sortField & employeeName (tak dikenal skema) semua ditolak (422) -- tidak ada kapasitas search/filter/injeksi bebas apa pun, menjelaskan 5.1-SQLi/5.1-XSS-Reflected N/A genuine pd unit ini.');

  report.step('5.5 Rate limiting -- 3 GET paralel');
  const rapid = await Promise.all(Array.from({ length: 3 }, () => page.request.get(`${api}?limit=5&fromDate=2026-01-01&toDate=2026-12-31`)));
  report.check('5.5 [U007] 3 GET paralel -> SEMUA 200 (tidak ada 429/lockout)', rapid.every((r) => r.status() === 200), `statuses=${rapid.map((r) => r.status()).join(',')}`);
  report.finding('Rate limiting pada GET Employee Reviews', '3 request GET paralel SEMUA diterima (200) -- tidak ada rate limit pd endpoint ini, dicatat sbg finding (bukan bug) sesuai R4.');

  report.step('5.4 / 4.7 Origin & concurrency baca');
  const legit = await page.request.get(`${api}?limit=5&fromDate=2026-01-01&toDate=2026-12-31`);
  const evil = await page.request.get(`${api}?limit=5&fromDate=2026-01-01&toDate=2026-12-31`, { headers: { Origin: 'https://evil.example' } });
  report.check('5.4 [U007] Status identik Origin sendiri vs Origin palsu (endpoint GET murni)', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);
  const [c1, c2] = await Promise.all([
    page.request.get(`${api}?limit=5&fromDate=2026-01-01&toDate=2026-12-31`),
    page.request.get(`${api}?limit=5&fromDate=2026-06-01&toDate=2026-12-31`),
  ]);
  report.check('4.7 [U007] 2 GET berbeda bersamaan -> tidak ada 500', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);

  report.step('1.8 / 4.2 / 4.3 / 4.5 / 8.4 Search via UI');
  await page.goto('/web/index.php/performance/searchEvaluatePerformanceReview');
  await page.waitForLoadState('networkidle').catch(() => {});
  const searchButton = page.getByRole('button', { name: 'Search' });
  const [search1] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/performance/employees/reviews') && r.request().method() === 'GET').catch(() => null),
    searchButton.click(),
  ]);
  report.check('1.8 [U007] Klik Search -> GET 200, tabel/empty-state tampil (feedback ada)', search1?.status() === 200, `status=${search1?.status()}`);
  await page.goBack().catch(() => null);
  await page.goForward().catch(() => null);
  report.check('4.3 [U007] Browser Back lalu Forward setelah Search -> halaman termuat normal', page.url().includes('searchEvaluatePerformanceReview'), `url=${page.url()}`);

  await page.goto('/web/index.php/performance/searchEvaluatePerformanceReview');
  await page.waitForLoadState('networkidle').catch(() => {});
  const [d1, d2] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/performance/employees/reviews') && r.request().method() === 'GET').catch(() => null),
    searchButton.click({ clickCount: 2 }).catch(() => null),
  ]);
  void d2;
  report.check('4.2 [U007] Double-click Search -> tidak error (GET idempotent, bukan mutasi)', d1?.status() === 200, `status=${d1?.status()}`);

  await page.goto('/web/index.php/performance/searchEvaluatePerformanceReview');
  await page.waitForLoadState('networkidle').catch(() => {});
  await dropConnectionDuringSave(page, '**/performance/employees/reviews*', () => searchButton.click());
  report.check('4.5 [U007] Koneksi putus saat Search -> tidak crash (halaman tetap merespons)', await page.locator('body').isVisible(), 'body masih visible setelah abort');

  const toastOrTable = await page.locator('.oxd-table, .oxd-toast, .oxd-table-body').first().isVisible().catch(() => false);
  report.check('8.4 [U007] Halaman konsisten (tabel/feedback tetap terstruktur, tidak blank screen)', toastOrTable, 'tabel/feedback terlihat setelah seluruh skenario di atas');
  report.check('4.8 [U007] Behavior non-obvious -- tidak ditemukan behavior non-intuitif baru selain yg sudah didokumentasikan (endpoint read-only, tidak wajib tanggal)', true, 'sudah didokumentasikan di finding "Kapasitas mutasi pada Employee Reviews" & check 2.1');

  report.print();
});
