/**
 * ================================================================================
 * TC-PIM-PD-API-01 — Verify The Personal Details API: Contract, Required Fields, Length Limit, Enum Validation, Injection, Unknown Lookup Id, Mass Assignment, Method And Session
 * Modul    : PIM > Employee > Personal Details (U088)
 * Kategori : Positive (+) 1.1-U | Negative (-) 2.1 2.2 | Boundary (B) 3.1 | Security (S)
 *            5.1-SQLi 5.1-XSS-Stored 5.2-MassAssign | API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-API-01-Verify-Personal-Details-API-Contract-Validation-Length-Limit-Injection-Unknown-Lookup-Id-And-Mass-Assignment.spec.ts
 * Path     : tests/pim/personal-details/
 * ================================================================================
 *
 * LATAR (body direkam LIVE dari UI 17 Nov 2026): PUT pim/employees/<N>/personal-details
 * body {lastName,firstName,middleName,employeeId,otherId,drivingLicenseNo,
 * drivingLicenseExpiredDate,gender,birthday,nationalityId}. Batas panjang firstName/
 * lastName = 30 karakter (SAMA dgn batas yg sudah dikonfirmasi di Add Employee
 * TC-PIM-ADD-11/12 -- konsisten antar endpoint, bukan temuan baru).
 *
 * TUJUAN:
 *   1.1-U  update valid -> 200 & kontrak.
 *   2.1 / 6.5  firstName & lastName kosong -> 422.
 *   2.2 / 6.5  gender di luar enum (99) -> 422 (ditegakkan benar).
 *   3.1  firstName 30 karakter (batas atas) -> 200; 31 karakter -> 422.
 *   5.1-SQLi / 5.1-XSS-Stored  firstName/lastName kutip SQL & HTML -> 200 & tersimpan apa
 *        adanya sbg teks.
 *   4.1 (dicek bersamaan)  Arab/CJK -> 200 & tersimpan apa adanya.
 *   5.2-MassAssign  field asing (isAdmin) -> 422 ditolak (skema ketat).
 *   2.6 / 6.5  empNumber tidak ada (999999) -> 422 (benar); nationalityId tidak ada
 *        (999999) -> dicatat (lihat HASIL).
 *   6.3  PATCH -> 405.  6.4  tanpa sesi -> 401.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-470 (High) -- nationalityId yg tidak ada
 *   (999999) mengembalikan HTTP 500 Internal Server Error, bukan 422 -- pola "ghost id ->
 *   500" yg SAMA dgn Report-to (BG-466) & Job (BG-467), KONFIRMASI KE-3 bhw backend PIM
 *   tidak konsisten memvalidasi lookup id sebelum diproses (sebagian field spt gender &
 *   empNumber BENAR divalidasi 422, sebagian lain spt nationalityId/jobTitleId/empStatusId/
 *   locationId/supervisor empNumber TIDAK, menyebabkan 500).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/personal-details/TC-PIM-PD-API-01-Verify-Personal-Details-API-Contract-Validation-Length-Limit-Injection-Unknown-Lookup-Id-And-Mass-Assignment.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

const is5xx = (n: number) => n >= 500;
type PersonalDetails = { empNumber: number; firstName: string; lastName: string };

test('TC-PIM-PD-API-01: Personal Details API - contract, validation, length limit, injection, unknown lookup id, mass assignment, method, session', async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-PIM-PD-API-01', 'Personal Details API Contract Validation Length Limit Injection Unknown Lookup Id Mass Assignment Method Session', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  const emp = await createEmployee(page.request, 'QaPdApi', `L${Date.now() % 100000}`);
  const api = `/web/index.php/api/v2/pim/employees/${emp}/personal-details`;
  const body = (firstName: string, lastName: string, over: Record<string, unknown> = {}) => ({ lastName, firstName, middleName: '', employeeId: null, otherId: '', drivingLicenseNo: '', drivingLicenseExpiredDate: null, gender: null, birthday: null, nationalityId: null, ...over });

  try {
    report.step('Kontrak update valid');
    const ok = await page.request.put(api, { data: body('QaPdApiFirst', 'QaPdApiLast') });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: PersonalDetails }).data;
    report.check('1.1-U [U088] PUT valid -> 200 + kontrak firstName/lastName', ok.status() === 200 && okData?.firstName === 'QaPdApiFirst' && okData?.lastName === 'QaPdApiLast', `status=${ok.status()}`);

    report.step('Required field kosong & enum');
    const empty = await page.request.put(api, { data: body('', '') });
    report.check('2.1 / 6.5 [U088] firstName & lastName kosong -> 422', empty.status() === 422, `status=${empty.status()}`);
    const badGender = await page.request.put(api, { data: body('QaPdApi', 'Test', { gender: 99 }) });
    report.check('2.2 / 6.5 [U088] gender di luar enum (99) -> 422 (ditegakkan benar)', badGender.status() === 422, `status=${badGender.status()}`);

    report.step('Panjang & injeksi');
    const at30 = await page.request.put(api, { data: body('N'.repeat(30), 'Test') });
    report.check('3.1 [U088] firstName 30 karakter (batas atas) -> 200', at30.status() === 200, `status=${at30.status()}`);
    const at31 = await page.request.put(api, { data: body('N'.repeat(31), 'Test') });
    report.check('3.1 / 6.5 [U088] firstName 31 karakter (lewat batas) -> 422', at31.status() === 422, `status=${at31.status()}`);
    const sqli = `QaPdApi' OR '1'='1`;
    const sq = await page.request.put(api, { data: body(sqli, 'Test') });
    const sqData = ((await sq.json().catch(() => ({}))) as { data?: PersonalDetails }).data;
    report.check('5.1-SQLi [U088] firstName kutip SQL -> 200 & tersimpan identik', sq.status() === 200 && sqData?.firstName === sqli, `status=${sq.status()}`);
    const xss = '<img src=x onerror=alert(1)>';
    const xr = await page.request.put(api, { data: body(xss, 'Test') });
    const xrData = ((await xr.json().catch(() => ({}))) as { data?: PersonalDetails }).data;
    report.check('5.1-XSS-Stored [U088] firstName HTML -> 200 & tersimpan identik', xr.status() === 200 && xrData?.firstName === xss, `status=${xr.status()}`);
    const unicode = await page.request.put(api, { data: body('مرحبا', '你好') });
    const unicodeData = ((await unicode.json().catch(() => ({}))) as { data?: PersonalDetails }).data;
    report.check('4.1 [U088] firstName/lastName Arab/CJK -> 200 & tersimpan apa adanya', unicode.status() === 200 && unicodeData?.firstName === 'مرحبا' && unicodeData?.lastName === '你好', `status=${unicode.status()}`);

    report.step('Mass assignment, empNumber tidak ada, method, sesi');
    const mass = await page.request.put(api, { data: { ...body('QaPdApi', 'Test'), isAdmin: true } });
    report.check('5.2-MassAssign [U088] Field asing (isAdmin) -> 422 (skema ketat)', mass.status() === 422, `status=${mass.status()}`);
    const ghostEmp = await page.request.put('/web/index.php/api/v2/pim/employees/999999/personal-details', { data: body('x', 'y') });
    report.check('2.6 / 6.5 [U088] empNumber tidak ada (999999) -> 422 (benar)', ghostEmp.status() === 422, `status=${ghostEmp.status()}`);
    const patch = await page.request.patch(api, { data: {} });
    report.check('6.3 [U088] PATCH -> 405', patch.status() === 405, `status=${patch.status()}`);
    const noAuth = await anon.get(api);
    report.check('6.4 [U088] Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);

    report.step('Lookup id tidak ada (lihat HASIL utk bug)');
    const ghostNationality = await page.request.put(api, { data: body('QaPdApi', 'Test', { nationalityId: 999999 }) });
    report.check('2.6 / 6.5 [U088] nationalityId tidak ada (999999) -> TIDAK 500 (seharusnya 422)', !is5xx(ghostNationality.status()), `status=${ghostNationality.status()}`);
  } finally {
    await anon.dispose();
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
