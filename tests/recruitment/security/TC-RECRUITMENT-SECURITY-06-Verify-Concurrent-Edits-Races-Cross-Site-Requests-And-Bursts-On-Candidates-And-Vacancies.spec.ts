/**
 * ================================================================================
 * TC-RECRUITMENT-SECURITY-06 — Verify Candidates And Vacancies Under Concurrent Edits, Parallel Requests, Cross-Site Requests And A Burst Of Creations
 * Modul    : Recruitment (U065 Vacancies, U100 Candidate Detail, U101 Vacancy Detail & Attachments)
 * Kategori : Edge (!) 4.4 4.7 | Security (S) 5.4 5.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-SECURITY-06-Verify-Concurrent-Edits-Races-Cross-Site-Requests-And-Bursts-On-Candidates-And-Vacancies.spec.ts
 * Path     : tests/recruitment/security/
 * ================================================================================
 *
 * TUJUAN (LIVE 17 Nov 2026; data uji milik TC):
 *   4.4  [U100] 3 PUT kandidat paralel -> semua 200, record akhir = salah satu body utuh (tidak
 *        tercampur). [U100]/[U065] 2 DELETE paralel atas record yg sama -> tepat satu 200, lainnya 404.
 *        [U101] 3 POST lampiran paralel -> 3 baris (tidak ada yg hilang).
 *   4.7  Dua Admin: A membuka form Edit Candidate, B menyimpan Keywords lewat sesinya, A lalu
 *        menyimpan Last Name -> dicatat apakah perubahan B hilang tanpa peringatan (finding).
 *   5.4  Halaman di situs lain (https://attacker.test) dibuka Admin yg sedang login: fetch no-cors &
 *        fetch JSON ber-credentials ke PUT kandidat, PUT lowongan, POST lampiran -> cookie sesi
 *        tidak ikut & data tidak berubah. (Form POST lintas situs sudah BG-437, tidak diulang.)
 *   5.5  [U065] 8 POST lowongan paralel -> dicatat ada/tidaknya rate limit (finding, spt BG-067).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/security/TC-RECRUITMENT-SECURITY-06-Verify-Concurrent-Edits-Races-Cross-Site-Requests-And-Bursts-On-Candidates-And-Vacancies.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { loginAs } from '../../../src/utils/loginAs';
import { createVacancyWithCandidate } from '../../../src/utils/maintenanceData';
import { API, candidateBody, cleanupRecruitment, filePayload, getJson, vacancyBody } from '../../../src/utils/recruitmentData';

const ATTACKER = 'https://attacker.test';
type Cand = { firstName: string; lastName: string; keywords: string | null };

test('TC-RECRUITMENT-SECURITY-06: concurrent edits, races, cross-site requests and bursts', async ({ page, browser }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-RECRUITMENT-SECURITY-06', 'Concurrent Edits Races Cross Site Requests Bursts Recruitment', env.baseURL);
  const v = await createVacancyWithCandidate(page.request, 'QaRecConc');
  const cid = v.candidateId!;
  const C = `${API}recruitment/candidates/${cid}`;
  const burstIds: number[] = [];
  const extraVac: number[] = [];
  const s = `${Date.now() % 100000}`;
  try {
    report.step('4.4 Request paralel');
    const bodies = ['A', 'B', 'C'].map((k) => candidateBody(v.vacancyId, { firstName: `QaRace${k}`, keywords: `race${k}` }));
    const rs = await Promise.all(bodies.map((b) => page.request.put(C, { data: b })));
    const fin = await getJson<Cand>(page.request, `recruitment/candidates/${cid}`);
    const whole = ['A', 'B', 'C'].some((k) => fin.firstName === `QaRace${k}` && fin.keywords === `race${k}`);
    report.check('4.4 [U100] 3 PUT kandidat paralel -> semua 200 & record akhir = satu body utuh (tidak tercampur)', rs.every((r) => r.status() === 200) && whole, `status=${rs.map((r) => r.status()).join(',')} akhir=${fin.firstName}/${fin.keywords}`);
    const tmp = ((await (await page.request.post(`${API}recruitment/candidates`, { data: candidateBody(v.vacancyId, { firstName: 'QaRaceDel', email: 'qa.racedel@example.com' }) })).json()) as { data: { id: number } }).data.id;
    const dc = await Promise.all([1, 2].map(() => page.request.delete(`${API}recruitment/candidates`, { data: { ids: [tmp] } })));
    report.check('4.4 [U100] 2 DELETE kandidat paralel -> tepat satu 200, lainnya 404', dc.map((r) => r.status()).sort().join(',') === '200,404', dc.map((r) => r.status()).join(','));
    const tv = await createVacancyWithCandidate(page.request, 'QaRecConcDel', false);
    extraVac.push(tv.vacancyId);
    const dv = await Promise.all([1, 2].map(() => page.request.delete(`${API}recruitment/vacancies`, { data: { ids: [tv.vacancyId] } })));
    report.check('4.4 [U065] 2 DELETE lowongan paralel -> tepat satu 200, lainnya 404', dv.map((r) => r.status()).sort().join(',') === '200,404', dv.map((r) => r.status()).join(','));
    const pa = await Promise.all([1, 2, 3].map((i) => page.request.post(`${API}recruitment/vacancy/attachments`, { data: { vacancyId: v.vacancyId, attachment: filePayload(`qa-par${i}.pdf`, 'application/pdf', '%PDF'), comment: '', attachmentType: 1 } })));
    const total = (await getJson<unknown[]>(page.request, `recruitment/vacancies/${v.vacancyId}/attachments`)).length;
    report.check('4.4 [U101] 3 POST lampiran paralel -> semua 200 & 3 baris tersimpan', pa.every((r) => r.status() === 200) && total === 3, `status=${pa.map((r) => r.status()).join(',')} baris=${total}`);

    report.step('4.7 Dua Admin mengedit kandidat yang sama');
    await page.request.put(C, { data: candidateBody(v.vacancyId, { firstName: 'QaConc', lastName: 'Awal', keywords: 'awal' }) });
    await page.goto(`/web/index.php/recruitment/addCandidate/${cid}`);
    await page.waitForResponse((r) => r.url().includes(`recruitment/candidates/${cid}`)).catch(() => null);
    await page.waitForLoadState('networkidle');
    await page.locator('.oxd-switch-input').first().click();
    const b = await loginAs(browser, env.username, env.password);
    try {
      const bs = await b.page.request.put(C, { data: candidateBody(v.vacancyId, { firstName: 'QaConc', lastName: 'Awal', keywords: 'diubah-B' }) });
      report.check('4.7 Admin B menyimpan Keywords "diubah-B" -> 200', bs.status() === 200, `status=${bs.status()}`);
    } finally {
      await b.close();
    }
    await page.getByPlaceholder('Last Name').fill('DiubahA');
    const save = page.waitForResponse((r) => r.url().includes(`recruitment/candidates/${cid}`) && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Save' }).last().click();
    const sa = await save;
    const now = await getJson<Cand>(page.request, `recruitment/candidates/${cid}`);
    report.check('4.7 Admin A menyimpan form lama -> tanpa error server & Last Name A tersimpan', (sa?.status() ?? 0) === 200 && now.lastName === 'DiubahA', `status=${sa?.status()} lastName=${now.lastName}`);
    report.finding('4.7 Perubahan Admin B setelah A menyimpan', `keywords=${now.keywords} (${now.keywords === 'diubah-B' ? 'perubahan B dipertahankan' : 'perubahan B TERTIMPA tanpa peringatan -- last write wins, tanpa optimistic locking'})`);

    report.step('5.4 Situs lain memakai sesi Admin');
    const origin = new URL(env.baseURL).origin;
    const sent: string[] = [];
    const withCookie: string[] = [];
    page.context().on('request', async (r) => {
      if (!r.url().startsWith(`${origin}/web/index.php/api/v2/recruitment/`)) return;
      const h = await r.allHeaders().catch(() => ({} as Record<string, string>));
      if ((h['referer'] ?? '').startsWith(ATTACKER) || (h['origin'] ?? '') === ATTACKER) {
        sent.push(`${r.method()} ${r.url().replace(origin, '')}`);
        if (/orangehrm=/.test(h['cookie'] ?? '')) withCookie.push(`${r.method()} ${r.url().replace(origin, '')}`);
      }
    });
    const vb = await vacancyBody(page.request, v.vacancyId);
    const candBefore = JSON.stringify(await getJson(page.request, `recruitment/candidates/${cid}`));
    const vacBefore = JSON.stringify(await getJson(page.request, `recruitment/vacancies/${v.vacancyId}`));
    const calls = [
      [`${origin}${C}`, 'PUT', candidateBody(v.vacancyId, { firstName: `QaCsrf${s}` })],
      [`${origin}${API}recruitment/vacancies/${v.vacancyId}`, 'PUT', { ...vb, name: `QaCsrf${s}` }],
      [`${origin}${API}recruitment/vacancy/attachments`, 'POST', { vacancyId: v.vacancyId, attachment: filePayload('csrf.pdf', 'application/pdf', '%PDF'), comment: `QaCsrf${s}`, attachmentType: 1 }],
    ] as const;
    const js = calls.map(([url, method, body]) => `
      fetch(${JSON.stringify(url)}, { method: '${method}', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'text/plain' }, body: ${JSON.stringify(JSON.stringify(body))} }).then(() => results.push('no-cors ${method}'), (e) => results.push('no-cors gagal ' + e));
      fetch(${JSON.stringify(url)}, { method: '${method}', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: ${JSON.stringify(JSON.stringify(body))} }).then((r) => results.push('cors ' + r.status), (e) => results.push('cors diblok ' + e.name));`).join('\n');
    await page.context().route(`${ATTACKER}/**`, (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body><script>window.results = [];\n${js}\n</script></body></html>` }));
    const attacker = await page.context().newPage();
    await attacker.goto(`${ATTACKER}/lowongan-hadiah`);
    await attacker.waitForFunction(() => (window as unknown as { results: string[] }).results?.length >= 6, null, { timeout: 20_000 }).catch(() => {});
    const results = await attacker.evaluate(() => (window as unknown as { results: string[] }).results).catch(() => [] as string[]);
    await attacker.close();
    report.check('5.4 Request dari situs penyerang terkirim TANPA cookie sesi', sent.length > 0 && withCookie.length === 0, `terkirim=${sent.join(', ') || '(tidak terlihat)'}; dgn cookie=${withCookie.join(', ') || 'tidak ada'}; fetch=${results.join(' | ')}`);
    report.check('5.4 [U100] Kandidat TIDAK berubah oleh situs penyerang', JSON.stringify(await getJson(page.request, `recruitment/candidates/${cid}`)) === candBefore);
    report.check('5.4 [U065/U101] Lowongan TIDAK berubah oleh situs penyerang', JSON.stringify(await getJson(page.request, `recruitment/vacancies/${v.vacancyId}`)) === vacBefore);
    const atts = await getJson<Array<{ comment: string }>>(page.request, `recruitment/vacancies/${v.vacancyId}/attachments`);
    report.check('5.4 [U101] Lampiran lowongan TIDAK bertambah oleh situs penyerang', !atts.some((a) => a.comment === `QaCsrf${s}`), `baris=${atts.length}`);
    report.check('5.4 Sesi Admin tetap aktif setelah halaman penyerang dibuka', (await page.request.get(`${API}recruitment/vacancies?limit=1`)).status() === 200);

    report.step('5.5 Burst pembuatan lowongan');
    const vb2 = await vacancyBody(page.request, v.vacancyId);
    const burst = await Promise.all(Array.from({ length: 8 }, (_, i) => page.request.post(`${API}recruitment/vacancies`, { data: { ...vb2, name: `QaRecBurst ${s} ${i}` } })));
    for (const r of burst) { const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id; if (id) burstIds.push(id); }
    const limited = burst.filter((r) => r.status() === 429).length;
    report.check('5.5 [U065] 8 POST lowongan paralel -> tanpa 5xx', burst.every((r) => r.status() < 500), burst.map((r) => r.status()).join(','));
    report.finding('5.5 [U065] Rate limit pembuatan lowongan', `${burstIds.length}/8 tersimpan, 429=${limited} (${limited ? 'ada rate limit' : 'tanpa rate limit, sama spt kandidat BG-067'})`);
  } finally {
    await cleanupRecruitment(page.request, [cid], [v.vacancyId, ...extraVac, ...burstIds]);
  }
  report.print();
});
