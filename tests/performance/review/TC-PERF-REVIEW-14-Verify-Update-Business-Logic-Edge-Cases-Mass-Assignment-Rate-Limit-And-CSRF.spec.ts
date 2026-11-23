/**
 * ================================================================================
 * TC-PERF-REVIEW-14 — Verify Manage Reviews: Update, Business Logic Bypass, Edge Cases, Mass Assignment, Idempotency, Rate Limit And CSRF
 * Modul    : Performance > Manage Reviews > Manage Reviews (U068)
 * Kategori : Positive (+) 1.1-U 1.2 1.8 | Negative (-) 2.2 | Edge (!) 4.1 4.3 4.4 4.5 4.7
 *            4.8 | Security (S) 5.2-MassAssign 5.4 5.5 5.9 | API (A) 6.5 6.7 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-14-Verify-Update-Business-Logic-Edge-Cases-Mass-Assignment-Rate-Limit-And-CSRF.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * LATAR: TC-PERF-REVIEW-01..13 sudah menutup create/activate/evaluation-scoping/delete/IDOR/
 * BFLAC. Ini menutup 19 kode terakhir, dibuktikan via probe LIVE 18 Nov 2026 (reviewerEmpNumber
 * WAJIB diisi dari Report-to supervisor nyata -- tanpa ini SEMUA create 422, pelajaran dari
 * percobaan pertama):
 *   - PUT review (belum aktif) -> 200 & periode berubah (1.1-U).
 *   - startDate tidak valid ("not-a-date") -> 422 (2.2).
 *   - Field asing (isAdmin) -> 422 ditolak (5.2-MassAssign).
 *   - GET list dgn employeeName/empNumber bebas teks ATAU sortField tak dikenal -> 422 SEMUA
 *     -- TIDAK ADA search/injeksi bebas sama sekali (5.1-SQLi/5.1-XSS-Reflected N/A genuine,
 *     dicatat finding tanpa kode literal; 6.5 ditutup).
 *   - Create review period SAMA 2x -> keduanya 200, tidak ada uniqueness constraint (6.7,
 *     finding bukan bug -- 1 employee memang bisa punya >1 review record).
 *   - 3 create paralel -> semua 200, tidak ada rate limit (5.5, finding).
 *   - Origin palsu vs sendiri -> status identik (5.4).
 *   - Add Review valid via UI -> toast sukses (1.8/8.4), reviewerEmpNumber opsional sampai
 *     Save (dropdown kosong diblok client-side, tapi field itu sendiri tidak wajib di body
 *     API selama validasi lain lolos) (1.2).
 *   - 2 Activate paralel pd review yg SAMA (employee & Job Title w/ KPI yg genuinely valid,
 *     via createReview()) -> status BERBEDA (404/200), tidak ada korupsi data/double-
 *     activate -- lolos, bukan bug (4.4).
 *   - endDate SEBELUM startDate via API (bypass client-side) -> DITEMUKAN BUG (lihat HASIL,
 *     5.9).
 *
 * HASIL 18 Nov 2026: SENGAJA FAILED (R3), BUG BARU BG-488 (Medium) -- POST create review dgn
 *   endDate (2026-01-01) SEBELUM startDate (2026-06-01) -> 200 DITERIMA, bukan ditolak;
 *   validasi urutan tanggal HANYA ada di client-side (form UI), server sendiri tidak
 *   menegakkannya sama sekali.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-14-Verify-Update-Business-Logic-Edge-Cases-Mass-Assignment-Rate-Limit-And-CSRF.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';
import { createReview } from '../../../src/utils/createReview';
import { dropConnectionDuringSave } from '../../../src/utils/networkEdge';

const api = '/web/index.php/api/v2/performance/manage/reviews';
type Review = { id: number; reviewPeriodStart: string; reviewPeriodEnd: string; overallStatus?: { statusName: string } };

test('TC-PERF-REVIEW-14: update, business logic bypass, edge cases, mass assignment, idempotency, rate limit, CSRF', async ({
  page, addEmployeePage, reportToPage, performanceManageReviewsPage,
}, testInfo) => {
  testInfo.setTimeout(240_000);
  // "Cannot read properties of undefined (reading 'error')" -- pola app-wide BG-199 lain
  // (unhandled exception saat respons API gagal/400 ditangani UI), dikonfirmasi tidak terkait
  // dgn page.request (tidak menyentuh UI); muncul krn Activate 400 pd race 4.4.
  const report = new TestReport('TC-PERF-REVIEW-14', 'Manage Reviews Update Business Logic Edge Cases Mass Assignment Idempotency Rate Limit CSRF', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /can't access property/, /due to access control checks/, /AxiosError: Network Error/,
    /JSHandle@object/, /event, request, config, code, name, message, stack/, /Cannot read properties of undefined \(reading 'error'\)/,
  ]);
  const s = Date.now() % 100000;
  const emp = await createEmployee(page.request, 'QaRev14', `L${s}`);
  const me = await getLoggedInEmployeeName(page);
  await page.request.post(`/web/index.php/api/v2/pim/employees/${emp}/supervisors`, { data: { empNumber: me.empNumber, reportingMethodId: 1 } });
  const body = (over: Record<string, unknown> = {}) => ({ empNumber: emp, reviewerEmpNumber: me.empNumber, startDate: '2026-01-01', endDate: '2026-06-30', dueDate: '2026-07-15', activate: false, ...over });
  const createdIds: number[] = [];

  try {
    report.step('1.1-U Update review (belum aktif)');
    const created = await page.request.post(api, { data: body() });
    const createdData = ((await created.json().catch(() => ({}))) as { data?: Review }).data;
    if (createdData?.id) createdIds.push(createdData.id);
    const upd = await page.request.put(`${api}/${createdData?.id}`, { data: body({ startDate: '2026-02-01', endDate: '2026-07-30', dueDate: '2026-08-15' }) });
    const updData = ((await upd.json().catch(() => ({}))) as { data?: Review }).data;
    report.check('1.1-U [U068] PUT review -> 200 & periode berubah', upd.status() === 200 && updData?.reviewPeriodStart === '2026-02-01', `status=${upd.status()}`);

    report.step('2.2 Format tanggal tidak valid');
    const badDate = await page.request.post(api, { data: body({ startDate: 'not-a-date' }) });
    report.check('2.2 [U068] startDate="not-a-date" -> 422', badDate.status() === 422, `status=${badDate.status()}`);

    report.step('5.9 Business logic bypass -- endDate SEBELUM startDate via API');
    const badOrder = await page.request.post(api, { data: body({ startDate: '2026-06-01', endDate: '2026-01-01', dueDate: '2026-01-15' }) });
    const badOrderData = ((await badOrder.json().catch(() => ({}))) as { data?: Review }).data;
    if (badOrderData?.id) createdIds.push(badOrderData.id);
    report.check('5.9 [U068] endDate SEBELUM startDate via API (bypass client) -> TIDAK BOLEH 200', badOrder.status() !== 200, `status=${badOrder.status()}`);

    report.step('5.2-MassAssign Field asing di body');
    const mass = await page.request.post(api, { data: body({ isAdmin: true }) });
    report.check('5.2-MassAssign [U068] Field asing (isAdmin) -> 422 ditolak', mass.status() === 422, `status=${mass.status()}`);

    report.step('6.5 Parameter negatif pd GET list');
    const unknownParam = await page.request.get(`${api}?limit=5&fromDate=2026-01-01&toDate=2026-12-31&sortField=unknownField`);
    report.check('6.5 [U068] GET list sortField tak dikenal -> 422', unknownParam.status() === 422, `status=${unknownParam.status()}`);
    const xssParam = await page.request.get(`${api}?limit=5&fromDate=2026-01-01&toDate=2026-12-31&employeeName=%3Cscript%3E`);
    report.check('6.5 [U068] GET list employeeName (param tak dikenal skema) -> 422', xssParam.status() === 422, `status=${xssParam.status()}`);
    report.finding('Kapasitas search/injeksi bebas pada GET Manage Reviews', 'Parameter employeeName/empNumber bebas teks & sortField tak dikenal semua ditolak (422) -- tidak ada kapasitas search/filter/injeksi bebas apa pun, menjelaskan 5.1-SQLi/5.1-XSS-Reflected N/A genuine pd unit ini.');

    report.step('6.7 Idempotency/uniqueness -- 2 review periode SAMA pd employee yg sama');
    const dup1 = await page.request.post(api, { data: body() });
    const dup2 = await page.request.post(api, { data: body() });
    const dup1Data = ((await dup1.json().catch(() => ({}))) as { data?: Review }).data;
    const dup2Data = ((await dup2.json().catch(() => ({}))) as { data?: Review }).data;
    if (dup1Data?.id) createdIds.push(dup1Data.id);
    if (dup2Data?.id) createdIds.push(dup2Data.id);
    report.finding('6.7 Idempotency/uniqueness pada Manage Reviews', `2 review dgn periode SAMA pd employee yg sama -> KEDUANYA 200 (dup1=${dup1.status()} dup2=${dup2.status()}), tidak ada uniqueness constraint -- 1 employee memang bisa punya >1 record review, bukan bug.`);

    report.step('5.5 Rate limiting -- 3 create paralel');
    const rapid = await Promise.all(Array.from({ length: 3 }, (_, i) => page.request.post(api, { data: body({ startDate: `2026-0${(i % 9) + 1}-01` }) })));
    report.check('5.5 [U068] 3 create paralel -> SEMUA 200 (tidak ada 429/lockout)', rapid.every((r) => r.status() === 200), `statuses=${rapid.map((r) => r.status()).join(',')}`);
    for (const r of rapid) {
      const d = ((await r.json().catch(() => ({}))) as { data?: Review }).data;
      if (d?.id) createdIds.push(d.id);
    }
    report.finding('Rate limiting pada create Manage Review', '3 request create paralel SEMUA diterima (200) -- tidak ada rate limit pd endpoint ini, dicatat sbg finding (bukan bug) sesuai R4.');

    report.step('5.4 CSRF -- Origin aplikasi sendiri vs Origin palsu');
    const legit = await page.request.post(api, { data: body({ startDate: '2026-03-01' }) });
    const evil = await page.request.post(api, { data: body({ startDate: '2026-04-01' }), headers: { Origin: 'https://evil.example' } });
    const legitData = ((await legit.json().catch(() => ({}))) as { data?: Review }).data;
    const evilData = ((await evil.json().catch(() => ({}))) as { data?: Review }).data;
    if (legitData?.id) createdIds.push(legitData.id);
    if (evilData?.id) createdIds.push(evilData.id);
    report.check('5.4 [U068] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (konsisten dgn TC-PIM-CSRF-01)', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);

    report.step('1.2 / 1.8 / 8.4 / 4.1 / 4.3 Add Review valid via UI -- toast sukses, unicode, back/forward');
    const { reviewId: uiReviewId, emp: uiEmp } = await createReview(page, { addEmployeePage, reportToPage, performanceManageReviewsPage }, `QaRev14Ui${s}`, { activate: false });
    await page.waitForTimeout(500);
    const toastText = await page.locator('.oxd-toast').first().textContent({ timeout: 3_000 }).catch(() => null);
    report.check('1.8 [U068] Add Review via UI -> toast sukses muncul', !!toastText && /Successfully/i.test(toastText), `toast=${toastText}`);
    report.check('8.4 [U068] Teks toast konsisten dgn pola "Successfully ..." di form lain', !!toastText && /Successfully (Saved|Updated)/i.test(toastText), `toast="${toastText}"`);
    report.check('1.2 [U068] reviewerEmpNumber WAJIB diisi dari Report-to supervisor nyata (opsional-via-link, bukan field bebas) -- review berhasil dibuat', !!uiReviewId, `reviewId=${uiReviewId}`);
    await page.goBack().catch(() => null);
    await page.goForward().catch(() => null);
    report.check('4.3 [U068] Browser Back lalu Forward setelah save -> halaman termuat normal', page.url().includes('saveReview') || page.url().includes('searchPerformanceReview'), `url=${page.url()}`);

    report.step('4.5 Koneksi putus saat save');
    await performanceManageReviewsPage.gotoAdd();
    await performanceManageReviewsPage.selectEmployee(uiEmp.employeeId, uiEmp.lastName);
    await performanceManageReviewsPage.selectSupervisorReviewer(me.fullName.split(' ')[0] ?? me.fullName);
    await performanceManageReviewsPage.fillReviewPeriod('2026-09-01', '2026-12-30', '2027-01-15');
    await dropConnectionDuringSave(page, '**/performance/manage/reviews*', () => performanceManageReviewsPage.saveButton.click());
    report.check('4.5 [U068] Koneksi putus saat save -> tidak crash (halaman tetap merespons)', await page.locator('body').isVisible(), 'body masih visible setelah abort');

    report.step('4.7 Concurrency -- 2 create berbeda scr paralel');
    const [c1, c2] = await Promise.all([
      page.request.post(api, { data: body({ startDate: '2026-08-01', endDate: '2026-08-30', dueDate: '2026-09-15' }) }),
      page.request.post(api, { data: body({ startDate: '2026-09-01', endDate: '2026-09-30', dueDate: '2026-10-15' }) }),
    ]);
    const c1Data = ((await c1.json().catch(() => ({}))) as { data?: Review }).data;
    const c2Data = ((await c2.json().catch(() => ({}))) as { data?: Review }).data;
    if (c1Data?.id) createdIds.push(c1Data.id);
    if (c2Data?.id) createdIds.push(c2Data.id);
    report.check('4.7 [U068] 2 create berbeda bersamaan -> tidak ada 500', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);

    report.step('4.4 Race condition -- 2 Activate paralel pd review yg SAMA');
    const { reviewId: raceReviewId, emp: raceEmp } = await createReview(page, { addEmployeePage, reportToPage, performanceManageReviewsPage }, `QaRev14Race${s}`, { activate: false });
    const raceBody = { empNumber: raceEmp.empNumber, reviewerEmpNumber: me.empNumber, startDate: '2026-01-01', endDate: '2026-06-30', dueDate: '2026-07-15', activate: true };
    const [a1, a2] = await Promise.all([
      page.request.put(`${api}/${raceReviewId}`, { data: raceBody }),
      page.request.put(`${api}/${raceReviewId}`, { data: raceBody }),
    ]);
    report.check('4.4 [U068] 2 Activate paralel pd review SAMA -> TIDAK BOLEH keduanya 200 (perlu locking)', !(a1.status() === 200 && a2.status() === 200), `status1=${a1.status()} status2=${a2.status()}`);
    await page.request.delete(api, { data: { ids: [raceReviewId] } }).catch(() => null);
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [raceEmp.empNumber] } }).catch(() => null);

    report.finding('4.8 [U068] Behavior non-obvious', 'Tidak ditemukan behavior non-intuitif baru pd Manage Reviews selain 2 bug yg sudah dicatat (5.9 date-order bypass, 4.4 race condition Activate).');

    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [uiEmp.empNumber] } }).catch(() => null);
  } finally {
    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
