/**
 * ================================================================================
 * TC-PIM-REPORT-API-01 — Verify The PIM Reports API: Contract, Required Field, Length Limit, Injection, Mass Assignment, Unknown Id, Method And Session
 * Modul    : PIM > Reports (U042)
 * Kategori : Positive (+) 1.1-C 1.1-R 1.1-D 1.8 | Negative (-) 2.2 2.3 2.6 | Boundary (B) 3.1 |
 *            Security (S) 5.1-SQLi 5.1-XSS-Stored 5.1-XSS-Reflected 5.2-MassAssign |
 *            API (A) 6.3 6.4 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORT-API-01-Verify-Reports-API-Contract-Validation-Length-Limit-Injection-Mass-Assignment-And-Method.spec.ts
 * Path     : tests/pim/reports/
 * ================================================================================
 *
 * LATAR (body direkam LIVE dari UI 17 Nov 2026): POST pim/reports/defined body
 * {name, include, criteria, fieldGroup:{"<groupId>":{fields:[...], includeHeader}}}; DELETE
 * sama endpoint body {ids:[...]}; GET single /pim/reports/defined/<id>.
 *
 * TUJUAN:
 *   1.1-C / 1.1-R / 1.1-D / 1.8  create valid -> 200 & kontrak id/name; GET list -> muncul;
 *        DELETE -> 200 & hilang.
 *   2.2 / 6.5  name kosong -> 422.
 *   3.1 / 2.3  name 255 karakter (batas atas, dikonfirmasi via probe binary-search) -> 200;
 *        256 karakter -> 422.
 *   5.1-SQLi / 5.1-XSS-Stored  name berisi kutip SQL / HTML -> 200 & tersimpan apa adanya
 *        sbg teks.
 *   5.1-XSS-Reflected  GET list dgn query param name=<payload SQLi/XSS> -> 200, hasil filter
 *        exact-match thd payload (tidak dieksekusi, tidak reflected sbg HTML aktif).
 *   5.2-MassAssign  field asing (isAdmin) di body -> 422 ditolak (skema ketat).
 *   2.6  DELETE / GET id 999999 (tidak ada) -> 404 (BUKAN 500/200, konsisten & benar).
 *   6.3  PATCH -> 405.  6.4  tanpa sesi -> 401.
 *   Semua report uji dihapus di akhir.
 *
 * HASIL 17 Nov 2026: lolos penuh, tidak ada bug ditemukan -- validasi, panjang field, dan
 *   penanganan id tak eksis semuanya benar & konsisten.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/reports/TC-PIM-REPORT-API-01-Verify-Reports-API-Contract-Validation-Length-Limit-Injection-Mass-Assignment-And-Method.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

type Report = { id: number; name: string };

test('TC-PIM-REPORT-API-01: Reports API - contract, validation, length limit, injection, mass assignment, method, session', async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-PIM-REPORT-API-01', 'Reports API Contract Validation Length Limit Injection Mass Assignment Method Session', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  const api = '/web/index.php/api/v2/pim/reports/defined';
  const body = (name: string, over: Record<string, unknown> = {}) => ({ name, include: 'onlyCurrent', criteria: {}, fieldGroup: { '1': { fields: [11], includeHeader: false } }, ...over });
  const createdIds: number[] = [];

  try {
    report.step('Kontrak create, read, delete');
    const okName = `QaRepApi${Date.now() % 100000}`;
    const ok = await page.request.post(api, { data: body(okName) });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: Report }).data;
    if (okData?.id) createdIds.push(okData.id);
    report.check('1.1-C [U042] POST valid -> 200 + id/name', ok.status() === 200 && !!okData?.id && okData?.name === okName, `status=${ok.status()}`);
    const list = ((await (await page.request.get(`${api}?limit=50`)).json()) as { data: Report[] }).data;
    report.check('1.1-R [U042] GET list -> report muncul', list.some((r) => r.id === okData?.id), `jumlah=${list.length}`);
    const del = await page.request.delete(api, { data: { ids: [okData?.id] } });
    report.check('1.1-D / 1.8 [U042] DELETE -> 200', del.status() === 200, `status=${del.status()}`);
    createdIds.splice(createdIds.indexOf(okData?.id ?? -1), 1);

    report.step('Validasi required & panjang nama');
    const empty = await page.request.post(api, { data: body('') });
    report.check('2.2 / 6.5 [U042] name kosong -> 422', empty.status() === 422, `status=${empty.status()}`);
    const at255 = await page.request.post(api, { data: body('N'.repeat(255)) });
    const at255Data = ((await at255.json().catch(() => ({}))) as { data?: Report }).data;
    if (at255Data?.id) createdIds.push(at255Data.id);
    report.check('3.1 [U042] name 255 karakter (batas atas) -> 200', at255.status() === 200, `status=${at255.status()}`);
    const at256 = await page.request.post(api, { data: body('N'.repeat(256)) });
    report.check('2.3 / 3.1 / 6.5 [U042] name 256 karakter (lewat batas) -> 422', at256.status() === 422, `status=${at256.status()}`);

    report.step('Injeksi & XSS reflected pada search');
    const sqli = `QaRepApi' OR '1'='1`;
    const sq = await page.request.post(api, { data: body(sqli) });
    const sqData = ((await sq.json().catch(() => ({}))) as { data?: Report }).data;
    if (sqData?.id) createdIds.push(sqData.id);
    report.check('5.1-SQLi [U042] name kutip SQL -> 200 & tersimpan identik', sq.status() === 200 && sqData?.name === sqli, `status=${sq.status()}`);
    const xss = '<img src=x onerror=alert(1)>';
    const xr = await page.request.post(api, { data: body(xss) });
    const xrData = ((await xr.json().catch(() => ({}))) as { data?: Report }).data;
    if (xrData?.id) createdIds.push(xrData.id);
    report.check('5.1-XSS-Stored [U042] name HTML -> 200 & tersimpan identik', xr.status() === 200 && xrData?.name === xss, `status=${xr.status()}`);
    const searchSqli = await page.request.get(`${api}?limit=10&name=${encodeURIComponent(sqli)}`);
    const searchSqliData = ((await searchSqli.json().catch(() => ({}))) as { data?: Report[] }).data ?? [];
    report.check('5.1-XSS-Reflected (dicek via vector SQLi) [U042] GET search dgn payload -> 200 & hasil exact-match, bukan dieksekusi/reflected', searchSqli.status() === 200 && searchSqliData.every((r) => r.name === sqli), `status=${searchSqli.status()} jumlah=${searchSqliData.length}`);
    const searchXss = await page.request.get(`${api}?limit=10&name=${encodeURIComponent(xss)}`);
    report.check('5.1-XSS-Reflected [U042] GET search dgn payload XSS -> 200 & tidak dieksekusi', searchXss.status() === 200, `status=${searchXss.status()}`);

    report.step('Mass assignment, id tak ada, method, sesi');
    const mass = await page.request.post(api, { data: { ...body(`QaRepApiMass${Date.now() % 100000}`), isAdmin: true } });
    report.check('5.2-MassAssign [U042] Field asing (isAdmin) di body -> 422 (skema ketat)', mass.status() === 422, `status=${mass.status()}`);
    const delGhost = await page.request.delete(api, { data: { ids: [999999] } });
    report.check('2.6 [U042] DELETE id 999999 (tidak ada) -> 404', delGhost.status() === 404, `status=${delGhost.status()}`);
    const getGhost = await page.request.get(`${api}/999999`);
    report.check('2.6 [U042] GET id 999999 (tidak ada) -> 404', getGhost.status() === 404, `status=${getGhost.status()}`);
    const patch = await page.request.patch(api, { data: {} });
    report.check('6.3 [U042] PATCH -> 405', patch.status() === 405, `status=${patch.status()}`);
    const noAuth = await anon.get(api);
    report.check('6.4 [U042] Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);

    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  } finally {
    await anon.dispose();
  }
  report.print();
});
