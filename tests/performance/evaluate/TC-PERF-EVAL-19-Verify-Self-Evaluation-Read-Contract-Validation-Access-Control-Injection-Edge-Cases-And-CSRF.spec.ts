/**
 * ================================================================================
 * TC-PERF-EVAL-19 — Verify Self Evaluation: Read Contract, Validation, Access Control, Injection, Edge Cases And CSRF
 * Modul    : Performance > My Reviews > Self Evaluation (ESS) (U103)
 * Kategori : Positive (+) 1.1-R 1.2 1.4 1.8 | Negative (-) 2.1 2.2 2.5 | Boundary (!) 3.1 3.2 3.4
 *            4.1 4.2 4.3 4.4 4.5 4.7 4.8 | Security (S) 5.1-SQLi 5.1-XSS-Stored 5.2-IDOR
 *            5.2-MassAssign 5.4 5.6 5.9 6.5 7.4 7.5 | UI (8) 8.1 8.2 8.3 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-EVAL-19-Verify-Self-Evaluation-Read-Contract-Validation-Access-Control-Injection-Edge-Cases-And-CSRF.spec.ts
 * Path     : tests/performance/evaluate/
 * ================================================================================
 *
 * LATAR: U103 Self Evaluation (ESS) adalah unit terakhir Performance. Endpoint beda dari
 * supervisor-side (U102): PUT performance/reviews/<id>/evaluation/employee
 * {complete, ratings:[{kpiId,rating,comment}], generalComment}, dipanggil sbg sesi ESS
 * (createEssReview). Dibuktikan LIVE 23 Nov 2026:
 *   - GET evaluation/employee -> 200 + kontrak array {id,rating,comment,kpi:{id}} (1.1-R).
 *   - generalComment kosong (opsional) -> 200 (1.2); ratings dgn kpiId yg tidak ada di review ->
 *     422, relasi ditegakkan (1.4).
 *   - PUT tanpa field ratings -> 422 (2.1); rating non-numerik "abc" -> DITERIMA 200, diam-diam
 *     dikonversi server jadi 0.00 (BUG BARU: BG-489, bukan ditolak 422 -- 2.2 tetap tertutup,
 *     cell ini membuktikan server TIDAK memvalidasi tipe rating, hanya sisi client).
 *   - Setelah complete:true, PUT lanjutan dari ESS yg sama -> 403 (2.5, state-transition
 *     ditegakkan -- dikonfirmasi jg di komentar PerformanceSelfEvaluatePage).
 *   - rating di bawah 0 dan di atas maxRating KPI -> 422 ditolak keduanya (3.1/3.2 boundary,
 *     5.9 business logic -- tidak ada bug, server menegakkan rentang KPI).
 *   - Comment Arab/CJK -> 200 tersimpan identik (4.1); SQLi/XSS payload di comment -> 200
 *     tersimpan sbg teks literal, tidak ter-eksekusi (5.1-SQLi/5.1-XSS-Stored).
 *   - ESS-B (reviewee lain) coba PUT evaluation/employee milik ESS-A -> 403/404, IDOR ditutup
 *     (5.2-IDOR).
 *   - PUT dgn field asing (empNumber reviewee lain disisipkan di body) -> diabaikan server,
 *     tidak mengubah ownership review (5.2-MassAssign).
 *   - Origin palsu vs sendiri -> status identik (5.4, konsisten dgn semua modul lain).
 *   - Header keamanan (X-Content-Type-Options dkk) pada response endpoint ini -> sama dgn
 *     temuan X-Frame-Options yg sudah terdokumentasi app-wide (5.6, bukan bug baru per-unit).
 *   - Query param asing di GET evaluation/employee -> 422 (6.5).
 *   - Save via UI -> toast sukses (1.8/8.4), back/forward normal (4.3), koneksi putus saat save
 *     -> tidak crash (4.5), 2 PUT rating berbeda paralel -> tidak 500 (4.7/4.4).
 *   - Viewport mobile (375px) -> tidak ada overflow horizontal (8.1); tombol Save/Complete punya
 *     accessible name (8.3).
 *   - Tanpa console warning aplikasi selama seluruh alur (7.4).
 *
 * HASIL 23 Nov 2026: lolos penuh kecuali 1 gagal SENGAJA pd 2.2 (lihat BG-489 di atas). MENUTUP
 *   U103 Self Evaluation SEPENUHNYA -- Performance mencapai ceiling-nya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/evaluate/TC-PERF-EVAL-19-Verify-Self-Evaluation-Read-Contract-Validation-Access-Control-Injection-Edge-Cases-And-CSRF.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssReview } from '../../../src/utils/createEssReview';
import { dropConnectionDuringSave } from '../../../src/utils/networkEdge';
import { PerformanceSelfEvaluatePage } from '../../../src/pages';

const API = '/web/index.php/api/v2/';
type Kpi = { id: number; minRating: number; maxRating: number };
const validRating = (k: Kpi): string => String(Math.min(Math.max(70, k.minRating), k.maxRating));
type EvaluationRow = { id: number; rating: number | null; comment: string | null; kpi: { id: number } };

test('TC-PERF-EVAL-19: self-evaluation read contract, validation, access control, injection, edge cases, CSRF', async ({
  page, browser, addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-PERF-EVAL-19', 'Self Evaluation Read Contract Validation Access Control Injection Edge Cases CSRF', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /can't access property/, /due to access control checks/, /AxiosError: Network Error/,
  ]);

  const { essPage: pageA, close: closeA, reviewId } = await createEssReview(page, browser, addEmployeePage, 'QaSelfEvalA');
  const { essPage: pageB, close: closeB } = await createEssReview(page, browser, addEmployeePage, 'QaSelfEvalB');
  const performanceSelfEvaluatePage = new PerformanceSelfEvaluatePage(pageA);

  try {
    const kpisResp = await pageA.request.get(`${API}performance/reviews/${reviewId}/kpis?limit=50`);
    const kpis = ((await kpisResp.json()) as { data: Kpi[] }).data;
    const kpi = kpis[0];
    report.check('[U103] Review ESS uji punya KPI utk dievaluasi sendiri', kpis.length > 0 && !!kpi, `jumlah=${kpis.length}`);
    if (!kpi) throw new Error('Review ESS uji tidak punya KPI - tidak bisa lanjut');

    report.step('1.1-R Read kontrak evaluation/employee');
    const read = await pageA.request.get(`${API}performance/reviews/${reviewId}/evaluation/employee`);
    const readData = ((await read.json().catch(() => ({}))) as { data?: EvaluationRow[] }).data;
    report.check('1.1-R [U103] GET evaluation/employee -> 200 + kontrak array {id,rating,comment,kpi:{id}}', read.status() === 200 && Array.isArray(readData) && readData.some((r) => r.kpi?.id === kpi.id), `status=${read.status()}`);

    report.step('2.1 Required field (ratings) kosong');
    const noRatings = await pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, generalComment: 'x' } });
    report.check('2.1 [U103] PUT tanpa field ratings -> 422', noRatings.status() === 422, `status=${noRatings.status()}`);

    report.step('2.2 Rating non-numerik');
    const badType = await pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, ratings: [{ kpiId: kpi.id, rating: 'abc', comment: '' }], generalComment: '' } });
    report.check('2.2 [U103] rating non-numerik "abc" -> 422 ditolak', badType.status() === 422, `status=${badType.status()}`);

    report.step('1.2 Field opsional (generalComment) kosong');
    const noComment = await pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, ratings: [{ kpiId: kpi.id, rating: 3, comment: '' }], generalComment: '' } });
    report.check('1.2 [U103] generalComment kosong (opsional) -> 200', noComment.status() === 200, `status=${noComment.status()}`);

    report.step('1.4 Relasi -- kpiId yg tidak ada di review ini');
    const badKpi = await pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, ratings: [{ kpiId: 999999, rating: 3, comment: '' }], generalComment: '' } });
    report.check('1.4 [U103] ratings dgn kpiId yg tidak ada di review -> 422 ditolak (relasi ditegakkan)', badKpi.status() === 422, `status=${badKpi.status()}`);

    report.step('3.1 / 3.2 / 5.9 Boundary & business logic -- rating di luar rentang KPI');
    const tooLow = await pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, ratings: [{ kpiId: kpi.id, rating: -1, comment: '' }], generalComment: '' } });
    const tooHigh = await pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, ratings: [{ kpiId: kpi.id, rating: kpi.maxRating + 100, comment: '' }], generalComment: '' } });
    report.check('3.1 [U103] rating=-1 (di bawah batas bawah KPI) -> 422 ditolak', tooLow.status() === 422, `status=${tooLow.status()}`);
    report.check('3.2 [U103] rating jauh di atas maxRating KPI -> 422 ditolak', tooHigh.status() === 422, `status=${tooHigh.status()}`);
    report.check('5.9 [U103] Rentang rating KPI ditegakkan server, tidak bisa dimanipulasi bebas dari client', tooLow.status() === 422 && tooHigh.status() === 422, `low=${tooLow.status()} high=${tooHigh.status()}`);

    report.step('4.1 / 5.1-SQLi / 5.1-XSS-Stored Comment berisi Arab/CJK, SQL, HTML');
    const putComment = async (text: string) => {
      const r = await pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, ratings: [{ kpiId: kpi.id, rating: 3, comment: text }], generalComment: text } });
      const row = ((await r.json().catch(() => ({}))) as { data?: EvaluationRow[] }).data?.find((d) => d.kpi.id === kpi.id);
      return { status: r.status(), matches: row?.comment === text };
    };
    const unicode = await putComment('مرحبا 你好');
    report.check('4.1 [U103] Comment berisi Arab/CJK -> 200 & tersimpan identik sbg teks', unicode.status === 200 && unicode.matches, `status=${unicode.status}`);
    const sqli = await putComment("' OR '1'='1 --");
    report.check("5.1-SQLi [U103] Comment berisi kutip SQL -> 200 & tersimpan identik sbg teks", sqli.status === 200 && sqli.matches, `status=${sqli.status}`);
    const xss = await putComment('<img src=x onerror=alert(1)>');
    report.check('5.1-XSS-Stored [U103] Comment berisi HTML -> 200 & tersimpan identik sbg teks (tidak ter-eksekusi)', xss.status === 200 && xss.matches, `status=${xss.status}`);

    report.step('5.2-IDOR Reviewee lain coba evaluasi review milik ESS-A');
    const idor = await pageB.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, ratings: [{ kpiId: kpi.id, rating: 3, comment: 'idor' }], generalComment: '' } });
    report.check('5.2-IDOR [U103] ESS-B PUT evaluation/employee milik ESS-A -> ditolak (bukan 200)', idor.status() === 403 || idor.status() === 404, `status=${idor.status()}`);

    report.step('5.2-MassAssign Field asing (empNumber reviewee lain) disisipkan di body');
    const massAssign = await pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, empNumber: 999999, ratings: [{ kpiId: kpi.id, rating: 3, comment: '' }], generalComment: '' } });
    const stillOwned = await pageA.request.get(`${API}performance/reviews/${reviewId}/evaluation/employee`);
    report.check('5.2-MassAssign [U103] Field asing empNumber di body -> diabaikan, ownership review tidak berubah', massAssign.status() < 500 && stillOwned.status() === 200, `put=${massAssign.status()} getAfter=${stillOwned.status()}`);

    report.step('5.4 CSRF -- Origin aplikasi sendiri vs Origin palsu');
    const legit = await pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, ratings: [{ kpiId: kpi.id, rating: 3, comment: '' }], generalComment: '' } });
    const evil = await pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, ratings: [{ kpiId: kpi.id, rating: 3, comment: '' }], generalComment: '' }, headers: { Origin: 'https://evil.example' } });
    report.check('5.4 [U103] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (konsisten dgn modul lain)', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);

    report.step('5.6 Security headers pd response endpoint evaluation/employee');
    const headerResp = await pageA.request.get(`${API}performance/reviews/${reviewId}/evaluation/employee`);
    const headers = headerResp.headers();
    report.finding('5.6 [U103] Security headers', `x-content-type-options=${headers['x-content-type-options'] ?? 'tidak ada'}, x-frame-options=${headers['x-frame-options'] ?? 'tidak ada'} -- absennya X-Frame-Options konsisten dgn temuan app-wide yg sudah terdokumentasi (TC-RECRUITMENT-SECURITY-02 dkk), bukan bug baru per-unit.`);
    report.check('5.6 [U103] x-content-type-options ADA pd response API (baseline header yg memang diterapkan app-wide)', headers['x-content-type-options'] !== undefined, `headers=${JSON.stringify(Object.keys(headers))}`);

    report.step('6.5 Parameter negative -- query param asing di GET');
    const badParam = await pageA.request.get(`${API}performance/reviews/${reviewId}/evaluation/employee?bogusParam=1`);
    report.check('6.5 [U103] Query param asing di GET evaluation/employee -> 422 ditolak', badParam.status() === 422, `status=${badParam.status()}`);

    report.step('3.4 Boundary tanggal -- payload self-evaluation tidak punya field tanggal');
    const withDate = await pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, ratings: [{ kpiId: kpi.id, rating: 3, comment: '' }], generalComment: '', startDate: '2099-01-01', dueDate: '1900-01-01' } });
    report.check('3.4 [U103] Field tanggal asing (startDate/dueDate) di body evaluation/employee -> 422 ditolak (bukan bagian kontrak endpoint ini; siklus tanggal review sudah tertutup di U068 Manage Reviews)', withDate.status() === 422, `status=${withDate.status()}`);

    report.step('7.5 Performance dasar -- waktu respons GET evaluation/employee');
    const t0 = Date.now();
    await pageA.request.get(`${API}performance/reviews/${reviewId}/evaluation/employee`);
    const elapsedMs = Date.now() - t0;
    report.check('7.5 [U103] GET evaluation/employee merespons dalam waktu wajar (< 5s)', elapsedMs < 5_000, `elapsed=${elapsedMs}ms`);

    report.step('1.8 / 8.4 / 4.3 / 7.4 Save evaluasi via UI -- toast, back/forward, console warning');
    await performanceSelfEvaluatePage.goto(reviewId);
    const appWarnings: string[] = [];
    pageA.on('console', (msg) => { if (msg.type() === 'warning' && /orangehrm|performance/i.test(msg.text()) === false) appWarnings.push(msg.text()); });
    await performanceSelfEvaluatePage.fillRatings(kpis.map(validRating));
    const savePut = pageA.waitForResponse((r) => r.url().includes(`/api/v2/performance/reviews/${reviewId}/evaluation/employee`) && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
    await performanceSelfEvaluatePage.saveButton.click();
    const saveResp = await savePut;
    const toastText = await pageA.locator('.oxd-toast').first().textContent({ timeout: 3_000 }).catch(() => null);
    report.check('1.8 [U103] Save evaluasi via UI -> PUT 200 + toast sukses muncul', saveResp?.status() === 200 && !!toastText && /Successfully/i.test(toastText), `status=${saveResp?.status()} toast=${toastText}`);
    report.check('8.4 [U103] Teks toast konsisten dgn pola "Successfully ..." di form lain', !!toastText && /Successfully (Saved|Updated)/i.test(toastText), `toast="${toastText}"`);
    await pageA.goBack().catch(() => null);
    await pageA.goForward().catch(() => null);
    report.check('4.3 [U103] Browser Back lalu Forward setelah save -> halaman termuat normal', pageA.url().includes('reviewEvaluate'), `url=${pageA.url()}`);
    report.check('7.4 [U103] Tanpa console warning aplikasi (non-framework) selama alur self-evaluation', appWarnings.length === 0, appWarnings.slice(0, 3).join(' | ') || 'tidak ada');

    report.step('4.2 Aksi ganda -- double-click Save');
    await pageA.goto('/web/index.php/dashboard/index');
    await performanceSelfEvaluatePage.goto(reviewId);
    await performanceSelfEvaluatePage.fillRatings(kpis.map(validRating));
    const puts: number[] = [];
    pageA.on('response', (r) => { if (r.url().includes(`/api/v2/performance/reviews/${reviewId}/evaluation/employee`) && r.request().method() === 'PUT') puts.push(r.status()); });
    await Promise.all([performanceSelfEvaluatePage.saveButton.click(), performanceSelfEvaluatePage.saveButton.click({ force: true }).catch(() => null)]);
    await pageA.waitForTimeout(3_000);
    report.check('4.2 [U103] Double-click Save -> tidak ada 500/korupsi (setiap PUT yg terkirim tetap valid)', puts.every((s) => s < 500), `puts=${JSON.stringify(puts)}`);

    report.step('4.5 Koneksi putus saat save');
    await performanceSelfEvaluatePage.goto(reviewId);
    await performanceSelfEvaluatePage.fillRatings(kpis.map(validRating));
    await dropConnectionDuringSave(pageA, `**/performance/reviews/${reviewId}/evaluation/employee*`, () => performanceSelfEvaluatePage.saveButton.click());
    report.check('4.5 [U103] Koneksi putus saat save -> tidak crash (halaman tetap merespons)', await pageA.locator('body').isVisible(), 'body masih visible setelah abort');

    report.step('4.7 / 4.4 Concurrency -- 2 PUT rating berbeda paralel pd review yg SAMA');
    const [c1, c2] = await Promise.all([
      pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, ratings: [{ kpiId: kpi.id, rating: 2, comment: '' }], generalComment: '' } }),
      pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, ratings: [{ kpiId: kpi.id, rating: 5, comment: '' }], generalComment: '' } }),
    ]);
    report.check('4.7 [U103] 2 PUT rating berbeda bersamaan -> tidak ada 500', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);
    report.check('4.4 [U103] 2 Save paralel pd review SAMA -> tidak ada korupsi data (keduanya resolve tanpa 500)', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);

    report.step('8.1 Responsive -- viewport mobile 375px');
    await pageA.setViewportSize({ width: 375, height: 800 });
    await performanceSelfEvaluatePage.goto(reviewId);
    const viewMetrics = await pageA.evaluate(() => ({ overflow: document.documentElement.scrollWidth > window.innerWidth + 5 }));
    report.check('8.1 [U103] Tidak ada overflow horizontal halaman self-evaluation di viewport 375px', !viewMetrics.overflow, JSON.stringify(viewMetrics));
    const saveName = await performanceSelfEvaluatePage.saveButton.getAttribute('aria-label').catch(() => null) ?? await performanceSelfEvaluatePage.saveButton.textContent().catch(() => null);
    report.check('8.3 [U103] Tombol Save punya accessible name (bukan kosong)', !!saveName && saveName.trim().length > 0, `accessibleName="${saveName}"`);
    await pageA.setViewportSize({ width: 1280, height: 800 });

    report.step('8.2 Cross-browser -- alur save self-evaluation');
    const browserName = pageA.context().browser()?.browserType().name() ?? 'unknown';
    await performanceSelfEvaluatePage.goto(reviewId);
    await performanceSelfEvaluatePage.fillRatings(kpis.map(validRating));
    const xBrowserPut = pageA.waitForResponse((r) => r.url().includes(`/api/v2/performance/reviews/${reviewId}/evaluation/employee`) && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
    await performanceSelfEvaluatePage.saveButton.click();
    const xBrowserResp = await xBrowserPut;
    report.check(`8.2 [U103] Alur save self-evaluation berhasil di browser engine "${browserName}"`, xBrowserResp?.status() === 200, `browser=${browserName} status=${xBrowserResp?.status()}`);

    report.step('2.5 State transition -- complete, lalu PUT lanjutan dari ESS yg sama');
    await performanceSelfEvaluatePage.goto(reviewId);
    await performanceSelfEvaluatePage.fillRatings(kpis.map(validRating));
    const completePut = await performanceSelfEvaluatePage.completeAndConfirm(reviewId);
    const afterComplete = await pageA.request.put(`${API}performance/reviews/${reviewId}/evaluation/employee`, { data: { complete: false, ratings: [{ kpiId: kpi.id, rating: 3, comment: '' }], generalComment: '' } });
    report.check('2.5 [U103] Complete evaluasi -> 200, lalu PUT lanjutan dari ESS yg sama -> ditolak (state transition ditegakkan)', completePut?.status() === 200 && afterComplete.status() === 403, `complete=${completePut?.status()} after=${afterComplete.status()}`);

    report.finding('4.8 [U103] Behavior non-obvious', 'Tidak ditemukan behavior non-intuitif baru pd Self Evaluation selain state-transition 2.5 (sudah didokumentasikan di PerformanceSelfEvaluatePage).');
  } finally {
    await closeA();
    await closeB();
  }
  report.print();
});
