/**
 * ================================================================================
 * TC-MYINFO-IMMIGRATION-02 — Verify The Immigration API Of An Employee's Own Record: Server-Side Validation, Mass Assignment, Injection, Wrong Method And No Session
 * Modul    : My Info - Immigration (ESS, U111)
 * Kategori : Negative (-) 2.1 2.6 | Boundary (B) 3.1 3.4 | Security (S) 5.1-SQLi 5.2-MassAssign |
 *            API (A) 6.1 6.2 6.3 6.4 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-IMMIGRATION-02-Verify-Immigration-API-Validation-Mass-Assignment-Injection-And-Auth.spec.ts
 * Path     : tests/my-info/security/
 * ================================================================================
 *
 * TUJUAN (sesi ESS, endpoint pim/employees/<self>/immigrations; aturan form = kontrak yg diharapkan):
 *   6.1 / 6.2  POST valid -> 200, data berisi id, number, issuedDate, expiryDate, type.
 *   3.4  Expiry Date sebelum Issued Date -> 4xx (form menolak dgn "Expiry date should be after
 *        issued date"; Work Experience & License menolak hal sama di server dgn 422).
 *   3.1  number 31 karakter -> 4xx (batas form 30).
 *   2.1 / 6.5  number kosong / null -> 4xx; type di luar 1/2 -> 4xx; tanggal bukan tanggal -> 4xx.
 *   5.1-SQLi  number "' OR '1'='1" -> tersimpan identik sbg teks.
 *   5.2-MassAssign  field ekstra (empNumber karyawan lain, id) -> diabaikan: record tetap milik
 *        sendiri & id dari server.
 *   2.6  PUT id 999999 -> 4xx; 6.3 PATCH -> 405; 6.4 tanpa sesi -> 401.
 *   Semua record uji dihapus di akhir.
 *
 * HASIL 16 Nov 2026: 14/17 lolos. SENGAJA FAILED (R3), validasi hanya ada di form, tidak di server:
 *   3.4 expiryDate sebelum issuedDate -> 200 & tersimpan; 6.5 type 0 dan 3 -> 200 lalu tampil sbg
 *   "VISA" di tabel (99/-1/"x" ditolak 422) = BUG BG-433. Lolos: number >30, kosong/null, tanggal invalid,
 *   SQLi literal, empNumber ekstra diabaikan, id ekstra ditolak 422, 405, 401.
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/security/TC-MYINFO-IMMIGRATION-02-Verify-Immigration-API-Validation-Mass-Assignment-Injection-And-Auth.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession, openMyInfoFromMenu } from '../../../src/utils/myInfo';

const is4xx = (n: number) => n >= 400 && n < 500;
type Imm = { id: string; number: string; issuedDate: string | null; expiryDate: string | null; type: number };

test('TC-MYINFO-IMMIGRATION-02: immigration API validation, mass assignment, injection and auth', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-IMMIGRATION-02', 'Immigration API Validation Mass Assignment Injection Auth', env.baseURL);
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaImmApi');
  const anon = await request.newContext({ baseURL: env.baseURL });
  try {
    const empNumber = await openMyInfoFromMenu(essPage);
    const api = `/web/index.php/api/v2/pim/employees/${empNumber}/immigrations`;
    const req = essPage.request;
    const body = (over: Record<string, unknown> = {}) => ({ number: `QaImmApi${Date.now() % 100000}`, issuedDate: '2024-01-10', expiryDate: '2030-01-10', type: 1, status: '', reviewDate: '', comment: '', ...over });
    const list = async () => ((await (await req.get(api)).json()) as { data: Imm[] }).data;

    report.step('Kontrak create');
    const ok = await req.post(api, { data: body() });
    const okData = ((await ok.json().catch(() => null)) as { data?: Imm } | null)?.data;
    report.check('6.1 POST valid -> 200', ok.status() === 200, `status=${ok.status()}`);
    report.check('6.2 Respons berisi id, number, issuedDate, expiryDate, type', !!okData?.id && !!okData?.number && okData?.issuedDate === '2024-01-10' && okData?.expiryDate === '2030-01-10' && okData?.type === 1, JSON.stringify(okData).slice(0, 160));

    report.step('Validasi sisi server');
    const rev = await req.post(api, { data: body({ number: 'QaImmRev', issuedDate: '2024-01-10', expiryDate: '2020-01-10' }) });
    report.check('3.4 Expiry sebelum Issued -> 4xx (seperti form & seperti Work Experience/License)', is4xx(rev.status()), `status=${rev.status()} ${(await rev.text()).slice(0, 120)}`);
    const long = await req.post(api, { data: body({ number: 'N'.repeat(31) }) });
    report.check('3.1 number 31 karakter -> 4xx (batas 30)', is4xx(long.status()), `status=${long.status()}`);
    // Document type: 1 = Passport, 2 = Visa (the only two radio options). 99/-1/"x" are rejected live;
    // 0 and 3 were accepted and then listed as "VISA" in the table (probe 2026-11-16).
    for (const [label, over] of [['number kosong', { number: '' }], ['number null', { number: null }], ['type 0 (bukan Passport/Visa)', { type: 0 }], ['type 3 (bukan Passport/Visa)', { type: 3 }], ['type 99', { type: 99 }], ['issuedDate bukan tanggal', { issuedDate: 'kemarin' }]] as const) {
      const r = await req.post(api, { data: body(over) });
      report.check(`2.1 / 6.5 ${label} -> 4xx`, is4xx(r.status()), `status=${r.status()}`);
    }

    report.step('Injeksi & mass assignment');
    const sqli = `QaImm' OR '1'='1`;
    const sq = await req.post(api, { data: body({ number: sqli }) });
    const sqRow = (await list()).find((r) => r.number === sqli);
    report.check('5.1-SQLi Payload tersimpan identik sbg teks', sq.status() === 200 && !!sqRow, `status=${sq.status()}, ditemukan=${!!sqRow}`);
    const maNum = `QaImmMA${Date.now() % 100000}`;
    const ma = await req.post(api, { data: { ...body({ number: maNum }), empNumber: 1 } });
    const maData = ((await ma.json().catch(() => null)) as { data?: Imm; meta?: { empNumber?: number } } | null);
    report.check('5.2-MassAssign empNumber karyawan lain di body diabaikan (record tetap milik sendiri)', ma.status() === 200 && maData?.meta?.empNumber === empNumber && (await list()).some((r) => r.number === maNum), `status=${ma.status()}, meta.empNumber=${maData?.meta?.empNumber} (sendiri=${empNumber})`);
    const maId = await req.post(api, { data: { ...body({ number: `${maNum}i` }), id: '999999' } });
    const maIdData = ((await maId.json().catch(() => null)) as { data?: Imm } | null)?.data;
    report.check('5.2-MassAssign id dari klien ditolak (4xx) atau diabaikan (id != 999999)', is4xx(maId.status()) || (maId.status() === 200 && maIdData?.id !== '999999'), `status=${maId.status()}, id=${maIdData?.id}`);

    report.step('Method, id tak eksis, sesi');
    const put404 = await req.put(`${api}/999999`, { data: body() });
    report.check('2.6 PUT id 999999 -> 4xx', is4xx(put404.status()), `status=${put404.status()}`);
    const patch = await req.patch(api, { data: body() });
    report.check('6.3 PATCH -> 405', patch.status() === 405, `status=${patch.status()}`);
    const noAuth = await anon.get(api);
    report.check('6.4 Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);

    const ids = (await list()).map((r) => r.id);
    if (ids.length) await req.delete(api, { data: { ids } });
  } finally {
    await anon.dispose();
    await close();
  }
  report.print();
});
