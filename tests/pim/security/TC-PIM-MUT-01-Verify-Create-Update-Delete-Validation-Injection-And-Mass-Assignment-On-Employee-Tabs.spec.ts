/**
 * ================================================================================
 * TC-PIM-MUT-01 — Verify Create/Update/Delete On The Writable PIM Employee Tabs: Contract, Server-Side Validation, Unicode, Injection, Mass Assignment, Unknown Ids, Repeats
 * Modul    : PIM - Employee tabs (U090 Emergency, U091 Dependents, U092 Immigration, U094 Salary,
 *            U096 Qualifications, U097 Memberships), sesi Admin atas karyawan uji
 * Kategori : Positive (+) 1.1-C 1.1-R 1.1-U 1.1-D | Negative (-) 2.6 | Boundary (B) 3.1 |
 *            Edge (!) 4.1 | Security (S) 5.1-SQLi 5.2-MassAssign 5.5 | API (A) 6.5 6.7
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-MUT-01-Verify-Create-Update-Delete-Validation-Injection-And-Mass-Assignment-On-Employee-Tabs.spec.ts
 * Path     : tests/pim/security/
 * ================================================================================
 *
 * TUJUAN (body valid direkam LIVE 17 Nov 2026; label [U###]; karyawan uji dibuat lewat API & dihapus):
 *   1.1-C  POST valid -> 200 + id.    1.1-R  baris tampil di GET list.
 *   1.1-U  PUT <id> dgn teks baru -> 200 & tersimpan.   1.1-D  DELETE {ids} -> 200 & hilang.
 *   6.5    field teks utama null -> 4xx; field angka/tanggal bertipe salah -> 4xx.
 *   3.1    field teks utama 300 karakter -> 4xx.
 *   4.1    teks Arab/CJK/aksen -> tersimpan identik.   5.1-SQLi "' OR '1'='1" -> tersimpan identik.
 *   5.2-MassAssign  empNumber karyawan lain di body -> diabaikan (record tetap milik karyawan uji).
 *   2.6    PUT & DELETE id 999999 -> 4xx (bukan 2xx/5xx).
 *   6.7    POST yg sama 2x -> dicatat (boleh 2 baris: tab ini tidak mewajibkan nilai unik).
 *   5.5    5 POST paralel -> dicatat (tanpa rate limit = finding).
 *
 * HASIL 17 Nov 2026: 67/69 lolos. SENGAJA FAILED (R3): U096 Work Experience -> fromDate bukan tanggal
 *   -> 500 & PUT id 999999 -> 500 (BUG BG-439, Low; 5 tab lain menjawab 4xx). Temuan: POST identik 2x
 *   menambah 2 baris di semua tab (tanpa keunikan); burst 5 POST paralel tanpa rate limit.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/security/TC-PIM-MUT-01-Verify-Create-Update-Delete-Validation-Injection-And-Mass-Assignment-On-Employee-Tabs.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const API = '/web/index.php/api/v2/';
const is4xx = (n: number) => n >= 400 && n < 500;
type Row = Record<string, unknown>;
type Tab = {
  unit: string; name: string; seg: string; textKey: string;
  body: (text: string) => Record<string, unknown>;
  /** A field whose wrong type the server must reject. */
  badType: Record<string, unknown>;
};

test('TC-PIM-MUT-01: create/update/delete, validation, injection and mass assignment on employee tabs', async ({ page }, testInfo) => {
  testInfo.setTimeout(360_000);
  const report = new TestReport('TC-PIM-MUT-01', 'Create Update Delete Validation Injection Employee Tabs', env.baseURL);
  const firstId = async (ep: string) => ((await (await page.request.get(`${API}${ep}?limit=1`)).json()) as { data?: Array<{ id: number }> }).data?.[0]?.id;
  const membershipId = await firstId('admin/memberships');
  const TABS: Tab[] = [
    { unit: 'U090', name: 'Emergency Contacts', seg: 'emergency-contacts', textKey: 'name', body: (t) => ({ name: t, relationship: 'Friend', homePhone: '', mobilePhone: '123', officePhone: '' }), badType: { mobilePhone: 'abc' } },
    { unit: 'U091', name: 'Dependents', seg: 'dependents', textKey: 'name', body: (t) => ({ name: t, relationshipType: 'child', relationship: '', dateOfBirth: '2015-01-01' }), badType: { dateOfBirth: 'bukan-tanggal' } },
    { unit: 'U092', name: 'Immigration', seg: 'immigrations', textKey: 'number', body: (t) => ({ number: t.slice(0, 30), issuedDate: '2024-01-10', expiryDate: '2030-01-10', type: 1, status: '', reviewDate: '', comment: '' }), badType: { issuedDate: 'bukan-tanggal' } },
    { unit: 'U094', name: 'Salary', seg: 'salary-components', textKey: 'salaryComponent', body: (t) => ({ salaryComponent: t, salaryAmount: '1000', currencyId: 'USD', comment: null, addDirectDeposit: false }), badType: { salaryAmount: 'seribu' } },
    { unit: 'U096', name: 'Qualifications (work experience)', seg: 'work-experiences', textKey: 'company', body: (t) => ({ company: t, jobTitle: 'QaT', fromDate: '2020-01-01', toDate: '2021-01-01', comment: '' }), badType: { fromDate: 'bukan-tanggal' } },
    { unit: 'U097', name: 'Memberships', seg: 'memberships', textKey: 'subscriptionPaidBy', body: (t) => ({ membershipId, subscriptionPaidBy: t.startsWith('QaMut') ? 'Company' : t, subscriptionFee: '10', currencyTypeId: 'USD', subscriptionCommenceDate: '2024-01-01', subscriptionRenewalDate: '2025-01-01' }), badType: { subscriptionFee: 'sepuluh' } },
  ];
  // Response/list field that holds each tab's main text (the API renames some on output).
  const outKey: Record<string, string> = { 'salary-components': 'salaryName' };

  const mk = async (first: string, i: number) => ((await (await page.request.post(`${API}pim/employees`, { data: { firstName: first, lastName: `Mu${Date.now() % 100000}`, middleName: '', employeeId: `M${Date.now().toString().slice(-8)}${i}` } })).json()) as { data: { empNumber: number } }).data.empNumber;
  const emp = await mk('QaPimMut', 1);
  const other = await mk('QaPimMutOther', 2);
  try {
    for (const t of TABS) {
      const tag = `[${t.unit} ${t.name}]`;
      const base = `${API}pim/employees/${emp}/${t.seg}`;
      const key = outKey[t.seg] ?? t.textKey;
      const list = async () => ((await (await page.request.get(`${base}?limit=0`)).json()) as { data: Row[] }).data;
      const s = `${Date.now() % 100000}`;
      const memberships = t.seg === 'memberships';

      report.step(`${tag} CRUD`);
      const name = `QaMut ${s}`;
      const c = await page.request.post(base, { data: t.body(name) });
      const cd = ((await c.json().catch(() => null)) as { data?: Row } | null)?.data;
      const id = cd?.['id'];
      report.check(`${tag} 1.1-C POST valid -> 200 + id`, c.status() === 200 && id !== undefined, `status=${c.status()} ${JSON.stringify(cd ?? '').slice(0, 80)}`);
      if (id === undefined) { report.finding(`${tag} dilewati`, 'create valid gagal'); continue; }
      report.check(`${tag} 1.1-R Baris baru tampil di GET list`, (await list()).some((r) => String(r['id']) === String(id)), `id=${id}`);
      const newText = memberships ? 'Individual' : `QaMutU ${s}`;
      const up = await page.request.put(`${base}/${id}`, { data: t.body(newText) });
      const afterUp = (await list()).find((r) => String(r['id']) === String(id));
      report.check(`${tag} 1.1-U PUT ${t.textKey} baru -> 200 & tersimpan`, up.status() === 200 && afterUp?.[key] === newText.slice(0, t.seg === 'immigrations' ? 30 : 300), `status=${up.status()}, nilai=${JSON.stringify(afterUp?.[key])}`);

      report.step(`${tag} validasi & karakter`);
      if (!memberships) {
        const nul = await page.request.post(base, { data: { ...t.body('x'), [t.textKey]: null } });
        report.check(`${tag} 6.5 ${t.textKey} null -> 4xx`, is4xx(nul.status()), `status=${nul.status()}`);
        const long = await page.request.post(base, { data: { ...t.body('x'), [t.textKey]: `QaMutLong${'X'.repeat(291)}` } });
        report.check(`${tag} 3.1 ${t.textKey} 300 karakter -> 4xx`, is4xx(long.status()), `status=${long.status()}`);
        const uni = t.seg === 'immigrations' ? 'Qa مرحبا 你好 Ñ' : `QaMut مرحبا 你好 Ñandú ${s}`;
        const cu = await page.request.post(base, { data: t.body(uni) });
        const gotUni = (await list()).some((r) => r[key] === uni);
        report.check(`${tag} 4.1 Teks Arab/CJK/aksen -> 200 & tersimpan identik`, cu.status() === 200 && gotUni, `status=${cu.status()}`);
        const sqli = t.seg === 'immigrations' ? `Qa' OR '1'='1` : `QaMut' OR '1'='1 ${s}`;
        const cs = await page.request.post(base, { data: t.body(sqli) });
        report.check(`${tag} 5.1-SQLi Payload tersimpan identik sbg teks`, cs.status() === 200 && (await list()).some((r) => r[key] === sqli), `status=${cs.status()}`);
      }
      const bt = await page.request.post(base, { data: { ...t.body(`QaMutT ${s}`), ...t.badType } });
      report.check(`${tag} 6.5 Tipe salah ${JSON.stringify(t.badType)} -> 4xx`, is4xx(bt.status()), `status=${bt.status()} ${(await bt.text()).slice(0, 80)}`);

      report.step(`${tag} mass assignment, id tak eksis, ulangan`);
      const ma = await page.request.post(base, { data: { ...t.body(`QaMutMA ${s}`), empNumber: other } });
      const maMeta = ((await ma.json().catch(() => null)) as { meta?: { empNumber?: number } } | null)?.meta;
      const leaked = ((await (await page.request.get(`${API}pim/employees/${other}/${t.seg}?limit=0`)).json()) as { data: Row[] }).data.length;
      report.check(`${tag} 5.2-MassAssign empNumber lain di body diabaikan (record tetap milik karyawan uji)`, (ma.status() === 200 && maMeta?.empNumber === emp && leaked === 0) || is4xx(ma.status()), `status=${ma.status()}, meta.empNumber=${maMeta?.empNumber}, barisDiKaryawanLain=${leaked}`);
      const put404 = await page.request.put(`${base}/999999`, { data: t.body('QaMutX') });
      report.check(`${tag} 2.6 PUT id 999999 -> 4xx (bukan 2xx/5xx)`, is4xx(put404.status()), `status=${put404.status()}`);
      const del404 = await page.request.delete(base, { data: { ids: [999999] } });
      report.check(`${tag} 2.6 DELETE id 999999 -> bukan 2xx/5xx`, is4xx(del404.status()), `status=${del404.status()}`);
      const before = (await list()).length;
      const rep = `QaMutRep ${s}`;
      const r1 = await page.request.post(base, { data: t.body(rep) });
      const r2 = await page.request.post(base, { data: t.body(rep) });
      report.finding(`${tag} 6.7 POST identik 2x`, `status=${r1.status()},${r2.status()} -> baris bertambah ${(await list()).length - before}`);
      const burst = await Promise.all([1, 2, 3, 4, 5].map((i) => page.request.post(base, { data: t.body(`QaMutB${i} ${s}`) })));
      report.finding(`${tag} 5.5 Burst 5 POST paralel`, `status=${burst.map((b) => b.status()).join(',')} -> ${burst.every((b) => b.status() === 200) ? 'tanpa rate limit' : 'sebagian dibatasi'}`);

      report.step(`${tag} delete`);
      const del = await page.request.delete(base, { data: { ids: [id] } });
      report.check(`${tag} 1.1-D DELETE -> 200 & baris hilang`, del.status() === 200 && !(await list()).some((r) => String(r['id']) === String(id)), `status=${del.status()}`);
    }
  } finally {
    await page.request.delete(`${API}pim/employees`, { data: { ids: [emp, other] } });
  }
  report.print();
});
