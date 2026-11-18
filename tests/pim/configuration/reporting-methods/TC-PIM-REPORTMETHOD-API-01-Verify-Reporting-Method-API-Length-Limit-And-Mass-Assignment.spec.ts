/**
 * ================================================================================
 * TC-PIM-REPORTMETHOD-API-01 — Verify The Reporting Method API: Length Limit, Mass Assignment, Single-Field Scope
 * Modul    : PIM > Configuration > Reporting Methods (U039)
 * Kategori : Boundary (B) 3.1 | Security (S) 5.2-MassAssign | API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTMETHOD-API-01-Verify-Reporting-Method-API-Length-Limit-And-Mass-Assignment.spec.ts
 * Path     : tests/pim/configuration/reporting-methods/
 * ================================================================================
 *
 * LATAR: POST pim/reporting-methods body {name} -- hanya SATU field, tidak ada field lain,
 * tidak ada relasi ke entity lain -- variasi input opsional & relasi antar-entity tidak
 * berlaku pd unit ini, dicatat via report.finding() TANPA kode literal di label (supaya
 * tidak salah ke-tag COVERED oleh matrix tooling).
 *
 * TUJUAN:
 *   3.1  name 100 karakter (batas atas, dikonfirmasi via probe binary-search) -> 200;
 *        101 karakter -> 422.
 *   2.2  name hanya whitespace (format salah) -> 422 (ditegakkan).
 *   5.2-MassAssign  field asing (isAdmin) -> 422 ditolak (skema ketat).
 *   Semua record uji dihapus di akhir.
 *
 * HASIL 17 Nov 2026: lolos penuh, tidak ada bug ditemukan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/reporting-methods/TC-PIM-REPORTMETHOD-API-01-Verify-Reporting-Method-API-Length-Limit-And-Mass-Assignment.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

type NamedRecord = { id: number; name: string };

test('TC-PIM-REPORTMETHOD-API-01: Reporting Method API - length limit, mass assignment', async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORTMETHOD-API-01', 'Reporting Method API Length Limit Mass Assignment', env.baseURL);
  const stamp = Date.now() % 100000;
  const createdRm: number[] = [];
  const mkName = (totalLen: number, tag: string) => {
    const prefix = `Qa${tag}_`;
    return (prefix + 'X'.repeat(Math.max(0, totalLen - prefix.length))).slice(0, totalLen);
  };
  const api = '/web/index.php/api/v2/pim/reporting-methods';

  report.step('Catatan cakupan: hanya 1 field (name), tidak ada relasi/field opsional lain');
  report.finding('Variasi input opsional & relasi antar-entity tidak berlaku', 'Reporting Methods hanya punya SATU field (name), tidak ada field lain utk diuji opsional, & tidak ada relasi ke entity lain.');

  report.step('Panjang & mass assignment');
  const name100 = mkName(100, `Rm${stamp}a`);
  const at100 = await page.request.post(api, { data: { name: name100 } });
  const at100Data = ((await at100.json().catch(() => ({}))) as { data?: NamedRecord }).data;
  if (at100Data?.id) createdRm.push(at100Data.id);
  report.check('3.1 [U039] name 100 karakter (batas atas) -> 200', at100.status() === 200 && name100.length === 100, `status=${at100.status()} len=${name100.length}`);
  const name101 = mkName(101, `Rm${stamp}b`);
  const at101 = await page.request.post(api, { data: { name: name101 } });
  report.check('3.1 / 6.5 [U039] name 101 karakter (lewat batas) -> 422', at101.status() === 422 && name101.length === 101, `status=${at101.status()}`);
  const mass = await page.request.post(api, { data: { name: `QaRmMass${stamp}`, isAdmin: true } });
  report.check('5.2-MassAssign [U039] Field asing (isAdmin) -> 422 (skema ketat)', mass.status() === 422, `status=${mass.status()}`);
  const whitespaceOnly = await page.request.post(api, { data: { name: '   ' } });
  report.check('2.2 [U039] name hanya whitespace (format salah) -> 422 (ditegakkan)', whitespaceOnly.status() === 422, `status=${whitespaceOnly.status()}`);

  report.step('4.8 Behavior non-obvious -- hapus lalu buat ulang nama yg sama');
  if (at100Data?.id) {
    await page.request.delete(api, { data: { ids: [at100Data.id] } });
    const recreated = await page.request.post(api, { data: { name: name100 } });
    const recreatedData = ((await recreated.json().catch(() => ({}))) as { data?: NamedRecord }).data;
    if (recreatedData?.id) createdRm.push(recreatedData.id);
    report.check('4.8 [U039] Hapus lalu buat ulang nama yg sama -> diterima langsung dgn id BARU (tidak ada cooldown/reservasi nama bekas)', recreated.status() === 200 && recreatedData?.id !== at100Data.id, `status=${recreated.status()} idLama=${at100Data.id} idBaru=${recreatedData?.id}`);
  }

  if (createdRm.length) await page.request.delete(api, { data: { ids: createdRm } }).catch(() => null);
  report.print();
});
