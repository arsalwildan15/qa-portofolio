/**
 * ================================================================================
 * TC-RECRUITMENT-API-01 — Verify The Candidate And Vacancy APIs: Contract, Paging, Wrong Method, No Session, Unknown Records, Sensitive Data And ESS Access
 * Modul    : Recruitment (U005 Candidates, U065 Vacancies, U100 Candidate Detail, U101 Vacancy Detail & Attachments)
 * Kategori : Negative (-) 2.6 | Boundary (B) 3.5 3.6 | Edge (!) 4.6 | Security (S) 5.2-BFLAC 5.8 |
 *            API (A) 6.1 6.2 6.3 6.4 6.5 6.6 6.7
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-API-01-Verify-Candidate-And-Vacancy-API-Contract-Methods-Session-Unknown-Ids-And-ESS-Access.spec.ts
 * Path     : tests/recruitment/security/
 * ================================================================================
 *
 * TUJUAN (endpoint direkam LIVE dari UI 17 Nov 2026; lowongan & kandidat uji dibuat lewat API & dihapus):
 *   6.1 / 6.2  GET tiap endpoint (Admin) -> 200; list -> data[] + meta.total; objek -> field kunci.
 *   5.8   tanpa field sensitif.  6.6 limit=-1 -> 422.  3.6 limit=1 -> maks 1 baris.
 *   3.5 / 4.6  offset=9999 -> data [].  6.3 PATCH -> 405.  6.4 tanpa sesi -> 401.
 *   6.5   daftar lampiran lowongan TIDAK berpaging: limit/offset ditolak 422 (parameter tak dikenal).
 *   2.6   id 999999 pada GET/PUT kandidat, lowongan, resume kandidat -> 4xx (bukan 2xx/5xx).
 *   6.7   DELETE lampiran/kandidat/lowongan yg sama 2x -> 200 lalu 404.
 *   5.2-BFLAC  sesi ESS: GET & mutasi semua endpoint Recruitment + unduh resume -> 403.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-444 (Low) -- PUT recruitment/candidate/999999/attachment (unggah resume
 *   utk kandidat yg tidak ada) -> 500 "Unexpected Error Occurred" (endpoint lain menjawab 404).
 *   Finding: GET candidates/999999/history -> 200 data [] (bukan 404).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/security/TC-RECRUITMENT-API-01-Verify-Candidate-And-Vacancy-API-Contract-Methods-Session-Unknown-Ids-And-ESS-Access.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession } from '../../../src/utils/myInfo';
import { createVacancyWithCandidate } from '../../../src/utils/maintenanceData';
import { API, addVacancyAttachment, candidateBody, cleanupRecruitment, filePayload, vacancyBody } from '../../../src/utils/recruitmentData';

const SENSITIVE = /"(password|passwordHash|hash|secret|token|salt)"\s*:/i;
const is4xx = (n: number) => n >= 400 && n < 500;

test('TC-RECRUITMENT-API-01: candidate & vacancy API contract, methods, session, unknown ids, ESS', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-RECRUITMENT-API-01', 'Candidate And Vacancy API Contract Methods Session ESS', env.baseURL);
  const v = await createVacancyWithCandidate(page.request, 'QaRecApi');
  const cid = v.candidateId!;
  const attId = await addVacancyAttachment(page.request, v.vacancyId);
  await page.request.put(`${API}recruitment/candidate/${cid}/attachment`, { data: { currentAttachment: 'replaceCurrent', attachment: filePayload('cv.pdf', 'application/pdf', '%PDF-1.4\n') } });
  const anon = await request.newContext({ baseURL: env.baseURL });
  const EPS: Array<{ unit: string; path: string; list: boolean; paged?: boolean; keys?: string[] }> = [
    { unit: 'U005', path: 'recruitment/candidates', list: true },
    { unit: 'U065', path: 'recruitment/vacancies', list: true },
    { unit: 'U100', path: `recruitment/candidates/${cid}`, list: false, keys: ['id', 'firstName', 'lastName', 'email', 'vacancy'] },
    { unit: 'U100', path: `recruitment/candidates/${cid}/history`, list: true },
    { unit: 'U100', path: `recruitment/candidate/${cid}/attachment`, list: false, keys: ['id', 'candidateId', 'attachment'] },
    { unit: 'U101', path: `recruitment/vacancies/${v.vacancyId}`, list: false, keys: ['id', 'name', 'numOfPositions', 'jobTitle', 'hiringManager'] },
    { unit: 'U101', path: `recruitment/vacancies/${v.vacancyId}/attachments`, list: true, paged: false },
  ];
  try {
    for (const e of EPS) {
      const tag = `[${e.unit} ${e.path.replace(/\d+/g, '<id>')}]`;
      const url = `${API}${e.path}`;
      report.step(tag);
      const r = await page.request.get(url);
      const text = await r.text();
      const body = JSON.parse(text || '{}') as { data?: unknown; meta?: { total?: unknown } };
      report.check(`${tag} 6.1 GET (Admin) -> 200`, r.status() === 200, `status=${r.status()}`);
      const ok = e.list ? Array.isArray(body.data) && typeof body.meta?.total === 'number' : !!body.data && (e.keys ?? []).every((k) => k in (body.data as object));
      report.check(`${tag} 6.2 Kontrak ${e.list ? 'data[] + meta.total' : (e.keys ?? []).join('/')}`, ok, text.slice(0, 120));
      report.check(`${tag} 5.8 Tanpa field sensitif`, !SENSITIVE.test(text), SENSITIVE.exec(text)?.[0] ?? 'tidak ada');
      if (e.list && e.paged === false) {
        const strict = await page.request.get(`${url}?limit=1&offset=0`);
        report.check(`${tag} 6.5 Daftar tanpa paging: parameter limit/offset tak dikenal -> 422`, strict.status() === 422, `status=${strict.status()}`);
      } else if (e.list) {
        const bad = await page.request.get(`${url}?limit=-1`);
        report.check(`${tag} 6.6 limit=-1 -> 422`, bad.status() === 422, `status=${bad.status()}`);
        const one = ((await (await page.request.get(`${url}?limit=1&offset=0`)).json()) as { data?: unknown[] }).data;
        report.check(`${tag} 3.6 limit=1 -> maks 1 baris`, Array.isArray(one) && one.length <= 1, `baris=${one?.length}`);
        const far = await page.request.get(`${url}?limit=10&offset=9999`);
        const farData = ((await far.json().catch(() => null)) as { data?: unknown[] } | null)?.data;
        report.check(`${tag} 3.5 / 4.6 offset=9999 -> 200 & data []`, far.status() === 200 && Array.isArray(farData) && farData.length === 0, `status=${far.status()}`);
      }
      const patch = await page.request.patch(url, { data: {} });
      report.check(`${tag} 6.3 PATCH -> 405`, patch.status() === 405, `status=${patch.status()}`);
      const noAuth = await anon.get(url);
      report.check(`${tag} 6.4 Tanpa sesi -> 401`, noAuth.status() === 401, `status=${noAuth.status()}`);
    }

    report.step('Record yang tidak ada (id 999999)');
    const vb = await vacancyBody(page.request, v.vacancyId);
    const ghosts: Array<[string, () => Promise<number>]> = [
      ['[U100] GET kandidat', async () => (await page.request.get(`${API}recruitment/candidates/999999`)).status()],
      ['[U100] PUT kandidat', async () => (await page.request.put(`${API}recruitment/candidates/999999`, { data: candidateBody(v.vacancyId) })).status()],
      ['[U100] GET aksi yg diizinkan', async () => (await page.request.get(`${API}recruitment/candidates/999999/actions/allowed`)).status()],
      ['[U100] PUT resume kandidat', async () => (await page.request.put(`${API}recruitment/candidate/999999/attachment`, { data: { currentAttachment: 'replaceCurrent', attachment: filePayload('a.pdf', 'application/pdf', '%PDF') } })).status()],
      ['[U101] GET lowongan', async () => (await page.request.get(`${API}recruitment/vacancies/999999`)).status()],
      ['[U101] PUT lowongan', async () => (await page.request.put(`${API}recruitment/vacancies/999999`, { data: vb })).status()],
      ['[U101] POST lampiran ke lowongan 999999', async () => (await page.request.post(`${API}recruitment/vacancy/attachments`, { data: { vacancyId: 999999, attachment: filePayload('a.pdf', 'application/pdf', '%PDF'), comment: '', attachmentType: 1 } })).status()],
    ];
    for (const [label, fn] of ghosts) {
      const st = await fn();
      report.check(`2.6 ${label} id 999999 -> 4xx (bukan 2xx/5xx)`, is4xx(st), `status=${st}`);
    }
    const hist = await page.request.get(`${API}recruitment/candidates/999999/history`);
    report.finding('2.6 [U100] History kandidat 999999', `status=${hist.status()} ${(await hist.text()).slice(0, 80)} (endpoint lain menjawab 404)`);

    report.step('ESS: tidak boleh membaca/mengubah Recruitment');
    const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaRecApiEss');
    try {
      const essCalls: Array<[string, () => Promise<number>]> = [
        ['[U005] GET daftar kandidat', async () => (await essPage.request.get(`${API}recruitment/candidates?limit=1`)).status()],
        ['[U100] GET detail kandidat', async () => (await essPage.request.get(`${API}recruitment/candidates/${cid}`)).status()],
        ['[U100] PUT kandidat', async () => (await essPage.request.put(`${API}recruitment/candidates/${cid}`, { data: candidateBody(v.vacancyId, { firstName: 'EssHack' }) })).status()],
        ['[U100] PUT resume kandidat', async () => (await essPage.request.put(`${API}recruitment/candidate/${cid}/attachment`, { data: { currentAttachment: 'replaceCurrent', attachment: filePayload('e.pdf', 'application/pdf', '%PDF') } })).status()],
        ['[U100] unduh resume', async () => (await essPage.request.get(`/web/index.php/recruitment/viewCandidateAttachment/candidateId/${cid}`, { maxRedirects: 0 })).status()],
        ['[U065] GET daftar lowongan (penuh)', async () => (await essPage.request.get(`${API}recruitment/vacancies?limit=1`)).status()],
        ['[U101] PUT lowongan', async () => (await essPage.request.put(`${API}recruitment/vacancies/${v.vacancyId}`, { data: { ...vb, name: 'EssHack' } })).status()],
        ['[U101] POST lampiran lowongan', async () => (await essPage.request.post(`${API}recruitment/vacancy/attachments`, { data: { vacancyId: v.vacancyId, attachment: filePayload('e.pdf', 'application/pdf', '%PDF'), comment: '', attachmentType: 1 } })).status()],
        ['[U101] DELETE lampiran lowongan', async () => (await essPage.request.delete(`${API}recruitment/vacancy/attachments`, { data: { ids: [attId] } })).status()],
      ];
      for (const [label, fn] of essCalls) {
        const st = await fn();
        report.check(`5.2-BFLAC ESS ${label} -> 403`, st === 403, `status=${st}`);
      }
    } finally {
      await close();
    }
    const cNow = ((await (await page.request.get(`${API}recruitment/candidates/${cid}`)).json()) as { data: { firstName: string } }).data.firstName;
    const attNow = ((await (await page.request.get(`${API}recruitment/vacancies/${v.vacancyId}/attachments`)).json()) as { meta: { total: number } }).meta.total;
    report.check('5.2-BFLAC Data tidak berubah oleh ESS (nama kandidat & lampiran lowongan)', cNow !== 'EssHack' && attNow === 1, `firstName=${cNow}, lampiran=${attNow}`);

    report.step('6.7 DELETE yang sama dua kali');
    for (const [label, ep, id] of [['[U101] lampiran', 'recruitment/vacancy/attachments', attId], ['[U100] kandidat', 'recruitment/candidates', cid], ['[U065] lowongan', 'recruitment/vacancies', v.vacancyId]] as const) {
      const a = await page.request.delete(`${API}${ep}`, { data: { ids: [id] } });
      const b = await page.request.delete(`${API}${ep}`, { data: { ids: [id] } });
      report.check(`6.7 DELETE ${label} 2x -> 200 lalu 404`, a.status() === 200 && b.status() === 404, `${a.status()} -> ${b.status()}`);
    }
  } finally {
    await anon.dispose();
    await cleanupRecruitment(page.request, [cid], [v.vacancyId]);
  }
  report.print();
});
