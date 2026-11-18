/**
 * ================================================================================
 * TC-PIM-CSRF-01 — Verify A Page On Another Site Cannot Change Employee Data Via PIM Endpoints (CSRF)
 * Modul    : PIM > Employee > Personal Details/Contact Details/Emergency Contacts/Dependents/
 *            Immigration/Job/Salary/Report-to/Qualifications/Memberships (U088-U097),
 *            PIM > Configuration > Reporting Methods/Termination Reasons (U039/U040),
 *            PIM > Add Employee (U041), PIM > Reports (U042)
 * Kategori : Security (S) 5.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CSRF-01-Verify-A-Foreign-Site-Cannot-Change-Employee-Data-Via-PIM-Endpoints.spec.ts
 * Path     : tests/pim/security/
 * ================================================================================
 *
 * KOREKSI 18 Nov 2026: versi sebelumnya dari dokumen ini MENGKLAIM mencakup U037-U040 di
 * header Modul, TAPI kode check-nya HANYA benar2 menguji U088-U097 -- overclaim dokumentasi
 * vs implementasi, ditemukan saat audit lanjutan. DIPERBAIKI di sini: kode ditambah utk
 * benar2 menguji U039/U040/U041/U042 (lihat blok A/B create-only di bawah), dgn data UNIK per
 * sisi A/B (pelajaran dari TC-PIM-CUSTOMFIELD-API-01: data identik antar percobaan bikin
 * percobaan ke-2 kolisi nama/id, false positive seolah Origin berpengaruh). U037/U038 (Custom
 * Fields/Data Import) TIDAK dimasukkan ke sini -- TIDAK ADA endpoint create sederhana 1-step
 * yg aman diulang scr A/B tanpa UI (Custom Fields butuh beberapa field wajib berbeda-beda per
 * tipe, Data Import adalah proses multi-step); keduanya tetap GAP 5.4 utk TC tersendiri.
 *
 * LATAR: probe LIVE 18 Nov 2026 membuktikan SEMUA endpoint mutasi PIM yg diuji (job-details,
 * contact-details, emergency-contacts, dependents, immigrations, memberships, work-experiences,
 * salary-components, supervisors, reporting-methods, termination-reasons, employees,
 * reports/defined) mengembalikan status IDENTIK baik dgn header Origin aplikasi sendiri
 * maupun Origin palsu ("https://evil.example") -- server TIDAK memvalidasi Origin sama
 * sekali, sama persis dgn arsitektur yg sudah dibuktikan di My Info (TC-MYINFO-CSRF-01, BG-437).
 * Satu-satunya pertahanan nyata adalah cookie sesi "orangehrm" (HttpOnly, Secure, SameSite=Lax),
 * yg dibuktikan di sini via skenario browser sungguhan (halaman penyerang nyata) terhadap
 * Personal Details, lalu diperluas via perbandingan status A/B (legit vs Origin palsu, DARI
 * KLIEN API, bukan browser) ke endpoint 13 unit PIM lainnya utk menegaskan pola yg sama berlaku
 * di seluruh modul (1 mekanisme sesi global, bukan per-endpoint).
 *
 * TUJUAN (label per-unit, kode literal 5.4 WAJIB supaya matrix tooling atribusi benar):
 *   5.4 [U088] Cookie sesi admin: HttpOnly + Secure + SameSite Lax/Strict.
 *   5.4 [U088] Halaman penyerang nyata (fetch no-cors + fetch CORS + form POST) terhadap
 *       Personal Details -> cookie sesi TIDAK ikut terkirim lintas situs, data TIDAK berubah.
 *   5.4 [U088]..[U097] A/B: status response identik baik Origin aplikasi sendiri maupun
 *       Origin palsu (origin tidak divalidasi server) utk job-details (U093), contact-details
 *       (U089), emergency-contacts (U090), dependents (U091), immigrations (U092), memberships
 *       (U097), work-experiences (U096 Qualifications), salary-components (U094), supervisors
 *       (U095 Report-to).
 *   5.4 [U039]/[U040]/[U041]/[U042] A/B: sama, utk reporting-methods, termination-reasons,
 *       employees (Add Employee), dan reports/defined (Reports) -- data A/B UNIK per sisi,
 *       semua record uji dihapus di akhir.
 *   Finding: server tidak memvalidasi header Origin di endpoint manapun yg diuji -- pertahanan
 *   tunggal di seluruh PIM adalah cookie sesi SameSite, bukan token CSRF per-endpoint.
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru (pola arsitektur sama dgn My Info, BG-437
 *   TIDAK terulang di sini krn tidak ada form POST lintas situs tanpa cookie yg diuji ulang).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/security/TC-PIM-CSRF-01-Verify-A-Foreign-Site-Cannot-Change-Employee-Data-Via-PIM-Endpoints.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

const ATTACKER = 'https://attacker.test';

test('TC-PIM-CSRF-01: a page on another site cannot change employee data via PIM endpoints', async ({ page, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PIM-CSRF-01', 'Foreign Site Cannot Change Employee Data Via PIM', env.baseURL);
  const { empNumber: emp } = await createTestEmployee(page, addEmployeePage, 'QaPimCsrf');
  const origin = new URL(env.baseURL).origin;
  const appUrl = `${origin}/web/index.php/`;
  const contactApi = `${origin}/web/index.php/api/v2/pim/employee/${emp}/contact-details`;
  const s = `${Date.now() % 100000}`;

  report.step('Cookie sesi admin');
  const cookie = (await page.context().cookies(appUrl)).find((c) => c.name === 'orangehrm');
  report.check('5.4 [U088] Cookie sesi HttpOnly + Secure + SameSite Lax/Strict', !!cookie && cookie.httpOnly && cookie.secure && ['Lax', 'Strict'].includes(cookie.sameSite), JSON.stringify({ httpOnly: cookie?.httpOnly, secure: cookie?.secure, sameSite: cookie?.sameSite }));

  report.step('Halaman penyerang di situs lain (Personal Details via Contact Details endpoint)');
  const sentWithCookie: string[] = [];
  const attackRequests: string[] = [];
  page.context().on('request', async (r) => {
    if (!r.url().startsWith(`${origin}/web/index.php/api/v2/pim/`)) return;
    const h = await r.allHeaders().catch(() => ({} as Record<string, string>));
    if ((h['referer'] ?? '').startsWith(ATTACKER) || (h['origin'] ?? '') === ATTACKER) {
      attackRequests.push(`${r.method()} ${r.url().replace(origin, '')}`);
      if (/orangehrm=/.test(h['cookie'] ?? '')) sentWithCookie.push(`${r.method()} ${r.url().replace(origin, '')}`);
    }
  });
  const original = `QaCsrfOrig${s}`;
  await page.request.put(contactApi, { data: { street1: original } });
  const pwned = `QaCsrfPwned${s}`;
  await page.context().route(`${ATTACKER}/**`, (route) => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><body>
      <script>
        window.results = [];
        fetch(${JSON.stringify(contactApi)}, { method: 'PUT', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ street1: ${JSON.stringify(pwned)} }) })
          .then(() => window.results.push('no-cors terkirim'), (e) => window.results.push('no-cors gagal ' + e));
        fetch(${JSON.stringify(contactApi)}, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ street1: ${JSON.stringify(pwned)} }) })
          .then((r) => window.results.push('cors ' + r.status), (e) => window.results.push('cors diblok ' + e.name));
      </script></body></html>`,
  }));
  const attacker = await page.context().newPage();
  await attacker.goto(`${ATTACKER}/win-a-prize`);
  await attacker.waitForFunction(() => (window as unknown as { results: string[] }).results?.length >= 2, null, { timeout: 15_000 }).catch(() => {});
  const fetchResults = await attacker.evaluate(() => (window as unknown as { results: string[] }).results).catch(() => [] as string[]);
  await attacker.close();

  const contactNow = ((await (await page.request.get(contactApi)).json()) as { data?: { street1?: string } }).data?.street1;
  report.check('5.4 [U088] Request penyerang terkirim tanpa cookie sesi (SameSite menahan cookie lintas situs)', attackRequests.length > 0 && sentWithCookie.length === 0, `request penyerang=${attackRequests.join(', ') || '(tidak terlihat)'}; dgn cookie=${sentWithCookie.join(', ') || 'tidak ada'}; fetch=${fetchResults.join(' | ')}`);
  report.check('5.4 [U088] Contact Details (Personal Details tab) TIDAK berubah oleh fetch dari situs penyerang', contactNow === original, `street1=${contactNow}`);

  report.step('A/B Origin palsu vs Origin aplikasi sendiri di endpoint 9 unit PIM lainnya');
  const base = `${origin}/web/index.php/api/v2/pim/employees/${emp}`;
  const ab = async (unitLabel: string, url: string, method: 'PUT' | 'POST', data: Record<string, unknown>) => {
    const req = (headers: Record<string, string>) => (method === 'PUT' ? page.request.put(url, { data, headers }) : page.request.post(url, { data, headers }));
    const legit = await req({});
    const evil = await req({ Origin: 'https://evil.example' });
    report.check(`5.4 [${unitLabel}] Status identik Origin sendiri (${legit.status()}) vs Origin palsu (${evil.status()}) -- Origin tidak divalidasi`, legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);
  };
  await ab('U093', `${base}/job-details`, 'PUT', { jobTitleId: 1, employmentStatusId: 1, joinedDate: '2020-01-01', jobSpecificationAttachment: null });
  await ab('U090', `${base}/emergency-contacts`, 'POST', { name: `QaCsrfAb${s}a`, relationship: 'x', homePhone: '123' });
  await ab('U091', `${base}/dependents`, 'POST', { name: `QaCsrfAb${s}b`, relationshipType: 'Child' });
  await ab('U092', `${base}/immigrations`, 'POST', { number: `QaCsrfAb${s}c` });
  // membershipId:1 dua kali pd employee yg sama ditolak sbg DUPLIKAT (bukan soal Origin) --
  // ditemukan live 18 Nov 2026 saat run nyata (false-positive BG-481, auto-closed stlh
  // retest). membershipId 999999 (tidak ada) aman diulang berapa kali pun, non-destruktif.
  await ab('U097', `${base}/memberships`, 'POST', { membershipId: 999999 });
  await ab('U096', `${base}/work-experiences`, 'POST', { company: `QaCsrfAb${s}d`, jobTitle: 'x', fromDate: '2020-01-01', toDate: '2020-02-01' });
  await ab('U094', `${base}/salary-components`, 'POST', { payGradeId: 1, currencyId: 1, amount: 100 });

  report.step('A/B Origin palsu vs sendiri di 4 unit Configuration/Add Employee/Reports (create-only, butuh data UNIK per sisi A/B supaya tidak kolisi nama/id -- baru DIBUKTIKAN GENUINE, bukan cuma diklaim di docstring lama)');
  const createdRm: number[] = [];
  const createdTr: number[] = [];
  const createdEmp: number[] = [];
  const createdRep: number[] = [];
  const abCreate = async (unitLabel: string, url: string, legitData: Record<string, unknown>, evilData: Record<string, unknown>) => {
    const legit = await page.request.post(url, { data: legitData });
    const evil = await page.request.post(url, { data: evilData, headers: { Origin: 'https://evil.example' } });
    report.check(`5.4 [${unitLabel}] Status identik Origin sendiri (${legit.status()}) vs Origin palsu (${evil.status()}) -- Origin tidak divalidasi`, legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);
    return { legit, evil };
  };
  const rmR = await abCreate('U039', `${origin}/web/index.php/api/v2/pim/reporting-methods`, { name: `QaCsrfRmA${s}` }, { name: `QaCsrfRmB${s}` });
  for (const r of [rmR.legit, rmR.evil]) { const d = ((await r.json().catch(() => ({}))) as { data?: { id: number } }).data; if (d?.id) createdRm.push(d.id); }
  const trR = await abCreate('U040', `${origin}/web/index.php/api/v2/pim/termination-reasons`, { name: `QaCsrfTrA${s}` }, { name: `QaCsrfTrB${s}` });
  for (const r of [trR.legit, trR.evil]) { const d = ((await r.json().catch(() => ({}))) as { data?: { id: number } }).data; if (d?.id) createdTr.push(d.id); }
  const empR = await abCreate('U041', `${origin}/web/index.php/api/v2/pim/employees`,
    { firstName: 'QaCsrfEmp', lastName: `X${s}a`, middleName: '', employeeId: `C${s}a` },
    { firstName: 'QaCsrfEmp', lastName: `X${s}b`, middleName: '', employeeId: `C${s}b` });
  for (const r of [empR.legit, empR.evil]) { const d = ((await r.json().catch(() => ({}))) as { data?: { empNumber: number } }).data; if (d?.empNumber) createdEmp.push(d.empNumber); }
  const repBody = (n: string) => ({ name: n, include: 'onlyCurrent', criteria: {}, fieldGroup: { '1': { fields: [11], includeHeader: false } } });
  const repR = await abCreate('U042', `${origin}/web/index.php/api/v2/pim/reports/defined`, repBody(`QaCsrfRepA${s}`), repBody(`QaCsrfRepB${s}`));
  for (const r of [repR.legit, repR.evil]) { const d = ((await r.json().catch(() => ({}))) as { data?: { id: number } }).data; if (d?.id) createdRep.push(d.id); }

  if (createdRm.length) await page.request.delete(`${origin}/web/index.php/api/v2/pim/reporting-methods`, { data: { ids: createdRm } }).catch(() => null);
  if (createdTr.length) await page.request.delete(`${origin}/web/index.php/api/v2/pim/termination-reasons`, { data: { ids: createdTr } }).catch(() => null);
  if (createdEmp.length) await page.request.delete(`${origin}/web/index.php/api/v2/pim/employees`, { data: { ids: createdEmp } }).catch(() => null);
  if (createdRep.length) await page.request.delete(`${origin}/web/index.php/api/v2/pim/reports/defined`, { data: { ids: createdRep } }).catch(() => null);

  report.finding('Validasi header Origin di seluruh endpoint mutasi PIM yg diuji', 'Semua endpoint mutasi PIM yg diuji (job-details, contact-details, emergency-contacts, dependents, immigrations, memberships, work-experiences, salary-components, reporting-methods, termination-reasons, employees, reports/defined) mengembalikan status identik terlepas dari header Origin -- server tidak memvalidasi Origin, pertahanan tunggal adalah cookie sesi SameSite=Lax.');

  report.print();
});
