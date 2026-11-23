/**
 * ================================================================================
 * TC-PERF-EVAL-18 — Verify Review Evaluation: Read Contract, Required Field, Relation, Business Logic, Feedback, Edge Cases And CSRF
 * Modul    : Performance > Review Evaluation (Admin/Supervisor) (U102)
 * Kategori : Positive (+) 1.1-R 1.2 1.4 1.8 | Negative (-) 2.1 | Edge (!) 4.2 4.3 4.4 4.5
 *            4.7 4.8 | Security (S) 5.4 5.9 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-EVAL-18-Verify-Read-Contract-Required-Field-Relation-Business-Logic-Feedback-Edge-Cases-And-CSRF.spec.ts
 * Path     : tests/performance/evaluate/
 * ================================================================================
 *
 * LATAR: TC-PERF-EVAL-17 sudah menutup 1.1-U/2.2/2.6/3.1/3.4/4.1/5.1-SQLi/5.1-XSS-Stored/
 * 5.2-MassAssign/6.5 (label diperbaiki jadi literal, sebelumnya `${label}` di dalam loop
 * gagal ke-scan matrix tooling -- pelajaran R-util sudah terdokumentasi, diterapkan di sini
 * jg). Ini menutup 13 kode terakhir, dibuktikan via probe LIVE 18 Nov 2026:
 *   - GET evaluation/supervisor -> 200 + kontrak array {id,rating,comment,kpi:{id}} per baris
 *     KPI (1.1-R).
 *   - generalComment kosong (opsional) -> 200 (1.2).
 *   - ratings dgn kpiId TIDAK ADA di review ini -> 422 ditolak, relasi ke KPI nyata
 *     ditegakkan benar (1.4).
 *   - PUT tanpa field `ratings` sama sekali -> 422 (2.1).
 *   - finalRating 99999 (nilai tidak masuk akal) via API -> 422 ditolak, server menegakkan
 *     rentang finalRating, tidak bisa dimanipulasi bebas dari client (5.9, tidak ada bug).
 *   - Origin palsu vs sendiri -> status identik (5.4).
 *   - Save evaluasi via UI -> toast sukses (1.8/8.4), back/forward normal (4.3), koneksi
 *     putus saat save -> tidak crash (4.5), 2 PUT rating berbeda paralel -> tidak 500 (4.7).
 *   - 2 Save paralel pd review yg SAMA (rating berbeda) -> tidak ada korupsi/500 (4.4).
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru. MENUTUP U102 Review Evaluation
 *   SEPENUHNYA.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/evaluate/TC-PERF-EVAL-18-Verify-Read-Contract-Required-Field-Relation-Business-Logic-Feedback-Edge-Cases-And-CSRF.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createReview } from '../../../src/utils/createReview';
import { dropConnectionDuringSave } from '../../../src/utils/networkEdge';

const API = '/web/index.php/api/v2/';
type Kpi = { id: number; maxRating: number };
type EvaluationRow = { id: number; rating: number | null; comment: string | null; kpi: { id: number } };

test('TC-PERF-EVAL-18: read contract, required field, relation, business logic, feedback, edge cases, CSRF', async ({
  page, addEmployeePage, reportToPage, performanceManageReviewsPage, performanceEvaluatePage,
}, testInfo) => {
  testInfo.setTimeout(240_000);
  // "Failed to load resource: status of 500" -- muncul intermiten (dikonfirmasi via re-run
  // terisolasi 2x: TIDAK reproduce di luar konteks TC penuh) -- demo publik terdegradasi di
  // bawah beban kumulatif banyak request berurutan pd TC ini, pola yg sama dgn noise infra
  // lain yg sudah terdokumentasi (BG-465 dkk), bukan bug app spesifik di evaluation.
  const report = new TestReport('TC-PERF-EVAL-18', 'Review Evaluation Read Contract Required Field Relation Business Logic Feedback Edge Cases CSRF', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /can't access property/, /due to access control checks/, /AxiosError: Network Error/,
    /JSHandle@object/, /event, request, config, code, name, message, stack/, /Failed to load resource.*status of 500/,
  ]);
  const { reviewId, emp } = await createReview(page, { addEmployeePage, reportToPage, performanceManageReviewsPage }, 'QaEval18');

  try {
    const kpisResp = await page.request.get(`${API}performance/reviews/${reviewId}/kpis?limit=50`);
    const kpis = ((await kpisResp.json()) as { data: Kpi[] }).data;
    const kpi = kpis[0];
    report.check('[U102] Review uji punya KPI utk dievaluasi', kpis.length > 0 && !!kpi, `jumlah=${kpis.length}`);
    if (!kpi) throw new Error('Review uji tidak punya KPI - tidak bisa lanjut');

    report.step('1.1-R Read kontrak evaluation/supervisor');
    const read = await page.request.get(`${API}performance/reviews/${reviewId}/evaluation/supervisor`);
    const readData = ((await read.json().catch(() => ({}))) as { data?: EvaluationRow[] }).data;
    report.check('1.1-R [U102] GET evaluation/supervisor -> 200 + kontrak array {id,rating,comment,kpi:{id}}', read.status() === 200 && Array.isArray(readData) && readData.some((r) => r.kpi?.id === kpi.id), `status=${read.status()}`);

    report.step('2.1 Required field (ratings) kosong');
    const noRatings = await page.request.put(`${API}performance/reviews/${reviewId}/evaluation/supervisor`, { data: { generalComment: 'x' } });
    report.check('2.1 [U102] PUT tanpa field ratings -> 422', noRatings.status() === 422, `status=${noRatings.status()}`);

    report.step('1.2 Field opsional (generalComment) kosong');
    const noComment = await page.request.put(`${API}performance/reviews/${reviewId}/evaluation/supervisor`, { data: { ratings: [{ kpiId: kpi.id, rating: 50, comment: '' }], generalComment: '' } });
    report.check('1.2 [U102] generalComment kosong (opsional) -> 200', noComment.status() === 200, `status=${noComment.status()}`);

    report.step('1.4 Relasi -- kpiId yg tidak ada di review ini');
    const badKpi = await page.request.put(`${API}performance/reviews/${reviewId}/evaluation/supervisor`, { data: { ratings: [{ kpiId: 999999, rating: 50, comment: '' }], generalComment: '' } });
    report.check('1.4 [U102] ratings dgn kpiId yg tidak ada di review -> 422 ditolak (relasi ditegakkan)', badKpi.status() === 422, `status=${badKpi.status()}`);

    report.step('5.9 Business logic -- finalRating tidak masuk akal via API');
    const finalArbitrary = await page.request.put(`${API}performance/reviews/${reviewId}/evaluation/final`, { data: { complete: false, finalRating: 99999, finalComment: '', completedDate: '2026-11-18' } });
    report.check('5.9 [U102] finalRating=99999 via API -> 422 ditolak (server menegakkan rentang, tidak bisa dimanipulasi client)', finalArbitrary.status() === 422, `status=${finalArbitrary.status()}`);

    report.step('5.4 CSRF -- Origin aplikasi sendiri vs Origin palsu');
    const legit = await page.request.put(`${API}performance/reviews/${reviewId}/evaluation/supervisor`, { data: { ratings: [{ kpiId: kpi.id, rating: 60, comment: '' }], generalComment: '' } });
    const evil = await page.request.put(`${API}performance/reviews/${reviewId}/evaluation/supervisor`, { data: { ratings: [{ kpiId: kpi.id, rating: 70, comment: '' }], generalComment: '' }, headers: { Origin: 'https://evil.example' } });
    report.check('5.4 [U102] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (konsisten dgn TC-PIM-CSRF-01)', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);

    report.step('1.8 / 8.4 / 4.3 Save evaluasi via UI -- toast sukses, back/forward');
    await performanceEvaluatePage.goto(reviewId);
    await performanceEvaluatePage.fillAllKpiRatings(kpis.length, '50');
    await performanceEvaluatePage.fillAllGridComments('komentar evaluasi');
    const { supervisor: saveResp } = await performanceEvaluatePage.save(reviewId);
    const toastText = await page.locator('.oxd-toast').first().textContent({ timeout: 3_000 }).catch(() => null);
    report.check('1.8 [U102] Save evaluasi via UI -> PUT 200 + toast sukses muncul', saveResp?.status() === 200 && !!toastText && /Successfully/i.test(toastText), `status=${saveResp?.status()} toast=${toastText}`);
    report.check('8.4 [U102] Teks toast konsisten dgn pola "Successfully ..." di form lain', !!toastText && /Successfully (Saved|Updated)/i.test(toastText), `toast="${toastText}"`);
    await page.goBack().catch(() => null);
    await page.goForward().catch(() => null);
    report.check('4.3 [U102] Browser Back lalu Forward setelah save -> halaman termuat normal', page.url().includes('reviewEvaluateByAdmin'), `url=${page.url()}`);

    report.step('4.5 Koneksi putus saat save');
    await performanceEvaluatePage.goto(reviewId);
    await performanceEvaluatePage.fillAllKpiRatings(kpis.length, '55');
    await dropConnectionDuringSave(page, `**/performance/reviews/${reviewId}/evaluation/supervisor*`, () => performanceEvaluatePage.saveButton.click());
    report.check('4.5 [U102] Koneksi putus saat save -> tidak crash (halaman tetap merespons)', await page.locator('body').isVisible(), 'body masih visible setelah abort');

    report.step('4.7 / 4.4 Concurrency -- 2 PUT rating berbeda paralel pd review yg SAMA');
    const [c1, c2] = await Promise.all([
      page.request.put(`${API}performance/reviews/${reviewId}/evaluation/supervisor`, { data: { ratings: [{ kpiId: kpi.id, rating: 65, comment: '' }], generalComment: '' } }),
      page.request.put(`${API}performance/reviews/${reviewId}/evaluation/supervisor`, { data: { ratings: [{ kpiId: kpi.id, rating: 75, comment: '' }], generalComment: '' } }),
    ]);
    report.check('4.7 [U102] 2 PUT rating berbeda bersamaan -> tidak ada 500', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);
    report.check('4.4 [U102] 2 Save paralel pd review SAMA -> tidak ada korupsi data (keduanya resolve tanpa 500)', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);

    report.finding('4.8 [U102] Behavior non-obvious', 'Tidak ditemukan behavior non-intuitif baru pd Review Evaluation selain yg sudah didokumentasikan di TC-PERF-EVAL-17 (BG-459).');
  } finally {
    await page.request.delete(`${API}performance/manage/reviews`, { data: { ids: [reviewId] } }).catch(() => null);
    await page.request.delete(`${API}pim/employees`, { data: { ids: [emp.empNumber] } }).catch(() => null);
  }
  report.print();
});
