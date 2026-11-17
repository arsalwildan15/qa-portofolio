/**
 * ================================================================================
 * TC-PIM-CUSTOMFIELD-API-01 — Verify The Custom Fields API: Contract, Update, Required Field, Length Limit, Injection, Duplicate Name Bypass, Mass Assignment, Unknown Id, Method And Session
 * Modul    : PIM > Configuration > Custom Fields (U037)
 * Kategori : Positive (+) 1.1-U 1.2 1.4 | Negative (-) 2.2 | Boundary (B) 3.1 | Security (S)
 *            5.1-SQLi 5.2-MassAssign | API (A) 6.5 6.7
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CUSTOMFIELD-API-01-Verify-Custom-Field-API-Contract-Validation-Length-Limit-Injection-And-Mass-Assignment.spec.ts
 * Path     : tests/pim/configuration/custom-fields/
 * ================================================================================
 *
 * LATAR (body direkam LIVE dari UI 17 Nov 2026): POST/PUT pim/custom-fields body
 * {fieldName, screen, fieldType, extraData}. DELETE pada /custom-fields/<id> -> 405 (tidak
 * didukung); endpoint ini pakai pola bulk-delete DELETE /custom-fields {ids:[...]} spt
 * endpoint PIM lain -- dikonfirmasi live, bukan ditebak (percobaan awal salah pakai
 * delete-by-path, menyisakan data uji tak terhapus dari sesi sebelumnya yg SEMPAT membuat
 * trial batas panjang salah simpul krn kolisi nama "NNNN..." dgn baris lama -- diperbaiki &
 * diverifikasi ulang dgn nama unik per percobaan sblm menulis TC final ini).
 * Batas panjang fieldName REAL = 250 karakter (dikonfirmasi via binary-search dgn nama UNIK
 * setiap percobaan: 250 -> 200 diterima, 251 -> 422 ditolak, konsisten).
 *
 * TUJUAN:
 *   1.1-U / 1.4  update valid -> 200 & fieldName berubah.
 *   1.2  fieldType valid lain diterima (variasi tipe field).
 *   2.2 / 6.5  fieldName kosong -> 422; fieldType di luar enum (999) -> 422.
 *   3.1  fieldName 250 karakter (batas atas) -> 200; 251 karakter -> 422.
 *   4.1 / 5.1-SQLi  fieldName Arab/CJK & kutip SQL -> 200 & tersimpan apa adanya sbg teks.
 *   5.2-MassAssign  field asing (isAdmin) -> 422 ditolak (skema ketat).
 *   6.7  fieldName duplikat (sama persis, langsung via API) -> dicatat (lihat HASIL).
 *   2.6  PUT id tidak ada (999999) -> 404.
 *   6.3  PATCH -> 405.  6.4  tanpa sesi -> 401.
 *   Semua custom field uji dihapus di akhir via bulk DELETE {ids}.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-468 (Low) -- fieldName duplikat (sama
 *   persis dgn field yg sudah ada) DITERIMA (200) & tersimpan sbg BARIS KEDUA via API
 *   langsung, padahal form Add Custom Field (TC-PIM-CUSTOMFIELD-04) menolaknya dgn pesan
 *   "Already exists" -- validasi keunikan nama HANYA di client (form), tidak ditegakkan di
 *   server, pola yg sama dgn validasi form-only yg sudah dikonfirmasi di modul lain
 *   (mis. Leave Holiday "Already exists", Immigration BG-433).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/custom-fields/TC-PIM-CUSTOMFIELD-API-01-Verify-Custom-Field-API-Contract-Validation-Length-Limit-Injection-And-Mass-Assignment.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

type CustomField = { id: number; fieldName: string; fieldType: number; screen: string };

test('TC-PIM-CUSTOMFIELD-API-01: Custom Fields API - contract, validation, length limit, injection, duplicate bypass, mass assignment, method, session', async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-PIM-CUSTOMFIELD-API-01', 'Custom Fields API Contract Validation Length Limit Injection Duplicate Bypass Mass Assignment Method Session', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  const api = '/web/index.php/api/v2/pim/custom-fields';
  const body = (fieldName: string, over: Record<string, unknown> = {}) => ({ fieldName, screen: 'personal', fieldType: 0, extraData: null, ...over });
  const stamp = Date.now() % 100000;
  const createdIds: number[] = [];

  try {
    report.step('Kontrak create & update');
    const okName = `QaCfApi${stamp}`;
    const ok = await page.request.post(api, { data: body(okName) });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: CustomField }).data;
    if (okData?.id) createdIds.push(okData.id);
    report.check('1.1-C / 6.2 [U037] POST valid -> 200 + id/fieldName/fieldType/screen', ok.status() === 200 && !!okData?.id && okData?.fieldName === okName, `status=${ok.status()}`);
    const upd = await page.request.put(`${api}/${okData?.id}`, { data: body(`${okName}Updated`) });
    const updData = ((await upd.json().catch(() => ({}))) as { data?: CustomField }).data;
    report.check('1.1-U / 1.4 [U037] PUT update -> 200 & fieldName berubah', upd.status() === 200 && updData?.fieldName === `${okName}Updated`, `status=${upd.status()}`);
    const otherType = await page.request.post(api, { data: body(`QaCfApiType${stamp}`, { fieldType: 1 }) });
    const otherTypeData = ((await otherType.json().catch(() => ({}))) as { data?: CustomField }).data;
    if (otherTypeData?.id) createdIds.push(otherTypeData.id);
    report.check('1.2 [U037] fieldType lain (1) -> 200 (variasi tipe valid)', otherType.status() === 200, `status=${otherType.status()}`);

    report.step('Validasi required & tipe');
    const empty = await page.request.post(api, { data: body('') });
    report.check('2.2 / 6.5 [U037] fieldName kosong -> 422', empty.status() === 422, `status=${empty.status()}`);
    const badType = await page.request.post(api, { data: body(`QaCfApiBad${stamp}`, { fieldType: 999 }) });
    report.check('2.2 / 6.5 [U037] fieldType di luar enum (999) -> 422', badType.status() === 422, `status=${badType.status()}`);

    report.step('Panjang (nama UNIK per percobaan agar tidak kolisi dgn baris lama) & injeksi');
    const mkLong = (totalLen: number, tag: string) => {
      const prefix = `QaL${tag}_`;
      return prefix + 'X'.repeat(Math.max(0, totalLen - prefix.length));
    };
    const name250 = mkLong(250, `${stamp}a`);
    const at250 = await page.request.post(api, { data: body(name250) });
    const at250Data = ((await at250.json().catch(() => ({}))) as { data?: CustomField }).data;
    if (at250Data?.id) createdIds.push(at250Data.id);
    report.check('3.1 [U037] fieldName 250 karakter (batas atas) -> 200', at250.status() === 200 && name250.length === 250, `status=${at250.status()} len=${name250.length}`);
    const name251 = mkLong(251, `${stamp}b`);
    const at251 = await page.request.post(api, { data: body(name251) });
    report.check('3.1 / 6.5 [U037] fieldName 251 karakter (lewat batas) -> 422', at251.status() === 422 && name251.length === 251, `status=${at251.status()} len=${name251.length}`);
    const unicode = await page.request.post(api, { data: body('مرحبا 你好') });
    const unicodeData = ((await unicode.json().catch(() => ({}))) as { data?: CustomField }).data;
    if (unicodeData?.id) createdIds.push(unicodeData.id);
    report.check('4.1 [U037] fieldName Arab/CJK -> 200 & tersimpan apa adanya', unicode.status() === 200 && unicodeData?.fieldName === 'مرحبا 你好', `status=${unicode.status()}`);
    const sqli = `QaCfApi' OR '1'='1`;
    const sq = await page.request.post(api, { data: body(sqli) });
    const sqData = ((await sq.json().catch(() => ({}))) as { data?: CustomField }).data;
    if (sqData?.id) createdIds.push(sqData.id);
    report.check('5.1-SQLi [U037] fieldName kutip SQL -> 200 & tersimpan identik', sq.status() === 200 && sqData?.fieldName === sqli, `status=${sq.status()}`);

    report.step('Mass assignment, duplikat via API (bypass form), id tak ada, method, sesi');
    const mass = await page.request.post(api, { data: body(`QaCfApiMass${stamp}`, { isAdmin: true }) });
    report.check('5.2-MassAssign [U037] Field asing (isAdmin) -> 422 (skema ketat)', mass.status() === 422, `status=${mass.status()}`);
    const dupName = `QaCfApiDup${stamp}`;
    const dup1 = await page.request.post(api, { data: body(dupName) });
    const dup1Data = ((await dup1.json().catch(() => ({}))) as { data?: CustomField }).data;
    if (dup1Data?.id) createdIds.push(dup1Data.id);
    const dup2 = await page.request.post(api, { data: body(dupName) });
    const dup2Data = ((await dup2.json().catch(() => ({}))) as { data?: CustomField }).data;
    if (dup2Data?.id) createdIds.push(dup2Data.id);
    report.check('6.7 [U037] fieldName duplikat via API langsung (bypass form) -> DITOLAK (4xx), bukan baris kedua', dup1.status() === 200 && dup2.status() >= 400 && dup2.status() < 500, `status1=${dup1.status()} status2=${dup2.status()} id1=${dup1Data?.id} id2=${dup2Data?.id}`);
    const ghostUpdate = await page.request.put(`${api}/999999`, { data: body(`QaCfApiGhost${stamp}`) });
    report.check('2.6 [U037] PUT id 999999 (tidak ada) -> 404', ghostUpdate.status() === 404, `status=${ghostUpdate.status()}`);
    const patch = await page.request.patch(api, { data: {} });
    report.check('6.3 [U037] PATCH -> 405', patch.status() === 405, `status=${patch.status()}`);
    const noAuth = await anon.get(api);
    report.check('6.4 [U037] Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);

    // DELETE pada /pim/custom-fields/<id> -> 405 (tidak didukung); endpoint ini pakai pola
    // bulk-delete {ids:[...]} spt endpoint PIM lain, dikonfirmasi live.
    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  } finally {
    await anon.dispose();
  }
  report.print();
});
