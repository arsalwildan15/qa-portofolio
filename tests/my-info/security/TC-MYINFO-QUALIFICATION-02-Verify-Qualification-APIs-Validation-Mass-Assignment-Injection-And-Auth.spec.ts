/**
 * ================================================================================
 * TC-MYINFO-QUALIFICATION-02 — Verify The Five Qualification APIs Of An Employee's Own Record: Contract, Server-Side Validation, Duplicates, Mass Assignment, Injection, Wrong Method And No Session
 * Modul    : My Info - Qualifications (ESS, U115)
 * Kategori : Negative (-) 2.1 2.6 | Boundary (B) 3.1 3.2 3.4 | Security (S) 5.1-SQLi 5.2-MassAssign |
 *            API (A) 6.1 6.2 6.3 6.4 6.5 6.7
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-QUALIFICATION-02-Verify-Qualification-APIs-Validation-Mass-Assignment-Injection-And-Auth.spec.ts
 * Path     : tests/my-info/security/
 * ================================================================================
 *
 * TUJUAN (sesi ESS, pim/employees/<self>/{work-experiences, educations, skills, languages, licenses};
 * body valid direkam LIVE 16 Nov 2026; id master Education/Skill/Language/License dibaca sesi Admin):
 *   6.1 / 6.2  POST valid tiap endpoint -> 200 & data memuat field yg dikirim.
 *   3.4  Rentang tanggal terbalik -> 4xx: Work Experience toDate<fromDate, Education endDate<startDate,
 *        License expiryDate<issuedDate.
 *   3.1  company 101 karakter -> 4xx.   3.2  yearsOfExperience 100 & 150 -> 4xx (form: < 100).
 *   2.1 / 6.5  company null -> 4xx; skillId/licenseId/educationId 999999 & fluencyId 99 -> 4xx.
 *   6.7  Skill yg sama dikirim 2x -> tetap 1 baris (server melakukan upsert; dicatat finding).
 *   5.1-SQLi  company "' OR '1'='1" -> tersimpan identik.
 *   5.2-MassAssign  empNumber karyawan lain di body -> diabaikan (record milik sendiri).
 *   2.6  PUT work-experiences/999999 -> 4xx.  6.3 PATCH -> 405.  6.4 tanpa sesi -> 401 (5 endpoint).
 *   Record berada di karyawan uji sekali-pakai (akun ESS baru).
 *
 * HASIL 16 Nov 2026: 22/26 lolos. SENGAJA FAILED (R3), BUG BG-434: id yg tidak ada -> 500 "Unexpected
 *   Error Occurred" di POST skills (skillId), POST licenses (licenseId), POST educations (educationId)
 *   & PUT work-experiences/999999 (PUT educations/999999 & PUT dependents/999999 menjawab 422 dgn
 *   benar). Lolos: semua rentang tanggal terbalik 422, panjang/angka/null 422, skill duplikat tetap
 *   1 baris (upsert), SQLi literal, empNumber diabaikan, 405, 401.
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/security/TC-MYINFO-QUALIFICATION-02-Verify-Qualification-APIs-Validation-Mass-Assignment-Injection-And-Auth.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession, openMyInfoFromMenu } from '../../../src/utils/myInfo';

const is4xx = (n: number) => n >= 400 && n < 500;
const SEGMENTS = ['work-experiences', 'educations', 'skills', 'languages', 'licenses'] as const;

test('TC-MYINFO-QUALIFICATION-02: qualification APIs validation, duplicates, mass assignment, injection and auth', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-QUALIFICATION-02', 'Qualification APIs Validation Mass Assignment Injection Auth', env.baseURL);
  const firstId = async (ep: string) => ((await (await page.request.get(`/web/index.php/api/v2/${ep}?limit=1`)).json()) as { data?: Array<{ id: number }> }).data?.[0]?.id;
  const ids = { edu: await firstId('admin/educations'), skill: await firstId('admin/skills'), lang: await firstId('admin/languages'), lic: await firstId('admin/licenses') };
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaQualApi');
  const anon = await request.newContext({ baseURL: env.baseURL });
  try {
    const empNumber = await openMyInfoFromMenu(essPage);
    const base = `/web/index.php/api/v2/pim/employees/${empNumber}/`;
    const req = essPage.request;
    const post = (seg: string, data: Record<string, unknown>) => req.post(base + seg, { data });
    const dataOf = async (r: Awaited<ReturnType<typeof post>>) => ((await r.json().catch(() => null)) as { data?: Record<string, unknown>; meta?: { empNumber?: number } } | null);

    report.step('Kontrak create tiap endpoint');
    const valid: Record<(typeof SEGMENTS)[number], Record<string, unknown>> = {
      'work-experiences': { company: 'QaCoApi', jobTitle: 'QaT', fromDate: '2020-01-01', toDate: '2021-01-01', comment: '' },
      educations: { educationId: ids.edu, institute: 'QaInst', major: 'QaMaj', year: 2015, score: '3.5', startDate: '2011-01-01', endDate: '2015-01-01' },
      skills: { skillId: ids.skill, yearsOfExperience: 5, comments: '' },
      languages: { languageId: ids.lang, fluencyId: 1, competencyId: 1, comment: '' },
      licenses: { licenseId: ids.lic, licenseNo: 'QaLic1', issuedDate: '2020-01-01', expiryDate: '2024-01-01' },
    };
    const expectField: Record<(typeof SEGMENTS)[number], (d: Record<string, unknown> | undefined) => boolean> = {
      'work-experiences': (d) => d?.['company'] === 'QaCoApi' && d?.['toDate'] === '2021-01-01',
      educations: (d) => d?.['institute'] === 'QaInst' && (d?.['education'] as { id?: number })?.id === ids.edu,
      skills: (d) => d?.['yearsOfExperience'] === 5 && (d?.['skill'] as { id?: number })?.id === ids.skill,
      languages: (d) => (d?.['language'] as { id?: number })?.id === ids.lang,
      licenses: (d) => d?.['licenseNo'] === 'QaLic1' && (d?.['license'] as { id?: number })?.id === ids.lic,
    };
    for (const seg of SEGMENTS) {
      const r = await post(seg, valid[seg]);
      const body = await dataOf(r);
      report.check(`[${seg}] 6.1 / 6.2 POST valid -> 200 & data memuat field yg dikirim`, r.status() === 200 && expectField[seg](body?.data), `status=${r.status()} ${JSON.stringify(body?.data ?? '').slice(0, 120)}`);
    }

    report.step('Validasi sisi server');
    const checks: Array<[string, string, Record<string, unknown>]> = [
      ['3.4 Work Experience toDate sebelum fromDate', 'work-experiences', { company: 'QaRev', jobTitle: 'T', fromDate: '2022-01-01', toDate: '2020-01-01' }],
      ['3.4 Education endDate sebelum startDate', 'educations', { educationId: ids.edu, startDate: '2015-01-01', endDate: '2011-01-01' }],
      ['3.4 License expiryDate sebelum issuedDate', 'licenses', { licenseId: ids.lic, licenseNo: 'QaRev', issuedDate: '2024-01-01', expiryDate: '2020-01-01' }],
      ['3.1 company 101 karakter', 'work-experiences', { company: 'C'.repeat(101), jobTitle: 'T' }],
      ['2.1 / 6.5 company null', 'work-experiences', { company: null, jobTitle: 'T' }],
      ['3.2 yearsOfExperience 100 (form: harus < 100)', 'skills', { skillId: ids.skill, yearsOfExperience: 100, comments: '' }],
      ['3.2 yearsOfExperience 150', 'skills', { skillId: ids.skill, yearsOfExperience: 150, comments: '' }],
      ['2.1 / 6.5 skillId 999999 (tidak ada)', 'skills', { skillId: 999999, yearsOfExperience: 1, comments: '' }],
      ['2.1 / 6.5 fluencyId 99 (tidak ada)', 'languages', { languageId: ids.lang, fluencyId: 99, competencyId: 1, comment: '' }],
      ['2.1 / 6.5 licenseId 999999 (tidak ada)', 'licenses', { licenseId: 999999, licenseNo: 'QaX' }],
      ['2.1 / 6.5 educationId 999999 (tidak ada)', 'educations', { educationId: 999999 }],
    ];
    for (const [label, seg, data] of checks) {
      const r = await post(seg, data);
      report.check(`[${seg}] 2.1 / 3.1 / 3.2 / 3.4 / 6.5 validasi server: ${label} -> 4xx`, is4xx(r.status()), `status=${r.status()} ${(await r.text()).slice(0, 100)}`);
    }

    report.step('Duplikat, injeksi, mass assignment');
    // Live 2026-11-16: posting a skill the employee already has is an UPSERT (200, still one row, values
    // replaced) and the form hides already-added skills -- no duplicate row is the requirement.
    const dup = await post('skills', { ...valid.skills, yearsOfExperience: 7 });
    const skillRows = ((await (await req.get(base + 'skills')).json()) as { data: Array<{ skill: { id: number }; yearsOfExperience: number }> }).data.filter((r) => r.skill.id === ids.skill);
    report.check('[skills] 6.7 Skill yg sama dikirim lagi -> tidak membuat baris kedua', dup.status() < 500 && skillRows.length === 1, `status=${dup.status()}, baris=${skillRows.length}`);
    report.finding('[skills] 6.7 POST skill yg sudah ada', `status=${dup.status()} -> nilai lama ditimpa (yearsOfExperience=${skillRows[0]?.yearsOfExperience}); upsert tanpa peringatan`);
    const sqli = `QaCo' OR '1'='1`;
    const sq = await post('work-experiences', { company: sqli, jobTitle: 'T' });
    report.check('[work-experiences] 5.1-SQLi company tersimpan identik sbg teks', sq.status() === 200 && (await dataOf(sq))?.data?.['company'] === sqli, `status=${sq.status()}`);
    const ma = await post('work-experiences', { company: 'QaMA', jobTitle: 'T', empNumber: 1 });
    const maBody = await dataOf(ma);
    report.check('[work-experiences] 5.2-MassAssign empNumber karyawan lain diabaikan (record milik sendiri)', ma.status() === 200 && maBody?.meta?.empNumber === empNumber, `status=${ma.status()}, meta.empNumber=${maBody?.meta?.empNumber} (sendiri=${empNumber})`);

    report.step('Method, id tak eksis, sesi');
    const put404 = await req.put(`${base}work-experiences/999999`, { data: valid['work-experiences'] });
    report.check('[work-experiences] 2.6 PUT id 999999 -> 4xx', is4xx(put404.status()), `status=${put404.status()}`);
    for (const seg of SEGMENTS) {
      const [patch, noAuth] = await Promise.all([req.patch(base + seg, { data: {} }), anon.get(base + seg)]);
      report.check(`[${seg}] 6.3 PATCH -> 405 & 6.4 tanpa sesi -> 401`, patch.status() === 405 && noAuth.status() === 401, `PATCH=${patch.status()}, tanpaSesi=${noAuth.status()}`);
    }
  } finally {
    await anon.dispose();
    await close();
  }
  report.print();
});
