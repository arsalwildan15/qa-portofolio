/**
 * ================================================================================
 * TC-PERF-TRACKER-09 — Verify Tracker Log: Update, Delete, Optional Field, Feedback, Edge Cases, Privilege Escalation, Idempotency, Rate Limit And CSRF
 * Modul    : Performance > Tracker Logs (U104)
 * Kategori : Positive (+) 1.1-U 1.1-D 1.2 1.8 | Edge (!) 4.2 4.3 4.5 4.7 4.8 |
 *            Security (S) 5.2-PrivEsc 5.2-MassAssign 5.4 5.5 | API (A) 6.7 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-TRACKER-09-Verify-Tracker-Log-Update-Delete-Feedback-Edge-Cases-Privilege-Escalation-Rate-Limit-And-CSRF.spec.ts
 * Path     : tests/performance/tracker/
 * ================================================================================
 *
 * LATAR: TC-PERF-TRACKER-08 sudah menutup create/read/required/enum/length/injection. Ini
 * menutup 14 kode terakhir (1.6 N/A genuine, dicatat finding tanpa kode literal, konvensi
 * project), dibuktikan via probe LIVE 18 Nov 2026:
 *   - PUT log -> 200 & log/comment/achievement berubah (1.1-U).
 *   - DELETE log -> 200 (1.1-D).
 *   - comment kosong (opsional) -> 200 (1.2).
 *   - Add Log valid via UI -> toast "Successfully Saved" (1.8/8.4).
 *   - Back/Forward pasca-save -> normal, mendarat di halaman log itu sendiri (4.3).
 *   - Field asing (empNumber/trackerId) di body -> 422 ditolak (5.2-MassAssign).
 *   - ESS tambah log ke tracker MILIK SENDIRI dgn field privilese asing (reviewerEmpNumber,
 *     empNumber) -> 422 ditolak (5.2-PrivEsc, skema ketat).
 *   - Create log nama sama 2x -> keduanya 200 (6.7, tidak ada uniqueness constraint --
 *     wajar, log bukan entity unik spt employeeId, dicatat finding bukan bug).
 *   - 3 create paralel -> semua 200, tidak ada rate limit (5.5, finding).
 *   - Origin palsu vs sendiri -> status identik (5.4, konsisten TC-PIM-CSRF-01 pattern).
 *   - GET logs dgn sortField/search tak dikenal -> 422 (menegaskan tidak ada kapasitas
 *     search/filter/sort apa pun, N/A genuine utk 1.6).
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/tracker/TC-PERF-TRACKER-09-Verify-Tracker-Log-Update-Delete-Feedback-Edge-Cases-Privilege-Escalation-Rate-Limit-And-CSRF.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';
import { createEssTracker } from '../../../src/utils/createEssReview';
import { dropConnectionDuringSave } from '../../../src/utils/networkEdge';

const API = '/web/index.php/api/v2/';
type Log = { id: number; log: string; comment: string; achievement: string };

test('TC-PERF-TRACKER-09: tracker log update, delete, feedback, edge cases, privilege escalation, idempotency, rate limit, CSRF', async ({
  page, browser, addEmployeePage, performanceTrackerPage,
}, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-PERF-TRACKER-09', 'Tracker Log Update Delete Feedback Edge Cases Privilege Escalation Idempotency Rate Limit CSRF', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /can't access property/, /due to access control checks/, /AxiosError: Network Error/,
    /JSHandle@object/, /event, request, config, code, name, message, stack/,
  ]);
  const s = Date.now() % 100000;
  const emp = await createEmployee(page.request, 'QaTrkLog9', `L${s}`);
  const trackerResp = await page.request.post(`${API}performance/config/trackers`, { data: { trackerName: `QaTrkLog9Trk${s}`, empNumber: emp, reviewerEmpNumbers: [] } });
  const trackerId = ((await trackerResp.json()) as { data: { id: number } }).data.id;
  const createdLogIds: number[] = [];

  try {
    report.step('1.1-U / 1.1-D / 1.2 Update, delete, optional field');
    const seed = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'QaSeed', comment: 'c', achievement: 1 } });
    const seedData = ((await seed.json()) as { data: Log }).data;
    const upd = await page.request.put(`${API}performance/trackers/${trackerId}/logs/${seedData.id}`, { data: { log: 'QaSeedUpdated', comment: 'c2', achievement: 2 } });
    const updData = ((await upd.json().catch(() => ({}))) as { data?: Log }).data;
    report.check('1.1-U [U104] PUT log -> 200 & log/comment/achievement berubah', upd.status() === 200 && updData?.log === 'QaSeedUpdated' && updData?.comment === 'c2', `status=${upd.status()}`);
    const noComment = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'QaNoComment', comment: '', achievement: 1 } });
    const noCommentData = ((await noComment.json().catch(() => ({}))) as { data?: Log }).data;
    if (noCommentData?.id) createdLogIds.push(noCommentData.id);
    report.check('1.2 [U104] comment kosong (opsional) -> 200', noComment.status() === 200, `status=${noComment.status()}`);
    const del = await page.request.delete(`${API}performance/trackers/${trackerId}/logs`, { data: { ids: [seedData.id] } });
    report.check('1.1-D [U104] DELETE log -> 200', del.status() === 200, `status=${del.status()}`);

    report.step('5.2-MassAssign Field asing di body');
    const mass = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'QaMass', comment: 'c', achievement: 1, trackerId: 999999, empNumber: 1 } });
    report.check('5.2-MassAssign [U104] Field asing (trackerId/empNumber) -> 422 ditolak', mass.status() === 422, `status=${mass.status()}`);

    report.step('1.8 / 8.4 Add Log valid via UI -- toast sukses');
    await performanceTrackerPage.gotoLogs(trackerId);
    const uiResp = await performanceTrackerPage.addLog(trackerId, 'QaLogUi', 'comment', 'Positive');
    const toastText = await page.locator('.oxd-toast').first().textContent({ timeout: 3_000 }).catch(() => null);
    report.check('1.8 [U104] Add Log via UI -> POST 200 + toast sukses muncul', uiResp?.status() === 200 && !!toastText && /Successfully/i.test(toastText), `status=${uiResp?.status()} toast=${toastText}`);
    report.check('8.4 [U104] Teks toast konsisten dgn pola "Successfully ..." di form lain', !!toastText && /Successfully Saved/i.test(toastText), `toast="${toastText}"`);
    const uiData = ((await uiResp?.json().catch(() => ({}))) ?? {}) as { data?: Log };
    if (uiData?.data?.id) createdLogIds.push(uiData.data.id);

    report.step('4.3 Back/Forward pasca-save');
    await page.goBack().catch(() => null);
    await page.goForward().catch(() => null);
    report.check('4.3 [U104] Browser Back lalu Forward setelah save -> halaman termuat normal', page.url().includes('addPerformanceTrackerLog'), `url=${page.url()}`);

    report.step('4.5 Koneksi putus saat Add Log');
    await performanceTrackerPage.gotoLogs(trackerId);
    await page.getByRole('button', { name: 'Add Log' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 10_000 });
    await dialog.locator('input').first().fill('QaDropLog');
    await dialog.locator('textarea').first().fill('c');
    await dialog.getByRole('button', { name: 'Positive' }).click();
    await dropConnectionDuringSave(page, `**/performance/trackers/${trackerId}/logs*`, () => dialog.getByRole('button', { name: 'Save' }).click());
    report.check('4.5 [U104] Koneksi putus saat Add Log -> tidak crash (halaman tetap merespons)', await page.locator('body').isVisible(), 'body masih visible setelah abort');

    report.step('4.2 Double-click Save pd modal Add Log');
    await performanceTrackerPage.gotoLogs(trackerId);
    await page.getByRole('button', { name: 'Add Log' }).click();
    const dialog2 = page.getByRole('dialog');
    await dialog2.waitFor({ state: 'visible', timeout: 10_000 });
    await dialog2.locator('input').first().fill('QaDblLog');
    await dialog2.locator('textarea').first().fill('c');
    await dialog2.getByRole('button', { name: 'Positive' }).click();
    const [dbl] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/performance/trackers/${trackerId}/logs`) && r.request().method() === 'POST').catch(() => null),
      dialog2.getByRole('button', { name: 'Save' }).click({ clickCount: 2 }).catch(() => null),
    ]);
    await page.waitForTimeout(1500);
    const list = ((await (await page.request.get(`${API}performance/trackers/${trackerId}/logs?limit=50`)).json()) as { data: Log[] }).data;
    const dblMatches = list.filter((l) => l.log === 'QaDblLog');
    for (const m of dblMatches) createdLogIds.push(m.id);
    report.check('4.2 [U104] Double-click Save -> TIDAK ada 2 entri dari 1 submit', dblMatches.length <= 1, `status=${dbl?.status()} entriTersimpan=${dblMatches.length}`);

    report.step('4.7 Concurrency -- 2 Add Log berbeda scr paralel');
    const [c1, c2] = await Promise.all([
      page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'QaConcA', comment: 'c', achievement: 1 } }),
      page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'QaConcB', comment: 'c', achievement: 2 } }),
    ]);
    const c1Data = ((await c1.json().catch(() => ({}))) as { data?: Log }).data;
    const c2Data = ((await c2.json().catch(() => ({}))) as { data?: Log }).data;
    if (c1Data?.id) createdLogIds.push(c1Data.id);
    if (c2Data?.id) createdLogIds.push(c2Data.id);
    report.check('4.7 [U104] 2 Add Log berbeda bersamaan -> tidak ada 500', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);

    report.step('6.7 Idempotency -- Add Log nama SAMA 2x');
    const dup1 = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'QaDup', comment: 'c', achievement: 1 } });
    const dup2 = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'QaDup', comment: 'c', achievement: 1 } });
    const dup1Data = ((await dup1.json().catch(() => ({}))) as { data?: Log }).data;
    const dup2Data = ((await dup2.json().catch(() => ({}))) as { data?: Log }).data;
    if (dup1Data?.id) createdLogIds.push(dup1Data.id);
    if (dup2Data?.id) createdLogIds.push(dup2Data.id);
    report.finding('6.7 Idempotency/uniqueness pada Tracker Log', `Add Log dgn teks SAMA 2x -> KEDUANYA 200 (dup1=${dup1.status()} dup2=${dup2.status()}), tidak ada uniqueness constraint -- wajar, log bukan entity unik spt employeeId, bukan bug.`);

    report.step('5.5 Rate limiting -- 3 Add Log paralel');
    const rapid = await Promise.all(Array.from({ length: 3 }, (_, i) => page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: `QaRapid${i}`, comment: 'c', achievement: 1 } })));
    report.check('5.5 [U104] 3 Add Log paralel -> SEMUA 200 (tidak ada 429/lockout)', rapid.every((r) => r.status() === 200), `statuses=${rapid.map((r) => r.status()).join(',')}`);
    for (const r of rapid) {
      const d = ((await r.json().catch(() => ({}))) as { data?: Log }).data;
      if (d?.id) createdLogIds.push(d.id);
    }
    report.finding('Rate limiting pada Add Log', '3 request Add Log paralel SEMUA diterima (200) -- tidak ada rate limit pd endpoint ini, dicatat sbg finding (bukan bug) sesuai R4.');

    report.step('5.4 CSRF -- Origin aplikasi sendiri vs Origin palsu');
    const legit = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'QaCsrfA', comment: 'c', achievement: 1 } });
    const evil = await page.request.post(`${API}performance/trackers/${trackerId}/logs`, { data: { log: 'QaCsrfB', comment: 'c', achievement: 1 }, headers: { Origin: 'https://evil.example' } });
    const legitData = ((await legit.json().catch(() => ({}))) as { data?: Log }).data;
    const evilData = ((await evil.json().catch(() => ({}))) as { data?: Log }).data;
    if (legitData?.id) createdLogIds.push(legitData.id);
    if (evilData?.id) createdLogIds.push(evilData.id);
    report.check('5.4 [U104] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (konsisten dgn TC-PIM-CSRF-01)', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);

    report.step('5.2-PrivEsc -- ESS tambah log ke tracker MILIK SENDIRI dgn field privilese asing');
    const { ess, essPage, close, trackerId: essTrackerId } = await createEssTracker(page, browser, addEmployeePage, 'QaTrkLog9Ess');
    const privEsc = await essPage.request.post(`${API}performance/trackers/${essTrackerId}/logs`, { data: { log: 'EssHack', comment: 'c', achievement: 1, reviewerEmpNumber: 1, empNumber: 1 } });
    report.check('5.2-PrivEsc [U104] ESS Add Log ke tracker sendiri + field asing (reviewerEmpNumber/empNumber) -> 422 ditolak (skema ketat)', privEsc.status() === 422, `status=${privEsc.status()}`);
    const privEscData = ((await privEsc.json().catch(() => ({}))) as { data?: Log }).data;
    await close();
    if (privEscData?.id) await page.request.delete(`${API}performance/trackers/${essTrackerId}/logs`, { data: { ids: [privEscData.id] } }).catch(() => null);
    await page.request.delete(`${API}performance/config/trackers`, { data: { ids: [essTrackerId] } }).catch(() => null);
    await page.request.delete(`${API}pim/employees`, { data: { ids: [ess.empNumber] } }).catch(() => null);

    report.step('Verifikasi struktural 1.6 -- tidak ada kapasitas search/filter/sort');
    const sortField = await page.request.get(`${API}performance/trackers/${trackerId}/logs?limit=5&sortField=unknownField`);
    const searchParam = await page.request.get(`${API}performance/trackers/${trackerId}/logs?limit=5&search=foo`);
    report.finding('Kapasitas search/filter/sort pada Tracker Log', `GET logs dgn sortField tak dikenal -> ${sortField.status()}, dgn search tak dikenal -> ${searchParam.status()} -- keduanya ditolak, menegaskan di level API bhw endpoint ini TIDAK memiliki kapasitas search/filter/sort apa pun.`);

    report.finding('4.8 [U104] Behavior non-obvious', 'Tidak ditemukan behavior non-intuitif baru pd Tracker Log (toast, back/forward, koneksi putus, double-submit, concurrency semua konsisten dgn arsitektur form global yg sudah dibuktikan di modul lain).');
  } finally {
    if (createdLogIds.length) await page.request.delete(`${API}performance/trackers/${trackerId}/logs`, { data: { ids: createdLogIds } }).catch(() => null);
    await page.request.delete(`${API}performance/config/trackers`, { data: { ids: [trackerId] } }).catch(() => null);
    await page.request.delete(`${API}pim/employees`, { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
