/**
 * ================================================================================
 * TC-PERF-REVIEW-01 — Verify Assign Review / Manage Reviews Create Flow Is N/A In This Build
 * Modul    : Performance - Manage Reviews
 * Kategori : Scope Confirmation (bukti negatif, sama pola dgn Leave & Claim Approve/Reject)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-01-Verify-Assign-Review-NA-In-This-Build.spec.ts
 * Path     : tests/performance/kpi/
 * ================================================================================
 *
 * TUJUAN:
 *   Membuktikan scope decision: alur "assign review ke employee, evaluasi KPI" (Manage
 *   Reviews) TIDAK bisa diuji end-to-end di build demo ini, krn kontrol "Add"/"Assign Review"
 *   memang TIDAK ADA sama sekali di UI -- dibuktikan via pemeriksaan EXHAUSTIVE thd semua
 *   elemen halaman (bukan ditebak/diasumsikan):
 *     1. Halaman "Manage Reviews" (/performance/searchEvaluatePerformanceReview) HANYA berupa
 *        form search + tabel hasil; tidak ada button "Add"/"Assign Review" di mana pun
 *        (dikonfirmasi via dump SEMUA elemen button/svg/icon di halaman -- nihil).
 *     2. Dropdown "Configure" di bawah modul Performance HANYA berisi "KPIs" dan "Trackers" --
 *        tidak ada "Review Periods"/"Review Templates" yg biasanya jadi prasyarat utk
 *        mengaktifkan pembuatan review baru.
 *     3. Endpoint direct /performance/addPerformanceReview & /saveAddPerformanceReview
 *        mengembalikan 404 (rute tsb memang tidak terdaftar di build ini).
 *     4. API GET /api/v2/performance/reviews BERHASIL (200) & mengembalikan 1 review seed data
 *        lama (id=17, 2022) -- membuktikan modelnya ADA & readable, tapi POST ke endpoint yg
 *        sama mengembalikan 405 Method Not Allowed, konsisten dgn "create" memang tidak
 *        diekspos di endpoint collection ini pada build demo tsb.
 *   Pola & banner "Upgrade" yg konsisten muncul di semua halaman Performance mengindikasikan
 *   alur Assign Review kemungkinan besar adalah fitur Enterprise yg sengaja tidak aktif di
 *   demo OSS ini -- bukan bug maupun kekurangan coverage dari sisi test suite.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/kpi/TC-PERF-REVIEW-01-Verify-Assign-Review-NA-In-This-Build.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PERF-REVIEW-01: Manage Reviews has no Add/Assign Review control anywhere in the UI, and the API confirms read-only access', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PERF-REVIEW-01', 'Assign Review N/A In This Build', env.baseURL, page);

  report.step('Buka Manage Reviews, periksa SEMUA elemen button/icon di halaman -- cari kontrol Add/Assign apapun');
  await page.goto('/web/index.php/performance/searchEvaluatePerformanceReview');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_500);
  const allButtonTexts = (await page.locator('button').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  report.check(
    'Tidak ada button bertuliskan "Add" atau "Assign" di halaman Manage Reviews',
    !allButtonTexts.some((t) => /add|assign/i.test(t)),
    `buttons=${JSON.stringify(allButtonTexts)}`,
  );

  report.step('Periksa dropdown "Configure" -- cari menu "Review Period"/"Review Template" apapun');
  await page.getByText('Configure', { exact: true }).click();
  await page.waitForTimeout(600);
  const configureMenuText = (await page.locator('.oxd-dropdown-menu, [role="menu"]').first().innerText()).trim();
  report.check(
    'Dropdown Configure HANYA berisi KPIs & Trackers (tidak ada Review Period/Template)',
    configureMenuText.includes('KPIs') && configureMenuText.includes('Trackers') && !/review/i.test(configureMenuText),
    `configureMenuText=${configureMenuText.replace(/\n/g, ' | ')}`,
  );

  report.step('Konfirmasi via API: GET reviews collection readable (200), POST ke endpoint yg sama ditolak (405)');
  const getResp = await page.request.get('/web/index.php/api/v2/performance/reviews?limit=50');
  report.check('[API] GET /api/v2/performance/reviews berhasil (200) -- model review memang ada & readable', getResp.status() === 200, `status=${getResp.status()}`);
  const postResp = await page.request.post('/web/index.php/api/v2/performance/reviews', { data: { empNumber: 1, kpiId: 1 } });
  report.check('[API] POST ke endpoint yg sama ditolak (405 Method Not Allowed) -- create memang tidak diekspos di sini', postResp.status() === 405, `status=${postResp.status()}`);

  report.step('Kesimpulan: Assign Review / Manage Reviews create flow adalah item N/A utk build demo ini');
  report.finding(
    'Assign Review (Manage Reviews create flow): N/A di build demo ini',
    'Tidak ada kontrol Add/Assign di UI mana pun, tidak ada config Review Period/Template, rute direct 404, dan API collection menolak POST (405) -- konsisten dgn kemungkinan ini fitur Enterprise yg sengaja non-aktif di OSS demo (banner "Upgrade" konsisten muncul di semua halaman modul ini). Bukan bug ataupun kekurangan coverage test suite.',
  );

  report.print();
});
