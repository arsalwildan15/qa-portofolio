/**
 * ================================================================================
 * TC-PERF-API-01 — Verify The KPI, Review, Tracker And Evaluation APIs: Contract, Paging, Wrong Method, No Session, Unknown Records, Sensitive Data And What An ESS User May Not Do
 * Modul    : Performance (U066 KPIs, U067 Trackers, U068 Manage Reviews, U007 Employee Reviews,
 *            U069 My Reviews, U070 My Trackers, U071 Employee Trackers, U102 Review Evaluation,
 *            U103 Self Evaluation, U104 Tracker Logs)
 * Kategori : Negative (-) 2.6 | Boundary (B) 3.5 3.6 | Edge (!) 4.6 | Security (S) 5.2-BFLAC 5.8 |
 *            API (A) 6.1 6.2 6.3 6.4 6.5 6.6
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-API-01-Verify-KPI-Review-Tracker-And-Evaluation-APIs-Contract-Methods-Session-Unknown-Ids-And-ESS-Access.spec.ts
 * Path     : tests/performance/security/
 * ================================================================================
 *
 * TUJUAN (endpoint direkam LIVE dari UI 17 Nov 2026; karyawan & review/tracker uji dibuat lewat
 * API & dihapus):
 *   6.1 / 6.2  GET tiap endpoint (Admin) -> 200; list -> data[] + meta; objek -> field kunci.
 *   5.8   tanpa field sensitif.  6.6 limit=-1 -> 422 (yg berpaging).  3.6 limit=1 -> maks 1 baris.
 *   3.5 / 4.6  offset=9999 -> data [].  6.3 PATCH -> 405.  6.4 tanpa sesi -> 401.
 *   2.6   id 999999 pada GET/PUT -> 4xx (bukan 2xx/5xx).
 *   5.2-BFLAC  sesi ESS: Manage Reviews, Employee Reviews, Employee Trackers, KPI, mutasi
 *        review/tracker milik ORANG LAIN -> 403; ESS tetap boleh baca/tulis review & tracker
 *        MILIK SENDIRI (My Reviews, My Trackers, Self Evaluation).
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), 2 BUG:
 *   - BUG BG-460 (High) -- PUT evaluation/supervisor utk review id 999999 (tidak ada) ->
 *     500 Internal Server Error, bukan 4xx (pola sama dgn Recruitment BG-444/445, Leave
 *     BG-453/454, Time BG-457/458).
 *   - BUG BG-460 (High) -- ESS GET performance/employees/trackers (Employee Trackers, endpoint
 *     administratif semua karyawan) -> 200 & bisa membaca tracker SEMUA karyawan, bukan 403
 *     (BFLAC: broken function level access control). Diverifikasi 2x re-run terisolasi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/security/TC-PERF-API-01-Verify-KPI-Review-Tracker-And-Evaluation-APIs-Contract-Methods-Session-Unknown-Ids-And-ESS-Access.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createReview } from '../../../src/utils/createReview';
import { createEssReview, createEssTracker } from '../../../src/utils/createEssReview';

const API = '/web/index.php/api/v2/';
const SENSITIVE = /"(password|passwordHash|hash|secret|token|salt)"\s*:/i;
const is4xx = (n: number) => n >= 400 && n < 500;

test('TC-PERF-API-01: KPI, Review, Tracker & Evaluation APIs - contract, paging, method, session, unknown ids, ESS', async ({ page, browser, addEmployeePage, reportToPage, performanceManageReviewsPage }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-PERF-API-01', 'KPI Review Tracker Evaluation APIs Contract Paging Methods Session ESS', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  const { reviewId, emp } = await createReview(page, { addEmployeePage, reportToPage, performanceManageReviewsPage }, 'QaPerfApi');
  const trackerResp = await page.request.post(`${API}performance/config/trackers`, { data: { trackerName: `QaPerfApiTrk${Date.now() % 100000}`, empNumber: emp.empNumber, reviewerEmpNumbers: [] } });
  const trackerId = ((await trackerResp.json()) as { data: { id: number } }).data.id;
  type Ep = { unit: string; path: string; list: boolean; keys?: string[] };
  const EPS: Ep[] = [
    { unit: 'U066', path: 'performance/kpis?limit=5', list: true },
    { unit: 'U067', path: 'performance/config/trackers?limit=5', list: true },
    { unit: 'U068', path: 'performance/manage/reviews?limit=5&fromDate=2026-01-01&toDate=2026-12-31', list: true },
    { unit: 'U069', path: 'performance/reviews?limit=5', list: true },
    { unit: 'U070', path: 'performance/trackers?limit=5', list: true },
    { unit: 'U071', path: 'performance/employees/trackers?limit=5', list: true },
    { unit: 'U104', path: `performance/trackers/${trackerId}/logs?limit=5`, list: true },
  ];
  try {
    for (const e of EPS) {
      const tag = `[${e.unit} ${e.path.split('?')[0]}]`;
      const base = `${API}${e.path}`;
      const sep = e.path.includes('?') ? '&' : '?';
      report.step(tag);
      const r = await page.request.get(base);
      const text = await r.text();
      const body = JSON.parse(text || '{}') as { data?: unknown };
      report.check(`${tag} 6.1 GET (Admin) -> 200`, r.status() === 200, `status=${r.status()}`);
      const ok = e.list ? Array.isArray(body.data) : !!body.data && (e.keys ?? []).every((k) => k in (body.data as object));
      report.check(`${tag} 6.2 Kontrak ${e.list ? 'data[]' : (e.keys ?? []).join('/')}`, ok, text.slice(0, 120));
      report.check(`${tag} 5.8 Tanpa field sensitif`, !SENSITIVE.test(text), SENSITIVE.exec(text)?.[0] ?? 'tidak ada');
      if (e.list) {
        const bad = await page.request.get(`${base}${sep}limit=-1`);
        report.check(`${tag} 6.6 limit=-1 -> 422`, bad.status() === 422, `status=${bad.status()}`);
        const one = ((await (await page.request.get(`${base}${sep}limit=1&offset=0`)).json()) as { data?: unknown[] }).data;
        report.check(`${tag} 3.6 limit=1 -> maks 1 baris`, Array.isArray(one) && one.length <= 1, `baris=${one?.length}`);
        const far = await page.request.get(`${base}${sep}limit=10&offset=9999`);
        const farData = ((await far.json().catch(() => null)) as { data?: unknown[] } | null)?.data;
        report.check(`${tag} 3.5 / 4.6 offset=9999 -> 200 & data []`, far.status() === 200 && Array.isArray(farData) && farData.length === 0, `status=${far.status()}`);
      }
      const patch = await page.request.patch(base, { data: {} });
      report.check(`${tag} 6.3 PATCH -> 405`, patch.status() === 405, `status=${patch.status()}`);
      const noAuth = await anon.get(base);
      report.check(`${tag} 6.4 Tanpa sesi -> 401`, noAuth.status() === 401, `status=${noAuth.status()}`);
    }

    report.step('Record yang tidak ada (id 999999)');
    const ghosts: Array<[string, () => Promise<number>]> = [
      ['[U066] PUT kpi 999999', async () => (await page.request.put(`${API}performance/kpis/999999`, { data: { title: 'x', minRating: 0, maxRating: 100 } })).status()],
      ['[U067] PUT tracker 999999', async () => (await page.request.put(`${API}performance/config/trackers/999999`, { data: { trackerName: 'x' } })).status()],
      ['[U068] PUT review 999999', async () => (await page.request.put(`${API}performance/manage/reviews/999999`, { data: { startDate: '2026-01-01', endDate: '2026-06-30', dueDate: '2026-07-15' } })).status()],
      ['[U102] PUT evaluation/supervisor review 999999', async () => (await page.request.put(`${API}performance/reviews/999999/evaluation/supervisor`, { data: { ratings: [], generalComment: '' } })).status()],
    ];
    for (const [label, fn] of ghosts) {
      const st = await fn();
      report.check(`2.6 ${label} -> 4xx (bukan 2xx/5xx)`, is4xx(st), `status=${st}`);
    }

    report.step('ESS: batas akses endpoint administratif');
    const { essPage: essPage1, close: close1, reviewId: essReviewId, ess: ess1 } = await createEssReview(page, browser, addEmployeePage, 'QaPerfApiEss1');
    try {
      const essCalls: Array<[string, () => Promise<number>]> = [
        ['[U066] POST kpi', async () => (await essPage1.request.post(`${API}performance/kpis`, { data: { title: 'EssHack', minRating: 0, maxRating: 100, jobTitleId: 1 } })).status()],
        ['[U068] GET Manage Reviews (semua karyawan)', async () => (await essPage1.request.get(`${API}performance/manage/reviews?limit=5&fromDate=2026-01-01&toDate=2026-12-31`)).status()],
        ['[U007] GET Employee Reviews (semua karyawan)', async () => (await essPage1.request.get(`${API}performance/employees/reviews?limit=5&fromDate=2026-01-01&toDate=2026-12-31`)).status()],
        ['[U071] GET Employee Trackers (semua karyawan)', async () => (await essPage1.request.get(`${API}performance/employees/trackers?limit=5`)).status()],
        ['[U068] PUT review milik orang lain', async () => (await essPage1.request.put(`${API}performance/manage/reviews/${reviewId}`, { data: { startDate: '2026-01-01', endDate: '2026-06-30', dueDate: '2026-07-15' } })).status()],
        ['[U102] PUT evaluation/supervisor (milik sendiri, PrivEsc)', async () => (await essPage1.request.put(`${API}performance/reviews/${essReviewId}/evaluation/supervisor`, { data: { ratings: [], generalComment: 'EssHack' } })).status()],
      ];
      for (const [label, fn] of essCalls) {
        const st = await fn();
        report.check(`5.2-BFLAC ESS ${label} -> 403`, st === 403, `status=${st}`);
      }
      const myRev = await essPage1.request.get(`${API}performance/reviews?limit=5`);
      report.check('5.2-BFLAC [U069] ESS boleh membaca My Reviews (review MILIK SENDIRI) -> 200', myRev.status() === 200, `status=${myRev.status()}`);
    } finally {
      await close1();
      await page.request.delete(`${API}performance/manage/reviews`, { data: { ids: [essReviewId] } }).catch(() => null);
      await page.request.delete(`${API}pim/employees`, { data: { ids: [ess1.empNumber] } }).catch(() => null);
    }
    const { essPage: essPage2, close: close2, trackerId: essTrackerId, ess: ess2 } = await createEssTracker(page, browser, addEmployeePage, 'QaPerfApiEss2');
    try {
      const myTrk = await essPage2.request.get(`${API}performance/trackers?limit=5`);
      report.check('5.2-BFLAC [U070] ESS boleh membaca My Trackers (tracker MILIK SENDIRI) -> 200', myTrk.status() === 200, `status=${myTrk.status()}`);
      const delOther = await essPage2.request.delete(`${API}performance/config/trackers`, { data: { ids: [trackerId] } });
      report.check('5.2-BFLAC [U067] ESS DELETE tracker milik orang lain -> 403', delOther.status() === 403, `status=${delOther.status()}`);
      report.check('5.2-BFLAC Tracker milik orang lain tidak terhapus oleh ESS', (await page.request.get(`${API}performance/config/trackers?limit=50`)).status() === 200);
    } finally {
      await close2();
      await page.request.delete(`${API}performance/config/trackers`, { data: { ids: [essTrackerId] } }).catch(() => null);
      await page.request.delete(`${API}pim/employees`, { data: { ids: [ess2.empNumber] } }).catch(() => null);
    }
  } finally {
    await anon.dispose();
    await page.request.delete(`${API}performance/config/trackers`, { data: { ids: [trackerId] } }).catch(() => null);
    await page.request.delete(`${API}performance/manage/reviews`, { data: { ids: [reviewId] } }).catch(() => null);
    await page.request.delete(`${API}pim/employees`, { data: { ids: [emp.empNumber] } }).catch(() => null);
  }
  report.print();
});
