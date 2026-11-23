/**
 * ================================================================================
 * TC-PERF-TRACKER-10 — Verify Trackers Config: Optional Field, Relation, Format, Length Limit, Edge Cases, Injection, Mass Assignment, Idempotency, Rate Limit And CSRF
 * Modul    : Performance > Configure > Trackers (U067)
 * Kategori : Positive (+) 1.2 1.4 1.8 | Negative (-) 2.2 | Boundary (B) 3.1 | Edge (!) 4.1
 *            4.2 4.3 4.5 4.7 | Security (S) 5.1-SQLi 5.1-XSS-Stored 5.2-MassAssign 5.4 5.5 |
 *            API (A) 6.5 6.7 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-TRACKER-10-Verify-Optional-Field-Relation-Format-Length-Limit-Edge-Cases-Injection-And-CSRF.spec.ts
 * Path     : tests/performance/tracker/
 * ================================================================================
 *
 * LATAR: TC-PERF-TRACKER-01..04 sudah menutup CRUD & 2.1/2.3. Ini menutup 18 kode terakhir,
 * dibuktikan via probe LIVE 18 Nov 2026 (termasuk binary-search panjang nama):
 *   - reviewerEmpNumbers: [] (opsional, kosong) vs terisi -> 200 keduanya; terisi -> reviewer
 *     tertaut benar (1.2 / 1.4).
 *   - empNumber="abc" (bukan angka) -> 422 (2.2).
 *   - trackerName 200 karakter (batas atas, binary-search) -> 200; 201 karakter -> 422 (3.1).
 *   - Nama unicode/emoji -> 200 diterima (4.1).
 *   - Nama berisi kutip SQL / HTML -> 200 & tersimpan apa adanya sbg teks (5.1-SQLi/5.1-XSS-
 *     Stored, render aman sudah dibuktikan di TC lain pola serupa).
 *   - Field asing (isAdmin) -> 422 ditolak (5.2-MassAssign).
 *   - GET list dgn sortField tak dikenal -> 422 (6.5).
 *   - Create nama SAMA utk 2 employee berbeda -> keduanya 200, tidak ada uniqueness
 *     constraint lintas-employee (6.7, konsisten dgn TC-PERF-TRACKER-03 yg sudah membuktikan
 *     duplikat DITOLAK hanya utk employee YANG SAMA -- bukan bug, desain yg konsisten).
 *   - 3 create paralel -> semua 200, tidak ada rate limit (5.5, finding).
 *   - Origin palsu vs sendiri -> status identik (5.4, konsisten TC-PIM-CSRF-01 pattern).
 *   - Add Tracker valid via UI -> toast sukses (1.8/8.4), back/forward normal (4.3), koneksi
 *     putus saat save -> tidak crash (4.5), 2 create berbeda paralel -> tidak 500 (4.7),
 *     double-click Save -> DITEMUKAN BUG (lihat HASIL).
 *
 * HASIL 18 Nov 2026: SENGAJA FAILED (R3), BUG BARU BG-487 (Medium) -- double-click Save pd
 *   form Add Tracker membuat 2 ENTRI dari 1 submit, instans ke-7 pola double-submit app-wide
 *   yg SAMA dgn BG-427/BG-475/BG-483/BG-486.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/tracker/TC-PERF-TRACKER-10-Verify-Optional-Field-Relation-Format-Length-Limit-Edge-Cases-Injection-And-CSRF.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';
import { dropConnectionDuringSave } from '../../../src/utils/networkEdge';

const api = '/web/index.php/api/v2/performance/config/trackers';
type Tracker = { id: number; trackerName: string; employee?: { empNumber: number }; reviewers: Array<{ empNumber: number }> };
const mkName = (len: number, tag: string) => `Q${tag}_`.padEnd(len, 'X').slice(0, len);

test('TC-PERF-TRACKER-10: optional field, relation, format, length limit, edge cases, injection, mass assignment, idempotency, rate limit, CSRF', async ({
  page, addEmployeePage, performanceTrackerPage,
}, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-PERF-TRACKER-10', 'Trackers Optional Field Relation Format Length Limit Edge Cases Injection Mass Assignment Idempotency Rate Limit CSRF', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /can't access property/, /due to access control checks/, /AxiosError: Network Error/,
    /JSHandle@object/, /event, request, config, code, name, message, stack/,
  ]);
  const s = Date.now() % 100000;
  const emp = await createEmployee(page.request, 'QaTrk10', `L${s}`);
  const emp2 = await createEmployee(page.request, 'QaTrk10B', `L${s + 1}`);
  const createdIds: number[] = [];

  try {
    report.step('1.2 / 1.4 reviewerEmpNumbers kosong (opsional) vs terisi (relasi)');
    const noReviewers = await page.request.post(api, { data: { trackerName: mkName(30, `A${s}`), empNumber: emp, reviewerEmpNumbers: [] } });
    const noReviewersData = ((await noReviewers.json().catch(() => ({}))) as { data?: Tracker }).data;
    if (noReviewersData?.id) createdIds.push(noReviewersData.id);
    report.check('1.2 [U067] reviewerEmpNumbers: [] (opsional) -> 200', noReviewers.status() === 200, `status=${noReviewers.status()}`);
    const withReviewers = await page.request.post(api, { data: { trackerName: mkName(30, `B${s}`), empNumber: emp, reviewerEmpNumbers: [emp2] } });
    const withReviewersData = ((await withReviewers.json().catch(() => ({}))) as { data?: Tracker }).data;
    if (withReviewersData?.id) createdIds.push(withReviewersData.id);
    report.check('1.4 [U067] reviewerEmpNumbers terisi -> 200 & reviewer tertaut benar', withReviewers.status() === 200 && !!withReviewersData?.reviewers.some((r) => r.empNumber === emp2), `status=${withReviewers.status()} reviewers=${JSON.stringify(withReviewersData?.reviewers)}`);

    report.step('2.2 empNumber bukan angka');
    const badEmp = await page.request.post(api, { data: { trackerName: mkName(30, `C${s}`), empNumber: 'abc', reviewerEmpNumbers: [] } });
    report.check('2.2 [U067] empNumber="abc" (bukan angka) -> 422', badEmp.status() === 422, `status=${badEmp.status()}`);

    report.step('3.1 Panjang trackerName (batas atas 200, dikonfirmasi binary-search)');
    const at200 = await page.request.post(api, { data: { trackerName: mkName(200, `D${s}`), empNumber: emp, reviewerEmpNumbers: [] } });
    const at200Data = ((await at200.json().catch(() => ({}))) as { data?: Tracker }).data;
    if (at200Data?.id) createdIds.push(at200Data.id);
    report.check('3.1 [U067] trackerName 200 karakter (batas atas) -> 200', at200.status() === 200, `status=${at200.status()}`);
    const at201 = await page.request.post(api, { data: { trackerName: mkName(201, `E${s}`), empNumber: emp, reviewerEmpNumbers: [] } });
    report.check('3.1 [U067] trackerName 201 karakter (lewat batas) -> 422', at201.status() === 422, `status=${at201.status()}`);

    report.step('4.1 / 5.1-SQLi / 5.1-XSS-Stored Karakter tidak biasa & injeksi');
    const unicode = await page.request.post(api, { data: { trackerName: `QaTrk🎉émoji${s}`, empNumber: emp, reviewerEmpNumbers: [] } });
    const unicodeData = ((await unicode.json().catch(() => ({}))) as { data?: Tracker }).data;
    if (unicodeData?.id) createdIds.push(unicodeData.id);
    report.check('4.1 [U067] Nama unicode/emoji -> 200 diterima', unicode.status() === 200, `status=${unicode.status()}`);
    const sqli = await page.request.post(api, { data: { trackerName: `QaTrkSqli' OR '1'='1${s}`, empNumber: emp, reviewerEmpNumbers: [] } });
    const sqliData = ((await sqli.json().catch(() => ({}))) as { data?: Tracker }).data;
    if (sqliData?.id) createdIds.push(sqliData.id);
    report.check('5.1-SQLi [U067] Nama berisi kutip SQL -> 200 & tersimpan apa adanya', sqli.status() === 200 && !!sqliData?.trackerName.includes("'"), `status=${sqli.status()}`);
    const xss = await page.request.post(api, { data: { trackerName: `<script>alert(1)</script>${s}`, empNumber: emp, reviewerEmpNumbers: [] } });
    const xssData = ((await xss.json().catch(() => ({}))) as { data?: Tracker }).data;
    if (xssData?.id) createdIds.push(xssData.id);
    report.check('5.1-XSS-Stored [U067] Nama berisi HTML -> 200 & tersimpan apa adanya sbg teks', xss.status() === 200 && !!xssData?.trackerName.includes('<script>'), `status=${xss.status()}`);

    report.step('5.2-MassAssign Field asing di body');
    const mass = await page.request.post(api, { data: { trackerName: mkName(30, `F${s}`), empNumber: emp, reviewerEmpNumbers: [], isAdmin: true } });
    report.check('5.2-MassAssign [U067] Field asing (isAdmin) -> 422 ditolak', mass.status() === 422, `status=${mass.status()}`);

    report.step('6.5 Parameter negatif pd GET list');
    const unknownParam = await page.request.get(`${api}?limit=5&sortField=unknownField`);
    report.check('6.5 [U067] GET list sortField tak dikenal -> 422', unknownParam.status() === 422, `status=${unknownParam.status()}`);

    report.step('6.7 Idempotency/uniqueness -- nama SAMA utk 2 employee berbeda');
    const dup1 = await page.request.post(api, { data: { trackerName: mkName(30, `G${s}`), empNumber: emp, reviewerEmpNumbers: [] } });
    const dup2 = await page.request.post(api, { data: { trackerName: mkName(30, `G${s}`), empNumber: emp2, reviewerEmpNumbers: [] } });
    const dup1Data = ((await dup1.json().catch(() => ({}))) as { data?: Tracker }).data;
    const dup2Data = ((await dup2.json().catch(() => ({}))) as { data?: Tracker }).data;
    if (dup1Data?.id) createdIds.push(dup1Data.id);
    if (dup2Data?.id) createdIds.push(dup2Data.id);
    report.finding('6.7 Idempotency/uniqueness pada Trackers lintas-employee', `Nama tracker SAMA utk 2 employee BERBEDA -> KEDUANYA 200 (dup1=${dup1.status()} dup2=${dup2.status()}), tidak ada uniqueness constraint lintas-employee -- konsisten dgn TC-PERF-TRACKER-03 yg sudah membuktikan duplikat DITOLAK hanya utk employee YANG SAMA, bukan bug.`);

    report.step('5.5 Rate limiting -- 3 create paralel');
    const rapid = await Promise.all(Array.from({ length: 3 }, (_, i) => page.request.post(api, { data: { trackerName: mkName(30, `R${i}${s}`), empNumber: emp, reviewerEmpNumbers: [] } })));
    report.check('5.5 [U067] 3 create paralel -> SEMUA 200 (tidak ada 429/lockout)', rapid.every((r) => r.status() === 200), `statuses=${rapid.map((r) => r.status()).join(',')}`);
    for (const r of rapid) {
      const d = ((await r.json().catch(() => ({}))) as { data?: Tracker }).data;
      if (d?.id) createdIds.push(d.id);
    }
    report.finding('Rate limiting pada create Tracker', '3 request create paralel SEMUA diterima (200) -- tidak ada rate limit pd endpoint ini, dicatat sbg finding (bukan bug) sesuai R4.');

    report.step('5.4 CSRF -- Origin aplikasi sendiri vs Origin palsu');
    const legit = await page.request.post(api, { data: { trackerName: mkName(30, `H${s}`), empNumber: emp, reviewerEmpNumbers: [] } });
    const evil = await page.request.post(api, { data: { trackerName: mkName(30, `I${s}`), empNumber: emp, reviewerEmpNumbers: [] }, headers: { Origin: 'https://evil.example' } });
    const legitData = ((await legit.json().catch(() => ({}))) as { data?: Tracker }).data;
    const evilData = ((await evil.json().catch(() => ({}))) as { data?: Tracker }).data;
    if (legitData?.id) createdIds.push(legitData.id);
    if (evilData?.id) createdIds.push(evilData.id);
    report.check('5.4 [U067] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (konsisten dgn TC-PIM-CSRF-01)', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);

    report.step('1.8 / 8.4 / 4.3 Add Tracker valid via UI -- toast sukses, back/forward');
    const me = await getLoggedInEmployeeName(page);
    const uiEmp = await createTestEmployee(page, addEmployeePage, 'QaTrk10Ui');
    await performanceTrackerPage.gotoAdd();
    await performanceTrackerPage.trackerNameInput.fill(mkName(30, `UI${s}`));
    await performanceTrackerPage.selectEmployee(uiEmp.employeeId, uiEmp.lastName);
    await performanceTrackerPage.selectReviewer(me.fullName.split(' ')[0] ?? me.fullName);
    const saveResp = await performanceTrackerPage.save();
    const toastText = await page.locator('.oxd-toast').first().textContent({ timeout: 3_000 }).catch(() => null);
    report.check('1.8 [U067] Add Tracker via UI -> POST 200 + toast sukses muncul', saveResp?.status() === 200 && !!toastText && /Successfully/i.test(toastText), `status=${saveResp?.status()} toast=${toastText}`);
    report.check('8.4 [U067] Teks toast konsisten dgn pola "Successfully ..." di form lain', !!toastText && /Successfully Saved/i.test(toastText), `toast="${toastText}"`);
    await page.goBack().catch(() => null);
    await page.goForward().catch(() => null);
    report.check('4.3 [U067] Browser Back lalu Forward setelah save -> halaman termuat normal', page.url().includes('addPerformanceTracker') || page.url().includes('viewPerformanceTrackerList'), `url=${page.url()}`);

    report.step('4.5 Koneksi putus saat save');
    await performanceTrackerPage.gotoAdd();
    await performanceTrackerPage.trackerNameInput.fill(mkName(30, `Drop${s}`));
    await performanceTrackerPage.selectEmployee(uiEmp.employeeId, uiEmp.lastName);
    await performanceTrackerPage.selectReviewer(me.fullName.split(' ')[0] ?? me.fullName);
    await dropConnectionDuringSave(page, '**/performance/config/trackers*', () => performanceTrackerPage.saveButton.click());
    report.check('4.5 [U067] Koneksi putus saat save -> tidak crash (halaman tetap merespons)', await page.locator('body').isVisible(), 'body masih visible setelah abort');

    report.step('4.7 Concurrency -- 2 create berbeda scr paralel');
    const [c1, c2] = await Promise.all([
      page.request.post(api, { data: { trackerName: mkName(30, `ConcA${s}`), empNumber: emp, reviewerEmpNumbers: [] } }),
      page.request.post(api, { data: { trackerName: mkName(30, `ConcB${s}`), empNumber: emp, reviewerEmpNumbers: [] } }),
    ]);
    const c1Data = ((await c1.json().catch(() => ({}))) as { data?: Tracker }).data;
    const c2Data = ((await c2.json().catch(() => ({}))) as { data?: Tracker }).data;
    if (c1Data?.id) createdIds.push(c1Data.id);
    if (c2Data?.id) createdIds.push(c2Data.id);
    report.check('4.7 [U067] 2 create berbeda bersamaan -> tidak ada 500', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);

    report.step('4.2 Double-click Save pd form Add Tracker');
    await performanceTrackerPage.gotoAdd();
    await performanceTrackerPage.trackerNameInput.fill(mkName(30, `Dbl${s}`));
    await performanceTrackerPage.selectEmployee(uiEmp.employeeId, uiEmp.lastName);
    await performanceTrackerPage.selectReviewer(me.fullName.split(' ')[0] ?? me.fullName);
    const [dbl] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/performance/config/trackers') && r.request().method() === 'POST').catch(() => null),
      performanceTrackerPage.saveButton.click({ clickCount: 2 }).catch(() => null),
    ]);
    await page.waitForTimeout(1500);
    const list = ((await (await page.request.get(`${api}?limit=50`)).json()) as { data: Tracker[] }).data;
    const dblMatches = list.filter((t) => t.trackerName === mkName(30, `Dbl${s}`));
    for (const m of dblMatches) createdIds.push(m.id);
    report.check('4.2 [U067] Double-click Save -> TIDAK ada 2 entri dari 1 submit', dblMatches.length <= 1, `status=${dbl?.status()} entriTersimpan=${dblMatches.length}`);

    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [uiEmp.empNumber] } }).catch(() => null);
  } finally {
    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp, emp2] } }).catch(() => null);
  }
  report.print();
});
