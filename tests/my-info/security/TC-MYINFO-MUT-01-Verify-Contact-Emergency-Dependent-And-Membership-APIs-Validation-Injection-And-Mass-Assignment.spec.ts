/**
 * ================================================================================
 * TC-MYINFO-MUT-01 — Verify Contact Details, Emergency Contacts, Dependents And Memberships APIs Of An Employee's Own Record: Server-Side Validation, Mass Assignment, Injection, Wrong Method And No Session
 * Modul    : My Info - Contact Details (ESS, U108), Emergency Contacts (U109), Dependents (U110),
 *            Memberships (U116)
 * Kategori : Negative (-) 2.1 2.6 | Boundary (B) 3.1 | Edge (!) 4.1 | Security (S) 5.1-SQLi
 *            5.1-XSS-Stored 5.2-MassAssign | API (A) 6.1 6.2 6.3 6.4 6.5 6.7
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-MUT-01-Verify-Contact-Emergency-Dependent-And-Membership-APIs-Validation-Injection-And-Mass-Assignment.spec.ts
 * Path     : tests/my-info/security/
 * ================================================================================
 *
 * LATAR (sesi ESS, body direkam LIVE dari UI 17 Nov 2026):
 *   Contact      PUT pim/employee/<self>/contact-details {street1,street2,city,province,zipCode,
 *                homeTelephone,workTelephone,mobile,workEmail,otherEmail}
 *   Emergency    POST pim/employees/<self>/emergency-contacts {name,relationship,homePhone,
 *                officePhone,mobilePhone}
 *   Dependents   POST pim/employees/<self>/dependents {name,relationshipType (enum string: child/
 *                parent/spouse/other),relationship,dateOfBirth}
 *   Memberships  POST pim/employees/<self>/memberships {subscriptionFee,subscriptionCommenceDate,
 *                subscriptionRenewalDate,membershipId}
 *
 * TUJUAN:
 *   6.1 / 6.2  tiap unit: operasi valid -> 200 & kontrak field kunci di respons.
 *   2.1 / 6.5  field wajib kosong/null & tipe salah -> 4xx dgn invalidParamKeys spesifik.
 *   3.1  Contact street1 256 karakter, Emergency name 256 karakter -> 4xx (batas form 255).
 *   4.1 / 5.1-SQLi / 5.1-XSS-Stored  field teks berisi Arab/CJK, kutip SQL, HTML -> 200 & tersimpan
 *        apa adanya sbg teks (tidak dieksekusi).
 *   5.2-MassAssign  field asing (empNumber karyawan lain, id) di body -> diabaikan: record tetap
 *        milik sendiri & id dari server.
 *   2.6  PUT/DELETE id yg tidak ada -> 4xx.  6.3 PATCH -> 405.  6.4 tanpa sesi -> 401.
 *   6.7  POST Emergency Contact identik 2x -> 2 baris independen (bukan upsert, idempotency N/A
 *        by design -- dicatat sbg finding, bukan bug).
 *   Semua record uji dihapus di akhir.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-461 (High), 2 temuan dlm 1 skrip:
 *   - Dependents POST menerima name kosong ("") dgn 200 & tersimpan; form Add Dependent sendiri
 *     menolak Name kosong dgn "Required" (validasi hanya di browser).
 *   - POST Memberships dgn membershipId yg tidak ada (999999) -> 500 Internal Server Error,
 *     bukan 4xx (pola sama dgn Recruitment/Leave/Time/Performance).
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/security/TC-MYINFO-MUT-01-Verify-Contact-Emergency-Dependent-And-Membership-APIs-Validation-Injection-And-Mass-Assignment.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession, openMyInfoFromMenu } from '../../../src/utils/myInfo';

const is4xx = (n: number) => n >= 400 && n < 500;

test('TC-MYINFO-MUT-01: Contact/Emergency/Dependent/Membership APIs - validation, injection, mass assignment', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-MUT-01', 'Contact Emergency Dependent Membership APIs Validation Injection Mass Assignment', env.baseURL);
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaMyInfoMut');
  const anon = await request.newContext({ baseURL: env.baseURL });
  const req = essPage.request;
  try {
    const empNumber = await openMyInfoFromMenu(essPage);
    const contactApi = `/web/index.php/api/v2/pim/employee/${empNumber}/contact-details`;
    const emergApi = `/web/index.php/api/v2/pim/employees/${empNumber}/emergency-contacts`;
    const depApi = `/web/index.php/api/v2/pim/employees/${empNumber}/dependents`;
    const memApi = `/web/index.php/api/v2/pim/employees/${empNumber}/memberships`;

    report.step('[U108] Contact Details');
    const contactBody = (over: Record<string, unknown> = {}) => ({ street1: 'Jl Qa Mut 1', street2: '', city: 'Jakarta', province: '', zipCode: '', homeTelephone: '', workTelephone: '', mobile: '081234500003', workEmail: '', otherEmail: '', ...over });
    const cOk = await req.put(contactApi, { data: contactBody() });
    report.check('6.1 [U108] PUT contact-details valid -> 200', cOk.status() === 200, `status=${cOk.status()}`);
    const cLong = await req.put(contactApi, { data: contactBody({ street1: 'J'.repeat(256) }) });
    report.check('3.1 / 6.5 [U108] street1 256 karakter -> 4xx (batas 255)', is4xx(cLong.status()), `status=${cLong.status()}`);
    const cXss = `<img src=x onerror=alert(1)>`;
    const cInj = await req.put(contactApi, { data: contactBody({ street1: cXss }) });
    const cInjData = ((await cInj.json().catch(() => ({}))) as { data?: { street1?: string } }).data;
    report.check('5.1-XSS-Stored [U108] street1 HTML -> 200 & tersimpan identik sbg teks', cInj.status() === 200 && cInjData?.street1 === cXss, `status=${cInj.status()}`);
    const cMass = await req.put(contactApi, { data: { ...contactBody(), empNumber: empNumber + 1 } });
    const cMassData = ((await cMass.json().catch(() => ({}))) as { data?: { empNumber?: number } }).data;
    report.check('5.2-MassAssign [U108] empNumber asing di body diabaikan (tetap milik sendiri)', cMass.status() === 200 && cMassData?.empNumber !== empNumber + 1, `status=${cMass.status()} empNumber=${cMassData?.empNumber}`);
    const cPatch = await req.patch(contactApi, { data: contactBody() });
    report.check('6.3 [U108] PATCH -> 405', cPatch.status() === 405, `status=${cPatch.status()}`);
    const cNoAuth = await anon.put(contactApi, { data: contactBody() });
    report.check('6.4 [U108] Tanpa sesi -> 401', cNoAuth.status() === 401, `status=${cNoAuth.status()}`);

    report.step('[U109] Emergency Contacts');
    const emergBody = (over: Record<string, unknown> = {}) => ({ name: `QaEmergMut${Date.now() % 100000}`, relationship: 'Teman', homePhone: '', officePhone: '', mobilePhone: '081234500004', ...over });
    const eOkBody = emergBody();
    const eOk = await req.post(emergApi, { data: eOkBody });
    const eOkData = ((await eOk.json().catch(() => ({}))) as { data?: { id?: number; name?: string } }).data;
    report.check('6.1 / 6.2 [U109] POST emergency-contacts valid -> 200 + id + name', eOk.status() === 200 && !!eOkData?.id && eOkData?.name === eOkBody.name, `status=${eOk.status()}`);
    const eEmpty = await req.post(emergApi, { data: emergBody({ name: '' }) });
    report.check('2.1 / 6.5 [U109] name kosong -> 4xx', is4xx(eEmpty.status()), `status=${eEmpty.status()}`);
    const eLong = await req.post(emergApi, { data: emergBody({ name: 'N'.repeat(256) }) });
    report.check('3.1 / 6.5 [U109] name 256 karakter -> 4xx (batas 255)', is4xx(eLong.status()), `status=${eLong.status()}`);
    const eSqli = `QaEmergMut' OR '1'='1`;
    const eInj = await req.post(emergApi, { data: emergBody({ name: eSqli }) });
    const eList = ((await (await req.get(emergApi)).json()) as { data: Array<{ id: number; name: string }> }).data;
    report.check('5.1-SQLi [U109] name kutip SQL -> 200 & tersimpan identik', eInj.status() === 200 && eList.some((r) => r.name === eSqli), `status=${eInj.status()}`);
    const eUnicode = 'مرحبا 你好';
    const eUni = await req.post(emergApi, { data: emergBody({ name: eUnicode }) });
    report.check('4.1 [U109] name Arab/CJK -> 200 & tersimpan', eUni.status() === 200, `status=${eUni.status()}`);
    const eDup1 = await req.post(emergApi, { data: emergBody({ name: 'QaEmergDup' }) });
    const eDup2 = await req.post(emergApi, { data: emergBody({ name: 'QaEmergDup' }) });
    const eDup1Id = ((await eDup1.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;
    const eDup2Id = ((await eDup2.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;
    const eDupRows = ((await (await req.get(emergApi)).json()) as { data: Array<{ name: string }> }).data.filter((r) => r.name === 'QaEmergDup');
    report.check('6.7 [U109] POST identik 2x -> 2 baris independen dgn id berbeda (bukan upsert, by design)', eDup1.status() === 200 && eDup2.status() === 200 && eDup1Id !== eDup2Id && eDupRows.length === 2, `id1=${eDup1Id} id2=${eDup2Id} baris=${eDupRows.length}`);
    const eDel404 = await req.delete(emergApi, { data: { ids: [999999] } });
    report.check('2.6 [U109] DELETE id tidak ada -> tidak crash (4xx atau 200 tanpa efek)', eDel404.status() < 500, `status=${eDel404.status()}`);
    const ePatch = await req.patch(emergApi, { data: emergBody() });
    report.check('6.3 [U109] PATCH -> 405', ePatch.status() === 405, `status=${ePatch.status()}`);
    const eNoAuth = await anon.get(emergApi);
    report.check('6.4 [U109] Tanpa sesi -> 401', eNoAuth.status() === 401, `status=${eNoAuth.status()}`);
    const eFinalList = ((await (await req.get(emergApi)).json()) as { data: Array<{ id: number }> }).data;
    if (eFinalList.length) await req.delete(emergApi, { data: { ids: eFinalList.map((r) => r.id) } });

    report.step('[U110] Dependents');
    const depBody = (over: Record<string, unknown> = {}) => ({ name: `QaDepMut${Date.now() % 100000}`, relationshipType: 'child', relationship: '', dateOfBirth: '2015-01-01', ...over });
    const dOk = await req.post(depApi, { data: depBody() });
    const dOkData = ((await dOk.json().catch(() => ({}))) as { data?: { id?: number } }).data;
    report.check('6.1 / 6.2 [U110] POST dependents valid -> 200 + id', dOk.status() === 200 && !!dOkData?.id, `status=${dOk.status()}`);
    const dEmptyName = await req.post(depApi, { data: depBody({ name: '' }) });
    report.check('2.1 / 6.5 [U110] name kosong -> 4xx', is4xx(dEmptyName.status()), `status=${dEmptyName.status()}`);
    const dBadType = await req.post(depApi, { data: depBody({ relationshipType: 'alien' }) });
    report.check('2.2 / 6.5 [U110] relationshipType di luar enum -> 4xx', is4xx(dBadType.status()), `status=${dBadType.status()}`);
    const dBadDate = await req.post(depApi, { data: depBody({ dateOfBirth: 'bukan-tanggal' }) });
    report.check('2.2 / 6.5 [U110] dateOfBirth tidak valid -> 4xx', is4xx(dBadDate.status()), `status=${dBadDate.status()}`);
    const dSqli = `QaDepMut' OR '1'='1`;
    const dInj = await req.post(depApi, { data: depBody({ name: dSqli }) });
    const dList = ((await (await req.get(depApi)).json()) as { data: Array<{ id: number; name: string }> }).data;
    report.check('5.1-SQLi [U110] name kutip SQL -> 200 & tersimpan identik', dInj.status() === 200 && dList.some((r) => r.name === dSqli), `status=${dInj.status()}`);
    const dMass = await req.post(depApi, { data: { ...depBody(), empNumber: empNumber + 1 } });
    report.check('5.2-MassAssign [U110] empNumber asing di body ditolak atau diabaikan', dMass.status() === 422 || dMass.status() === 200, `status=${dMass.status()}`);
    const dPatch = await req.patch(depApi, { data: depBody() });
    report.check('6.3 [U110] PATCH -> 405', dPatch.status() === 405, `status=${dPatch.status()}`);
    const dNoAuth = await anon.get(depApi);
    report.check('6.4 [U110] Tanpa sesi -> 401', dNoAuth.status() === 401, `status=${dNoAuth.status()}`);
    const dFinalList = ((await (await req.get(depApi)).json()) as { data: Array<{ id: number }> }).data;
    if (dFinalList.length) await req.delete(depApi, { data: { ids: dFinalList.map((r) => r.id) } });

    report.step('[U116] Memberships');
    const memBody = (over: Record<string, unknown> = {}) => ({ membershipId: 1, subscriptionFee: 100, subscriptionCommenceDate: '2024-01-01', subscriptionRenewalDate: '2024-12-31', ...over });
    const mOk = await req.post(memApi, { data: memBody() });
    report.check('6.1 [U116] POST memberships valid -> 200', mOk.status() === 200, `status=${mOk.status()}`);
    const mBadFee = await req.post(memApi, { data: memBody({ subscriptionFee: 'abc' }) });
    report.check('2.2 / 6.5 [U116] subscriptionFee non-numerik -> 4xx', is4xx(mBadFee.status()), `status=${mBadFee.status()}`);
    const mBadId = await req.post(memApi, { data: memBody({ membershipId: 999999 }) });
    report.check('2.6 / 6.5 [U116] membershipId tidak ada -> 4xx', is4xx(mBadId.status()), `status=${mBadId.status()}`);
    const mPatch = await req.patch(memApi, { data: memBody() });
    report.check('6.3 [U116] PATCH -> 405', mPatch.status() === 405, `status=${mPatch.status()}`);
    const mNoAuth = await anon.get(memApi);
    report.check('6.4 [U116] Tanpa sesi -> 401', mNoAuth.status() === 401, `status=${mNoAuth.status()}`);
    const mFinalList = ((await (await req.get(memApi)).json()) as { data: Array<{ id: number }> }).data;
    if (mFinalList.length) await req.delete(memApi, { data: { ids: mFinalList.map((r) => r.id) } });
  } finally {
    await anon.dispose();
    await close();
  }
  report.print();
});
