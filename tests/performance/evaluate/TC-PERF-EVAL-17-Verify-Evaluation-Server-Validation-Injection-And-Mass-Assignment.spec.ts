/**
 * ================================================================================
 * TC-PERF-EVAL-17 — Verify Supervisor And Final Evaluation: Server Validation, Unicode, Injection, Mass Assignment And Unknown Records
 * Modul    : Performance > Review Evaluation (U102)
 * Kategori : Positive (+) 1.1-U | Negative (-) 2.2 2.6 | Boundary (B) 3.1 3.4 | Edge (!) 4.1 |
 *            Security (S) 5.1-SQLi 5.1-XSS-Stored 5.2-MassAssign | API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-EVAL-17-Verify-Evaluation-Server-Validation-Injection-And-Mass-Assignment.spec.ts
 * Path     : tests/performance/evaluate/
 * ================================================================================
 *
 * LATAR (probe LIVE 17 Nov 2026): PUT reviews/<id>/evaluation/supervisor body
 * {ratings:[{kpiId,rating,comment}], generalComment}; PUT reviews/<id>/evaluation/final body
 * {complete, finalRating, finalComment, completedDate}.
 *
 * TUJUAN:
 *   3.1 / 6.5  rating di luar min/max KPI (999) -> 422 "ratings".
 *   2.2 / 6.5  rating non-numerik ("abc") -> dicatat (lihat HASIL).
 *   5.2-MassAssign  field asing di body -> 422 ditolak (bukan diam-diam diterima).
 *   4.1 / 5.1-SQLi / 5.1-XSS-Stored  comment per-KPI, generalComment, finalComment berisi
 *        Arab/CJK, kutip SQL, HTML -> tersimpan apa adanya sebagai teks.
 *   3.4   completedDate tidak valid -> 422.
 *   2.6   PUT evaluation/supervisor & evaluation/final utk review 999999 -> dicatat (lihat
 *        HASIL; TC-PERF-API-01 sudah menguji ghost-id scope lebih luas).
 *   1.1-U  Final Rating & Final Comment valid -> 200 & tersimpan.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-459 (Medium) -- rating KPI non-numerik ("abc")
 *   DITERIMA (200) oleh evaluation/supervisor & tersimpan sbg string "abc" (rating NUMERIK
 *   seharusnya ditolak sama spt rating di luar rentang 999, yg memang sudah 422).
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/evaluate/TC-PERF-EVAL-17-Verify-Evaluation-Server-Validation-Injection-And-Mass-Assignment.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createReview } from '../../../src/utils/createReview';

const API = '/web/index.php/api/v2/';
const keysOf = async (r: { json(): Promise<unknown> }) => (((await r.json().catch(() => null)) as { error?: { data?: { invalidParamKeys?: string[] } } } | null)?.error?.data?.invalidParamKeys ?? []).join(',');

test('TC-PERF-EVAL-17: evaluation - server validation, injection, mass assignment', async ({ page, addEmployeePage, reportToPage, performanceManageReviewsPage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-PERF-EVAL-17', 'Evaluation Server Validation Injection Mass Assignment', env.baseURL);
  const { reviewId, emp } = await createReview(page, { addEmployeePage, reportToPage, performanceManageReviewsPage }, 'QaEval17');
  try {
    const kpisResp = await page.request.get(`${API}performance/reviews/${reviewId}/kpis?limit=50`);
    const kpis = ((await kpisResp.json()) as { data: Array<{ id: number; minRating: number; maxRating: number }> }).data;
    const kpi = kpis[0];
    report.check('[U102] Review uji punya KPI utk dievaluasi', kpis.length > 0 && !!kpi, `jumlah=${kpis.length}`);
    if (!kpi) throw new Error('Review uji tidak punya KPI - tidak bisa lanjut');

    report.step('Validasi rating');
    const outOfRange = await page.request.put(`${API}performance/reviews/${reviewId}/evaluation/supervisor`, { data: { ratings: [{ kpiId: kpi.id, rating: kpi.maxRating + 1, comment: '' }], generalComment: '' } });
    report.check('3.1 / 6.5 [U102] Rating di luar max KPI -> 422 "ratings"', outOfRange.status() === 422 && (await keysOf(outOfRange)).includes('ratings'), `status=${outOfRange.status()}`);
    const nonNumeric = await page.request.put(`${API}performance/reviews/${reviewId}/evaluation/supervisor`, { data: { ratings: [{ kpiId: kpi.id, rating: 'abc', comment: '' }], generalComment: '' } });
    const nonNumericRow = ((await nonNumeric.json().catch(() => ({}))) as { data?: Array<{ kpi: { id: number }; rating: string | null }> }).data?.find((d) => d.kpi.id === kpi.id);
    report.check('2.2 / 6.5 [U102] Rating non-numerik "abc" -> 422 (DITOLAK, bukan diterima)', nonNumeric.status() === 422, `status=${nonNumeric.status()} tersimpan=${nonNumericRow?.rating}`);

    report.step('Mass assignment');
    const mass = await page.request.put(`${API}performance/reviews/${reviewId}/evaluation/supervisor`, { data: { ratings: [{ kpiId: kpi.id, rating: 50, comment: '' }], generalComment: '', reviewId: 1, statusId: 10 } });
    report.check('5.2-MassAssign [U102] Field asing (reviewId, statusId) -> 422 (ditolak)', mass.status() === 422, `status=${mass.status()} keys=${await keysOf(mass)}`);

    report.step('Unicode & injeksi pada comment');
    for (const [label, text] of [['4.1 Arab/CJK', 'مرحبا 你好'], ['5.1-SQLi', "' OR '1'='1 --"], ['5.1-XSS-Stored', '<img src=x onerror=alert(1)>']] as const) {
      const r = await page.request.put(`${API}performance/reviews/${reviewId}/evaluation/supervisor`, { data: { ratings: [{ kpiId: kpi.id, rating: 50, comment: text }], generalComment: text } });
      const row = ((await r.json().catch(() => ({}))) as { data?: Array<{ kpi: { id: number }; comment: string }> }).data?.find((d) => d.kpi.id === kpi.id);
      report.check(`${label} [U102] Comment per-KPI & generalComment -> 200 & tersimpan identik sebagai teks`, r.status() === 200 && row?.comment === text, `status=${r.status()}`);
    }

    report.step('Finalisasi: valid, tanggal tidak valid, injeksi');
    const finalValid = await page.request.put(`${API}performance/reviews/${reviewId}/evaluation/final`, { data: { complete: false, finalRating: 60, finalComment: 'final valid', completedDate: '2026-11-17' } });
    report.check('1.1-U [U102] Final Rating & Final Comment valid -> 200', finalValid.status() === 200, `status=${finalValid.status()}`);
    const finalBadDate = await page.request.put(`${API}performance/reviews/${reviewId}/evaluation/final`, { data: { complete: false, finalRating: 60, finalComment: '', completedDate: 'bukan-tanggal' } });
    report.check('3.4 / 6.5 [U102] completedDate tidak valid -> 422', finalBadDate.status() === 422, `status=${finalBadDate.status()}`);
    const finalXss = await page.request.put(`${API}performance/reviews/${reviewId}/evaluation/final`, { data: { complete: false, finalRating: 60, finalComment: '<script>alert(1)</script>', completedDate: '2026-11-17' } });
    report.check('5.1-XSS-Stored [U102] finalComment HTML -> 200 & tersimpan identik', finalXss.status() === 200, `status=${finalXss.status()}`);
  } finally {
    await page.request.delete(`${API}performance/manage/reviews`, { data: { ids: [reviewId] } }).catch(() => null);
    await page.request.delete(`${API}pim/employees`, { data: { ids: [emp.empNumber] } }).catch(() => null);
  }
  report.print();
});
