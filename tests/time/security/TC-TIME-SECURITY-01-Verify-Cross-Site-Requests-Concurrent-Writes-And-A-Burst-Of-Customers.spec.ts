/**
 * ================================================================================
 * TC-TIME-SECURITY-01 — Verify Attendance Configuration And Project Info Under Cross-Site Requests, Concurrent Writes And A Burst Of Creations
 * Modul    : Time (U059 Attendance Configuration, U063 Customers, U064 Projects)
 * Kategori : Edge (!) 4.4 | Security (S) 5.4 5.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-SECURITY-01-Verify-Cross-Site-Requests-Concurrent-Writes-And-A-Burst-Of-Customers.spec.ts
 * Path     : tests/time/security/
 * ================================================================================
 *
 * KESELAMATAN DATA: Attendance Configuration dibungkus withConfigRestore() (R6). Customer &
 * Project dibuat & dihapus sendiri.
 *
 * TUJUAN (LIVE 17 Nov 2026):
 *   5.4  Halaman di situs lain (https://attacker.test), dibuka Admin yg sedang login: fetch
 *        no-cors & fetch JSON ber-credentials ke PUT attendance/configs, POST customer -> cookie
 *        sesi tidak ikut terkirim & config/data tidak berubah; sesi Admin tetap aktif.
 *   4.4  [U063] 3 POST customer paralel (nama beda) -> semua 200 (3 baris, tidak ada yg hilang).
 *        [U064] 2 DELETE project yg sama paralel -> tepat satu 200, lainnya 404.
 *   5.5  [U063] 6 POST customer paralel -> dicatat ada/tidaknya rate limit (finding, spt BG-067).
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/security/TC-TIME-SECURITY-01-Verify-Cross-Site-Requests-Concurrent-Writes-And-A-Burst-Of-Customers.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { withConfigRestore } from '../../../src/utils/withConfigRestore';
import { API, createCustomer, createProject, currentAttendanceConfig, deleteCustomers, deleteProjects, getJson } from '../../../src/utils/timeData';

const ATTACKER = 'https://attacker.test';

test('TC-TIME-SECURITY-01: cross-site requests, concurrent writes and a burst of customers', async ({ page }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-TIME-SECURITY-01', 'Cross Site Requests Concurrent Writes Burst Time', env.baseURL);
  const s = `${Date.now() % 100000}`;
  const custIds: number[] = [];
  const projIds: number[] = [];
  try {
    report.step('5.4 Situs lain memakai sesi Admin');
    const origin = new URL(env.baseURL).origin;
    const snap = await currentAttendanceConfig(page.request);
    await withConfigRestore(
      async () => snap,
      async (sn) => { await page.request.put(`${API}attendance/configs`, { data: sn }); },
      async () => {
        const sent: string[] = [];
        const withCookie: string[] = [];
        page.context().on('request', async (r) => {
          if (!r.url().startsWith(`${origin}/web/index.php/api/v2/`)) return;
          if (!r.url().includes('/attendance/') && !r.url().includes('/time/customers')) return;
          const h = await r.allHeaders().catch(() => ({} as Record<string, string>));
          if ((h['referer'] ?? '').startsWith(ATTACKER) || (h['origin'] ?? '') === ATTACKER) {
            sent.push(`${r.method()} ${r.url().replace(origin, '')}`);
            if (/orangehrm=/.test(h['cookie'] ?? '')) withCookie.push(`${r.method()} ${r.url().replace(origin, '')}`);
          }
        });
        const calls = [
          [`${origin}${API}attendance/configs`, 'PUT', { canUserChangeCurrentTime: false, canUserModifyAttendance: false, canSupervisorModifyAttendance: false }],
          [`${origin}${API}time/customers`, 'POST', { name: `QaCsrf${s}`, description: '' }],
        ] as const;
        const js = calls.map(([url, method, body]) => `
          fetch(${JSON.stringify(url)}, { method: '${method}', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'text/plain' }, body: ${JSON.stringify(JSON.stringify(body))} }).then(() => results.push('no-cors ${method}'), (e) => results.push('no-cors gagal ' + e));
          fetch(${JSON.stringify(url)}, { method: '${method}', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: ${JSON.stringify(JSON.stringify(body))} }).then((r) => results.push('cors ' + r.status), (e) => results.push('cors diblok ' + e.name));`).join('\n');
        await page.context().route(`${ATTACKER}/**`, (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body><script>window.results = [];\n${js}\n</script></body></html>` }));
        const attacker = await page.context().newPage();
        await attacker.goto(`${ATTACKER}/jam-kerja-gratis`);
        await attacker.waitForFunction(() => (window as unknown as { results: string[] }).results?.length >= 4, null, { timeout: 20_000 }).catch(() => {});
        const results = await attacker.evaluate(() => (window as unknown as { results: string[] }).results).catch(() => [] as string[]);
        await attacker.close();
        report.check('5.4 Request dari situs penyerang terkirim TANPA cookie sesi', sent.length > 0 && withCookie.length === 0, `terkirim=${sent.join(', ') || '(tidak terlihat)'}; dgn cookie=${withCookie.join(', ') || 'tidak ada'}; fetch=${results.join(' | ')}`);
        report.check('5.4 [U059] Attendance Configuration TIDAK berubah oleh situs penyerang', JSON.stringify(await currentAttendanceConfig(page.request)) === JSON.stringify(snap));
        const custNow = await getJson<Array<{ name: string }>>(page.request, 'time/customers?limit=50');
        report.check('5.4 [U063] Customer TIDAK bertambah oleh situs penyerang', !custNow.some((c) => c.name === `QaCsrf${s}`), `jumlah=${custNow.length}`);
        report.check('5.4 Sesi Admin tetap aktif setelah halaman penyerang dibuka', (await page.request.get(`${API}time/customers?limit=1`)).status() === 200);
      },
    );

    report.step('4.4 Request paralel');
    const pc = await Promise.all([1, 2, 3].map((i) => page.request.post(`${API}time/customers`, { data: { name: `QaParCust${s}-${i}`, description: '' } })));
    for (const r of pc) { const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id; if (id) custIds.push(id); }
    report.check('4.4 [U063] 3 POST customer paralel -> semua 200 & 3 baris tersimpan', pc.every((r) => r.status() === 200) && custIds.length === 3, `status=${pc.map((r) => r.status()).join(',')}`);
    const custForProj = await createCustomer(page.request, `QaParProjCust${s}`);
    custIds.push(custForProj);
    const extraProj = await createProject(page.request, custForProj, `QaParProj${s}`);
    const [d1, d2] = await Promise.all([page.request.delete(`${API}time/projects`, { data: { ids: [extraProj] } }), page.request.delete(`${API}time/projects`, { data: { ids: [extraProj] } })]);
    report.check('4.4 [U064] 2 DELETE project paralel atas record yg sama -> tepat satu 200, lainnya 404', [d1.status(), d2.status()].sort().join(',') === '200,404', `${d1.status()},${d2.status()}`);

    report.step('5.5 Burst pembuatan customer');
    const burst = await Promise.all(Array.from({ length: 6 }, (_, i) => page.request.post(`${API}time/customers`, { data: { name: `QaBurstCust${s}-${i}`, description: '' } })));
    for (const r of burst) { const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id; if (id) custIds.push(id); }
    const okCount = burst.filter((r) => r.status() === 200).length;
    const limited = burst.filter((r) => r.status() === 429).length;
    report.check('5.5 [U063] 6 POST customer paralel -> tanpa 5xx', burst.every((r) => r.status() < 500), burst.map((r) => r.status()).join(','));
    report.finding('5.5 [U063] Rate limit pembuatan customer', `${okCount}/6 tersimpan, 429=${limited} (${limited ? 'ada rate limit' : 'tanpa rate limit, sama spt BG-067 Recruitment'})`);
  } finally {
    await deleteProjects(page.request, projIds);
    await deleteCustomers(page.request, custIds);
  }
  report.print();
});
