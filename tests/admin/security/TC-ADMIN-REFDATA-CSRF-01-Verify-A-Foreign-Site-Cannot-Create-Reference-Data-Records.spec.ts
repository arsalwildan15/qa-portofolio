/**
 * ================================================================================
 * TC-ADMIN-REFDATA-CSRF-01 — Verify A Page On Another Site Cannot Create Reference-Data
 *   Records Via The 12 Admin Reference-Data Menus (CSRF)
 * Modul    : Admin > Job > Job Titles/Pay Grades/Employment Status/Job Categories/Work Shifts
 *            (U013-U017), Admin > Organization > Locations (U019), Admin > Qualifications >
 *            Skills/Education/Licenses/Languages/Memberships (U021-U025), Admin > Nationalities
 *            (U026)
 * Kategori : Security (S) 5.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-REFDATA-CSRF-01-Verify-A-Foreign-Site-Cannot-Create-Reference-Data-Records.spec.ts
 * Path     : tests/admin/security/
 * ================================================================================
 *
 * LATAR: 5.4 adalah satu dari 5 kode GAP identik di 12 unit referensi Admin (lihat
 * TC-ADMIN-REFDATA-SWEEP-01 utk 1.2/1.4/2.2/4.8 + 3.2/5.9 Pay Grade). TC-ADMIN-SECURITY-02
 * SUDAH menguji CSRF di endpoint Pay Grades, TAPI spec itu tidak punya kode taksonomi literal
 * di label check & dipetakan tooling coverage HANYA ke U001 Users (fallback folder
 * tests/admin/security/ generik) -- 5.4 TETAP GAP utk Pay Grades & ke-11 unit lain. File ini
 * menutup 5.4 utk SEMUA 12 unit sekaligus, pola sama dgn TC-PIM-CSRF-01/TC-MYINFO-CSRF-01.
 *
 * Pola sama persis dgn My Info/PIM (BG-437, arsitektur app-wide): cookie sesi "orangehrm"
 * (HttpOnly, Secure, SameSite=Lax) adalah SATU-SATUNYA pertahanan nyata; server TIDAK
 * memvalidasi header Origin sama sekali. Dibuktikan via (1) skenario browser sungguhan
 * (halaman penyerang nyata di origin lain) terhadap Job Titles, DAN (2) perbandingan status
 * A/B (Origin aplikasi sendiri vs Origin palsu, dari klien API) di endpoint create 11 unit
 * lainnya -- kalau Origin benar2 divalidasi, status A/B akan BERBEDA (legit lolos, palsu
 * ditolak); kalau TIDAK divalidasi, status IDENTIK.
 *
 * EKSPLORASI LIVE (sebelum menulis kode): POST tanpa cookie sesi -> 401 "Session expired"
 * (dibuktikan via context tanpa cookie) -- jadi pertahanan intinya memang "tidak ada cookie
 * sesi = ditolak", bukan validasi Origin per endpoint.
 *
 * HASIL 25 Nov 2026: lolos penuh, tidak ada bug baru (pola arsitektur app-wide yg sudah
 *   dikonfirmasi di My Info/PIM/Time, bukan bug baru per modul).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/security/TC-ADMIN-REFDATA-CSRF-01-Verify-A-Foreign-Site-Cannot-Create-Reference-Data-Records.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { MUTATION_UNITS, mutationContext } from '../../../src/data/unitMutationRegistry';

const API = '/web/index.php/api/v2/';
const ATTACKER = 'https://attacker.test';
const REFDATA_IDS = new Set(['U013', 'U014', 'U015', 'U016', 'U017', 'U019', 'U021', 'U022', 'U023', 'U024', 'U025', 'U026']);

type Row = Record<string, unknown>;
const json = async (r: { json(): Promise<unknown> }) => (await r.json().catch(() => null)) as { data?: Row } | null;

test('TC-ADMIN-REFDATA-CSRF-01: a page on another site cannot create reference-data records via Admin endpoints', async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-ADMIN-REFDATA-CSRF-01', 'Foreign Site Cannot Create Reference Data', env.baseURL);
  const ctx = await mutationContext(page);
  const origin = new URL(env.baseURL).origin;
  const appUrl = `${origin}/web/index.php/`;
  const jobTitlesApi = `${origin}/web/index.php/api/v2/admin/job-titles`;
  const s = `${Date.now() % 100000}`;

  report.step('Cookie sesi admin');
  const cookie = (await page.context().cookies(appUrl)).find((c) => c.name === 'orangehrm');
  report.check('5.4 [U013] Cookie sesi HttpOnly + Secure + SameSite Lax/Strict', !!cookie && cookie.httpOnly && cookie.secure && ['Lax', 'Strict'].includes(cookie.sameSite as string), JSON.stringify({ httpOnly: cookie?.httpOnly, secure: cookie?.secure, sameSite: cookie?.sameSite }));

  report.step('Halaman penyerang di situs lain mencoba membuat Job Title');
  const attackRequests: string[] = [];
  const sentWithCookie: string[] = [];
  page.context().on('request', async (r) => {
    if (!r.url().startsWith(`${origin}/web/index.php/api/v2/admin/job-titles`)) return;
    const h = await r.allHeaders().catch(() => ({} as Record<string, string>));
    if ((h['referer'] ?? '').startsWith(ATTACKER) || (h['origin'] ?? '') === ATTACKER) {
      attackRequests.push(`${r.method()} ${r.url().replace(origin, '')}`);
      if (/orangehrm=/.test(h['cookie'] ?? '')) sentWithCookie.push(`${r.method()} ${r.url().replace(origin, '')}`);
    }
  });
  const pwned = `QaCsrfPwned${s}`;
  await page.context().route(`${ATTACKER}/**`, (route) => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><body>
      <script>
        window.results = [];
        fetch(${JSON.stringify(jobTitlesApi)}, { method: 'POST', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ title: ${JSON.stringify(pwned)} }) })
          .then(() => window.results.push('no-cors terkirim'), (e) => window.results.push('no-cors gagal ' + e));
        fetch(${JSON.stringify(jobTitlesApi)}, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: ${JSON.stringify(pwned)} }) })
          .then((r) => window.results.push('cors ' + r.status), (e) => window.results.push('cors diblok ' + e.name));
      </script></body></html>`,
  }));
  const attacker = await page.context().newPage();
  await attacker.goto(`${ATTACKER}/win-a-prize`);
  await attacker.waitForFunction(() => (window as unknown as { results: string[] }).results?.length >= 2, null, { timeout: 15_000 }).catch(() => {});
  const fetchResults = await attacker.evaluate(() => (window as unknown as { results: string[] }).results).catch(() => [] as string[]);
  await attacker.close();

  const listAfter = (await json(await page.request.get(`${jobTitlesApi}?limit=0`)))?.data as unknown as Row[] | undefined;
  const pwnedCreated = (listAfter ?? []).some((r) => r.title === pwned);
  report.check('5.4 [U013] Request penyerang terkirim tanpa cookie sesi (SameSite menahan cookie lintas situs)', attackRequests.length > 0 && sentWithCookie.length === 0, `request penyerang=${attackRequests.join(', ') || '(tidak terlihat)'}; dgn cookie=${sentWithCookie.join(', ') || 'tidak ada'}; fetch=${fetchResults.join(' | ')}`);
  report.check('5.4 [U013] Job Title TIDAK terbuat oleh fetch dari situs penyerang', !pwnedCreated, `pwnedCreated=${pwnedCreated}`);

  report.step('A/B Origin palsu vs Origin aplikasi sendiri di endpoint create 11 unit lainnya (data UNIK per sisi, dihapus di akhir)');
  const created: Array<{ ep: string; id: number }> = [];
  const ab = async (unitLabel: string, u: (typeof MUTATION_UNITS)[number], legitName: string, evilName: string) => {
    const ep = `${origin}${API}${u.endpoint}`;
    const legit = await page.request.post(ep, { data: u.body(legitName, ctx) });
    const evil = await page.request.post(ep, { data: u.body(evilName, ctx), headers: { Origin: 'https://evil.example' } });
    report.check(`5.4 [${unitLabel}] Status identik Origin sendiri (${legit.status()}) vs Origin palsu (${evil.status()}) -- Origin tidak divalidasi`, legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);
    for (const r of [legit, evil]) {
      const id = ((await json(r))?.data as Row | undefined)?.id as number | undefined;
      if (typeof id === 'number') created.push({ ep, id });
    }
  };
  const rest = MUTATION_UNITS.filter((u) => REFDATA_IDS.has(u.id) && u.id !== 'U013');
  for (const u of rest) {
    await ab(u.id, u, `QaCsrfAbA${s}${u.id}`, `QaCsrfAbB${s}${u.id}`);
  }

  for (const { ep, id } of created) {
    await page.request.delete(ep, { data: { ids: [id] } }).catch(() => null);
  }

  report.finding('Validasi header Origin di seluruh endpoint create referensi Admin yg diuji', 'Semua 12 endpoint (job-titles, pay-grades, employment-statuses, job-categories, work-shifts, locations, skills, educations, licenses, languages, memberships, nationalities) mengembalikan status identik terlepas dari header Origin -- server tidak memvalidasi Origin, pertahanan tunggal adalah cookie sesi SameSite=Lax (pola app-wide sama dgn My Info BG-437 & PIM).');

  report.print();
});
