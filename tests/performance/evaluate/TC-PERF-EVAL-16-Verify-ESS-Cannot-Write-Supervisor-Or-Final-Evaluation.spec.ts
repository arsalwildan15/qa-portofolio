/**
 * ================================================================================
 * TC-PERF-EVAL-16 — Verify An Employee Cannot Write The Supervisor Or Final Evaluation Of Their Own Review
 * Modul    : Performance - Review Evaluation (API authorization)
 * Kategori : Negative (-) 2.4 | Security (S) 5.2-PrivEsc | API (A) 6.1 -- Privilege Escalation + Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-EVAL-16-Verify-ESS-Cannot-Write-Supervisor-Or-Final-Evaluation.spec.ts
 * Path     : tests/performance/evaluate/
 * ================================================================================
 *
 * TUJUAN:
 *   Karyawan hanya boleh menulis self-evaluation. Confirmed live: dari sesi ESS pemilik review,
 *   PUT reviews/<id>/evaluation/supervisor dan /evaluation/final -> 403 "Unauthorized" (tidak
 *   bisa menaikkan nilai sendiri). Self-evaluation dgn rating di luar min/max KPI -> 422
 *   [ratings]. Data supervisor/final tetap kosong setelah percobaan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/evaluate/TC-PERF-EVAL-16-Verify-ESS-Cannot-Write-Supervisor-Or-Final-Evaluation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssReview } from '../../../src/utils/createEssReview';

test('TC-PERF-EVAL-16: an employee cannot write the supervisor or final evaluation of their own review', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PERF-EVAL-16', 'ESS Cannot Write Supervisor Or Final Evaluation', env.baseURL, page);

  report.step('Setup: ESS reviewee + review Activated (via API)');
  const { ess, essPage, close, reviewId } = await createEssReview(page, browser, addEmployeePage, 'QaPerfPriv');
  const base = `/web/index.php/api/v2/performance/reviews/${reviewId}`;
  const kpis = ((await (await essPage.request.get(`${base}/kpis`)).json().catch(() => null))?.data ?? []) as Array<{ id: number; minRating: number; maxRating: number }>;

  report.step('[ESS API] Tulis evaluasi SUPERVISOR atas review sendiri');
  const sup = await essPage.request.put(`${base}/evaluation/supervisor`, {
    data: { complete: false, ratings: kpis.map((k) => ({ kpiId: k.id, rating: k.maxRating, comment: null })), generalComment: 'self-boost' },
  });
  report.check('[API] PUT evaluation/supervisor -> 403', sup.status() === 403, `status=${sup.status()}`);

  report.step('[ESS API] Tulis evaluasi FINAL atas review sendiri');
  const fin = await essPage.request.put(`${base}/evaluation/final`, {
    data: { complete: true, finalRating: 100, finalComment: 'self-approved', completedDate: '2026-07-01' },
  });
  report.check('[API] PUT evaluation/final -> 403', fin.status() === 403, `status=${fin.status()}`);

  report.step('[ESS API] Self-evaluation dgn rating > max KPI');
  const oob = await essPage.request.put(`${base}/evaluation/employee`, {
    data: { complete: false, ratings: kpis.map((k) => ({ kpiId: k.id, rating: k.maxRating + 10, comment: null })), generalComment: null },
  });
  const oobBody = await oob.json().catch(() => null);
  report.check('[API] Rating di luar rentang -> 422 [ratings]', oob.status() === 422 && (oobBody?.error?.data?.invalidParamKeys ?? []).includes('ratings'), `status=${oob.status()}, body=${JSON.stringify(oobBody)}`);

  report.step('[Admin API] Data supervisor & status review tidak berubah');
  // GET evaluation/supervisor returns one placeholder row per KPI (rating null) once the review is
  // active -- "empty" therefore means every rating is still null, not an empty array.
  const supData = await (await page.request.get(`${base}/evaluation/supervisor`)).json().catch(() => null);
  const supRatings = ((supData?.data ?? []) as Array<{ rating: string | null }>).map((r) => r.rating);
  report.check('Evaluasi supervisor masih kosong (semua rating null, tanpa general comment)', supRatings.every((r) => r === null) && !supData?.meta?.generalComment, `ratings=${JSON.stringify(supRatings)}, general=${supData?.meta?.generalComment}`);
  const list = await (await page.request.get(`/web/index.php/api/v2/performance/manage/reviews?limit=50&offset=0&empNumber=${ess.empNumber}`)).json().catch(() => null);
  const status = ((list?.data ?? []) as Array<{ id: number; overallStatus: { statusName: string } }>).find((r) => r.id === reviewId)?.overallStatus?.statusName;
  report.check('Status review tetap Activated (bukan Completed)', status === 'Activated', `status=${status}`);

  await close();
  report.print();
});
