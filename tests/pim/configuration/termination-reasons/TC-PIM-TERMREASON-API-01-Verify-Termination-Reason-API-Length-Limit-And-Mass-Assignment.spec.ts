/**
 * ================================================================================
 * TC-PIM-TERMREASON-API-01 — Verify The Termination Reason API: Length Limit, Mass Assignment, Single-Field Scope
 * Modul    : PIM > Configuration > Termination Reasons (U040)
 * Kategori : Boundary (B) 3.1 | Security (S) 5.2-MassAssign | API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-TERMREASON-API-01-Verify-Termination-Reason-API-Length-Limit-And-Mass-Assignment.spec.ts
 * Path     : tests/pim/configuration/termination-reasons/
 * ================================================================================
 *
 * LATAR: POST pim/termination-reasons body {name} -- hanya SATU field, tidak ada field
 * lain, tidak ada relasi ke entity lain -- variasi input opsional & relasi antar-entity
 * tidak berlaku pd unit ini, dicatat via report.finding() TANPA kode literal di label
 * (supaya tidak salah ke-tag COVERED oleh matrix tooling).
 *
 * TUJUAN:
 *   3.1  name 100 karakter (batas atas, dikonfirmasi via probe binary-search) -> 200;
 *        101 karakter -> 422 -- SAMA batasnya dgn Reporting Methods (TC-PIM-REPORTMETHOD-
 *        API-01), dikonfirmasi terpisah di sini.
 *   2.2  name hanya whitespace (format salah) -> 422 (ditegakkan).
 *   5.2-MassAssign  field asing (isAdmin) -> 422 ditolak (skema ketat).
 *   Semua record uji dihapus di akhir.
 *
 * HASIL 17 Nov 2026: lolos penuh, tidak ada bug ditemukan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/termination-reasons/TC-PIM-TERMREASON-API-01-Verify-Termination-Reason-API-Length-Limit-And-Mass-Assignment.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

type NamedRecord = { id: number; name: string };

test('TC-PIM-TERMREASON-API-01: Termination Reason API - length limit, mass assignment', async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-TERMREASON-API-01', 'Termination Reason API Length Limit Mass Assignment', env.baseURL);
  const stamp = Date.now() % 100000;
  const createdTr: number[] = [];
  const mkName = (totalLen: number, tag: string) => {
    const prefix = `Qa${tag}_`;
    return (prefix + 'X'.repeat(Math.max(0, totalLen - prefix.length))).slice(0, totalLen);
  };
  const api = '/web/index.php/api/v2/pim/termination-reasons';

  report.step('Catatan cakupan: hanya 1 field (name), tidak ada relasi/field opsional lain');
  report.finding('Variasi input opsional & relasi antar-entity tidak berlaku', 'Termination Reasons hanya punya SATU field (name), tidak ada field lain utk diuji opsional, & tidak ada relasi ke entity lain.');

  report.step('Panjang & mass assignment');
  const name100 = mkName(100, `Tr${stamp}a`);
  const at100 = await page.request.post(api, { data: { name: name100 } });
  const at100Data = ((await at100.json().catch(() => ({}))) as { data?: NamedRecord }).data;
  if (at100Data?.id) createdTr.push(at100Data.id);
  report.check('3.1 [U040] name 100 karakter (batas atas) -> 200', at100.status() === 200 && name100.length === 100, `status=${at100.status()} len=${name100.length}`);
  const name101 = mkName(101, `Tr${stamp}b`);
  const at101 = await page.request.post(api, { data: { name: name101 } });
  report.check('3.1 / 6.5 [U040] name 101 karakter (lewat batas) -> 422', at101.status() === 422 && name101.length === 101, `status=${at101.status()}`);
  const mass = await page.request.post(api, { data: { name: `QaTrMass${stamp}`, isAdmin: true } });
  report.check('5.2-MassAssign [U040] Field asing (isAdmin) -> 422 (skema ketat)', mass.status() === 422, `status=${mass.status()}`);
  const whitespaceOnly = await page.request.post(api, { data: { name: '   ' } });
  report.check('2.2 [U040] name hanya whitespace (format salah) -> 422 (ditegakkan)', whitespaceOnly.status() === 422, `status=${whitespaceOnly.status()}`);

  if (createdTr.length) await page.request.delete(api, { data: { ids: createdTr } }).catch(() => null);
  report.print();
});
