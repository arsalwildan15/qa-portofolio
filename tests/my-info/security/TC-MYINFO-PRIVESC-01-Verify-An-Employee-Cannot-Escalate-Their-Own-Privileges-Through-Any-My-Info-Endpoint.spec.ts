/**
 * ================================================================================
 * TC-MYINFO-PRIVESC-01 — Verify An Employee Cannot Escalate Their Own Privileges Through Any Writable My Info Endpoint
 * Modul    : My Info - Personal Details (U006), Contact Details (U108), Emergency Contacts
 *            (U109), Dependents (U110), Immigration (U111), Qualifications/Work Experience
 *            (U115), Memberships (U116)
 * Kategori : Security (S) 5.2-PrivEsc | API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-PRIVESC-01-Verify-An-Employee-Cannot-Escalate-Their-Own-Privileges-Through-Any-My-Info-Endpoint.spec.ts
 * Path     : tests/my-info/security/
 * ================================================================================
 *
 * TUJUAN (sesi ESS, body valid dasar dr TC *-01/*-02 modul ini + field privilege ekstra):
 *   5.2-PrivEsc  pada tiap endpoint tulis My Info, kirim field privilege/role yg TIDAK ADA di
 *        kontrak (userRoleId, isAdmin, roleName, permissions) bersama body valid -> server HARUS
 *        menolak (4xx) atau mengabaikannya TOTAL (field itu tidak pernah muncul di respons).
 *   Semua record uji dihapus di akhir (Personal Details/Contact Details tidak punya record
 *        utk dihapus, by design hanya field in-place).
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/security/TC-MYINFO-PRIVESC-01-Verify-An-Employee-Cannot-Escalate-Their-Own-Privileges-Through-Any-My-Info-Endpoint.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession, openMyInfoFromMenu } from '../../../src/utils/myInfo';

const is4xxOr200Ignored = (status: number, data: Record<string, unknown> | undefined, privFields: string[]) =>
  (status >= 400 && status < 500) || (status === 200 && privFields.every((f) => data?.[f] === undefined));

test('TC-MYINFO-PRIVESC-01: an employee cannot escalate their own privileges via any My Info endpoint', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-PRIVESC-01', 'Employee Cannot Escalate Privileges Via My Info', env.baseURL);
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaPrivEsc');
  const req = essPage.request;
  try {
    const empNumber = await openMyInfoFromMenu(essPage);
    const PRIV = { userRoleId: 1, isAdmin: true, roleName: 'Admin', permissions: ['admin'] };

    report.step('[U006] Personal Details');
    const pdApi = `/web/index.php/api/v2/pim/employees/${empNumber}/personal-details`;
    const pd = await req.put(pdApi, { data: { firstName: 'QaPrivEsc', lastName: 'Test', middleName: '', employeeId: `QAPE${Date.now() % 100000}`, ...PRIV } });
    const pdData = ((await pd.json().catch(() => ({}))) as { data?: Record<string, unknown> }).data;
    report.check('5.2-PrivEsc [U006] PUT personal-details + field privilege -> ditolak/diabaikan total', is4xxOr200Ignored(pd.status(), pdData, Object.keys(PRIV)), `status=${pd.status()}`);

    report.step('[U108] Contact Details');
    const contactApi = `/web/index.php/api/v2/pim/employee/${empNumber}/contact-details`;
    const c = await req.put(contactApi, { data: { street1: 'QaPrivEsc', street2: '', city: '', province: '', zipCode: '', homeTelephone: '', workTelephone: '', mobile: '', workEmail: '', otherEmail: '', ...PRIV } });
    const cData = ((await c.json().catch(() => ({}))) as { data?: Record<string, unknown> }).data;
    report.check('5.2-PrivEsc [U108] PUT contact-details + field privilege -> ditolak/diabaikan total', is4xxOr200Ignored(c.status(), cData, Object.keys(PRIV)), `status=${c.status()}`);

    const emergApi = `/web/index.php/api/v2/pim/employees/${empNumber}/emergency-contacts`;
    report.step('[U109] Emergency Contacts');
    const e = await req.post(emergApi, { data: { name: `QaPrivEsc${Date.now() % 100000}`, relationship: 'Teman', homePhone: '', officePhone: '', mobilePhone: '', ...PRIV } });
    const eData = ((await e.json().catch(() => ({}))) as { data?: Record<string, unknown> }).data;
    report.check('5.2-PrivEsc [U109] POST emergency-contacts + field privilege -> ditolak/diabaikan total', is4xxOr200Ignored(e.status(), eData, Object.keys(PRIV)), `status=${e.status()}`);
    if (e.status() === 200 && eData?.id) await req.delete(emergApi, { data: { ids: [eData.id] } }).catch(() => null);

    const depApi = `/web/index.php/api/v2/pim/employees/${empNumber}/dependents`;
    report.step('[U110] Dependents');
    const d = await req.post(depApi, { data: { name: `QaPrivEsc${Date.now() % 100000}`, relationshipType: 'child', relationship: '', dateOfBirth: '2015-01-01', ...PRIV } });
    const dData = ((await d.json().catch(() => ({}))) as { data?: Record<string, unknown> }).data;
    report.check('5.2-PrivEsc [U110] POST dependents + field privilege -> ditolak/diabaikan total', is4xxOr200Ignored(d.status(), dData, Object.keys(PRIV)), `status=${d.status()}`);
    if (d.status() === 200 && dData?.id) await req.delete(depApi, { data: { ids: [dData.id] } }).catch(() => null);

    const immApi = `/web/index.php/api/v2/pim/employees/${empNumber}/immigrations`;
    report.step('[U111] Immigration');
    const imm = await req.post(immApi, { data: { number: `QaPrivEsc${Date.now() % 100000}`, issuedDate: '2024-01-10', expiryDate: '2030-01-10', type: 1, status: '', reviewDate: '', comment: '', ...PRIV } });
    const immData = ((await imm.json().catch(() => ({}))) as { data?: Record<string, unknown> }).data;
    report.check('5.2-PrivEsc [U111] POST immigrations + field privilege -> ditolak/diabaikan total', is4xxOr200Ignored(imm.status(), immData, Object.keys(PRIV)), `status=${imm.status()}`);
    if (imm.status() === 200 && immData?.id) await req.delete(immApi, { data: { ids: [immData.id] } }).catch(() => null);

    const workApi = `/web/index.php/api/v2/pim/employees/${empNumber}/work-experiences`;
    report.step('[U115] Qualifications - Work Experience');
    const work = await req.post(workApi, { data: { company: 'QaPrivEscCo', jobTitle: 'QaPrivEscTitle', fromDate: '2020-01-01', toDate: '2021-01-01', comment: '', ...PRIV } });
    const workData = ((await work.json().catch(() => ({}))) as { data?: Record<string, unknown> }).data;
    report.check('5.2-PrivEsc [U115] POST work-experiences + field privilege -> ditolak/diabaikan total', is4xxOr200Ignored(work.status(), workData, Object.keys(PRIV)), `status=${work.status()}`);
    if (work.status() === 200 && workData?.id) await req.delete(workApi, { data: { ids: [workData.id] } }).catch(() => null);

    const memApi = `/web/index.php/api/v2/pim/employees/${empNumber}/memberships`;
    report.step('[U116] Memberships');
    const mem = await req.post(memApi, { data: { membershipId: 1, subscriptionFee: 100, subscriptionCommenceDate: '2024-01-01', subscriptionRenewalDate: '2024-12-31', ...PRIV } });
    const memData = ((await mem.json().catch(() => ({}))) as { data?: Record<string, unknown> }).data;
    report.check('5.2-PrivEsc [U116] POST memberships + field privilege -> ditolak/diabaikan total', is4xxOr200Ignored(mem.status(), memData, Object.keys(PRIV)), `status=${mem.status()}`);
    if (mem.status() === 200 && memData?.id) await req.delete(memApi, { data: { ids: [memData.id] } }).catch(() => null);
  } finally {
    await close();
  }
  report.print();
});
