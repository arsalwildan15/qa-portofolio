/**
 * ================================================================================
 * TC-RECRUITMENT-MUT-01 — Verify Creating And Updating Candidates, Vacancies And Vacancy Attachments Through The API: Optional Fields, Server Validation, Unicode, Injection, Mass Assignment, Relations And Repeats
 * Modul    : Recruitment (U005 Candidates, U065 Vacancies, U100 Candidate Detail, U101 Vacancy Detail & Attachments)
 * Kategori : Positive (+) 1.1-C 1.1-U 1.1-D 1.2 1.4 | Negative (-) 2.2 | Boundary (B) 3.1 3.2 3.4 |
 *            Edge (!) 4.1 4.8 | Security (S) 5.1-SQLi 5.1-XSS-Stored 5.1-CmdPath 5.2-MassAssign |
 *            API (A) 6.5 6.7
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-MUT-01-Verify-Candidate-And-Vacancy-Create-Update-Validation-Injection-And-Mass-Assignment.spec.ts
 * Path     : tests/recruitment/security/
 * ================================================================================
 *
 * TUJUAN (aturan server dibaca LIVE 17 Nov 2026; data uji dibuat & dihapus sendiri):
 *   1.1-C / 1.2  POST kandidat hanya field wajib & dgn semua field opsional -> 200.
 *   1.1-U  PUT kandidat / lowongan / komentar lampiran -> 200 & tersimpan.
 *   2.2 / 6.5  email bukan email, contactNumber huruf, firstName null, vacancyId 999999,
 *          jobTitleId/employeeId 999999, numOfPositions "abc"/1.5 -> 422 (+ invalidParamKeys).
 *   3.1    firstName 30 OK / 31 422; keywords & comment 250 OK / 251 422.
 *   3.2    numOfPositions 99 OK.     3.4 dateOfApplication 2026-02-30 & "kemarin" -> 422.
 *   4.1    teks Arab/CJK/aksen -> tersimpan identik (emoji diuji di CANDIDATE-22).
 *   5.1-SQLi / 5.1-XSS-Stored / 5.1-CmdPath  payload -> tersimpan apa adanya sebagai teks
 *          (render aman dibuktikan di CANDIDATE-22 / VACANCY-20).
 *   5.2-MassAssign  POST/PUT kandidat dgn id/status/statusId/addedPerson & PUT lowongan dgn
 *          definedTime -> 422, record tidak berubah.
 *   1.4    kandidat dipindah ke lowongan lain -> GET menampilkan lowongan baru; lowongan dihapus ->
 *          kandidat tetap ada (data pelamar tidak ikut hilang).
 *   6.7    PUT identik 2x -> hasil sama.
 *   4.8    dateOfApplication di masa depan (2099) diterima -> dicatat (finding).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/security/TC-RECRUITMENT-MUT-01-Verify-Candidate-And-Vacancy-Create-Update-Validation-Injection-And-Mass-Assignment.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createVacancyWithCandidate } from '../../../src/utils/maintenanceData';
import { API, addVacancyAttachment, candidateBody, cleanupRecruitment, getJson, vacancyBody } from '../../../src/utils/recruitmentData';

type Cand = { id: number; firstName: string; lastName: string; email: string; keywords: string | null; comment: string | null; vacancy: { id: number | null; name?: string | null } | null };
const keysOf = async (r: { json(): Promise<unknown> }) => (((await r.json().catch(() => null)) as { error?: { data?: { invalidParamKeys?: string[] } } } | null)?.error?.data?.invalidParamKeys ?? []).join(',');

test('TC-RECRUITMENT-MUT-01: candidate & vacancy create/update, validation, injection, mass assignment', async ({ page }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-RECRUITMENT-MUT-01', 'Candidate Vacancy Create Update Validation Injection Mass Assignment', env.baseURL);
  const v = await createVacancyWithCandidate(page.request, 'QaRecMut', false);
  const v2 = await createVacancyWithCandidate(page.request, 'QaRecMut2', false);
  const made: number[] = [];
  const post = async (over: Record<string, unknown>) => {
    const r = await page.request.post(`${API}recruitment/candidates`, { data: candidateBody(v.vacancyId, over) });
    const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;
    if (id) made.push(id);
    return { r, id };
  };
  try {
    report.step('[U005] Create');
    const min = await post({ email: `qa.min${Date.now() % 1e6}@example.com` });
    report.check('1.1-C / 1.2 [U005] POST kandidat hanya field wajib -> 200 + id', min.r.status() === 200 && !!min.id, `status=${min.r.status()}`);
    const full = await post({ middleName: 'Opt', contactNumber: '+62 (21) 555-1234', keywords: 'qa,java', comment: 'semua opsional terisi', consentToKeepData: true });
    report.check('1.1-C / 1.2 [U005] POST kandidat dgn semua field opsional -> 200 + id', full.r.status() === 200 && !!full.id, `status=${full.r.status()}`);
    const massPost = await page.request.post(`${API}recruitment/candidates`, { data: candidateBody(v.vacancyId, { id: 1, status: 'HIRED' }) });
    report.check('5.2-MassAssign [U005] POST kandidat dgn id & status -> 422', massPost.status() === 422, `status=${massPost.status()} keys=${await keysOf(massPost)}`);
    const cid = min.id!;
    const C = `${API}recruitment/candidates/${cid}`;
    const put = (over: Record<string, unknown>) => page.request.put(C, { data: candidateBody(v.vacancyId, over) });
    const get = () => getJson<Cand>(page.request, `recruitment/candidates/${cid}`);

    report.step('[U100] Update & validasi server');
    const up = await put({ lastName: 'Updated', keywords: 'kw1' });
    report.check('1.1-U [U100] PUT kandidat -> 200 & tersimpan', up.status() === 200 && (await get()).lastName === 'Updated', `status=${up.status()}`);
    const neg: Array<[string, Record<string, unknown>, string]> = [
      ['2.2 / 6.5 email "not-an-email"', { email: 'not-an-email' }, 'email'],
      ['2.2 / 6.5 contactNumber "abc"', { contactNumber: 'abc' }, 'contactNumber'],
      ['6.5 firstName null', { firstName: null }, 'firstName'],
      ['6.5 vacancyId 999999', { vacancyId: 999999 }, 'vacancyId'],
      ['3.1 firstName 31 karakter', { firstName: 'a'.repeat(31) }, 'firstName'],
      ['3.1 keywords 251 karakter', { keywords: 'k'.repeat(251) }, 'keywords'],
      ['3.1 comment 251 karakter', { comment: 'c'.repeat(251) }, 'comment'],
      ['3.4 dateOfApplication 2026-02-30', { dateOfApplication: '2026-02-30' }, 'dateOfApplication'],
      ['3.4 / 6.5 dateOfApplication "kemarin"', { dateOfApplication: 'kemarin' }, 'dateOfApplication'],
    ];
    for (const [label, body, key] of neg) {
      const r = await put(body);
      const k = await keysOf(r);
      report.check(`${label} [U100] -> 422 dgn invalidParamKeys "${key}"`, r.status() === 422 && k.includes(key), `status=${r.status()} keys=${k}`);
    }
    for (const [label, body] of [['3.1 firstName 30 karakter', { firstName: 'a'.repeat(30) }], ['3.1 keywords 250 karakter', { keywords: 'k'.repeat(250) }], ['3.1 comment 250 karakter', { comment: 'c'.repeat(250) }]] as const) {
      const r = await put(body);
      report.check(`${label} [U100] (batas) -> 200`, r.status() === 200, `status=${r.status()}`);
    }
    const future = await put({ dateOfApplication: '2099-01-01' });
    report.finding('4.8 [U100] dateOfApplication di masa depan (2099-01-01)', `status=${future.status()} -- server tidak membatasi tanggal lamaran di masa depan`);

    report.step('[U100] Unicode & payload injeksi tersimpan sebagai teks');
    const texts: Array<[string, Record<string, string>]> = [
      ['4.1 Arab/CJK/aksen', { firstName: 'مرحبا 你好 Zoë', comment: 'Ñandú – café' }],
      ['5.1-SQLi', { firstName: "O'Brien", comment: "' OR '1'='1' --" }],
      ['5.1-XSS-Stored', { firstName: '<img src=x onerror=alert(1)>', comment: '<script>alert(1)</script>' }],
      ['5.1-CmdPath', { firstName: 'QaCmd', keywords: '; cat /etc/passwd', comment: '$(whoami) ../../etc/passwd' }],
    ];
    for (const [label, body] of texts) {
      const r = await put(body);
      const now = await get();
      const same = Object.entries(body).every(([k, val]) => (now as unknown as Record<string, unknown>)[k] === val);
      report.check(`${label} [U100] -> 200 & tersimpan identik sebagai teks`, r.status() === 200 && same, `status=${r.status()} ${JSON.stringify(body).slice(0, 80)}`);
    }

    report.step('[U100] Mass assignment & idempotensi');
    const before = await get();
    const mass = await put({ status: 'HIRED', statusId: 7, addedPerson: 1, modeOfApplication: 2 });
    const after = await get();
    report.check('5.2-MassAssign [U100] PUT dgn status/statusId/addedPerson/modeOfApplication -> 422 & record tidak berubah', mass.status() === 422 && JSON.stringify(after) === JSON.stringify(before), `status=${mass.status()} keys=${await keysOf(mass)}`);
    const h1 = await put({ firstName: 'QaIdem', keywords: 'idem' });
    const s1 = JSON.stringify(await get());
    const h2 = await put({ firstName: 'QaIdem', keywords: 'idem' });
    report.check('6.7 [U100] PUT identik 2x -> 200, 200 & hasil sama', h1.status() === 200 && h2.status() === 200 && JSON.stringify(await get()) === s1);

    report.step('1.4 Relasi kandidat <-> lowongan');
    await put({ vacancyId: v2.vacancyId });
    report.check('1.4 [U100] Kandidat dipindah ke lowongan lain -> GET menampilkan lowongan baru', (await get()).vacancy?.id === v2.vacancyId, JSON.stringify((await get()).vacancy));

    report.step('[U065/U101] Vacancy');
    const V = `${API}recruitment/vacancies/${v.vacancyId}`;
    const vput = async (over: Record<string, unknown>) => page.request.put(V, { data: await vacancyBody(page.request, v.vacancyId, over) });
    const vu = await vput({ description: 'Deskripsi baru', numOfPositions: 99 });
    const vd = await getJson<{ description: string; numOfPositions: number }>(page.request, `recruitment/vacancies/${v.vacancyId}`);
    report.check('1.1-U / 3.2 [U101] PUT lowongan (description, numOfPositions 99) -> 200 & tersimpan', vu.status() === 200 && vd.description === 'Deskripsi baru' && vd.numOfPositions === 99, `status=${vu.status()}`);
    for (const [label, body, key] of [
      ['3.2 / 6.5 numOfPositions "abc"', { numOfPositions: 'abc' }, 'numOfPositions'],
      ['3.2 / 6.5 numOfPositions 1.5', { numOfPositions: 1.5 }, 'numOfPositions'],
      ['6.5 name null', { name: null }, 'name'],
      ['6.5 jobTitleId 999999', { jobTitleId: 999999 }, 'jobTitleId'],
      ['6.5 employeeId (hiring manager) 999999', { employeeId: 999999 }, 'employeeId'],
      ['5.2-MassAssign definedTime/updatedTime', { definedTime: '2000-01-01', updatedTime: '2000-01-01' }, 'definedTime'],
    ] as const) {
      const r = await vput(body as Record<string, unknown>);
      const k = await keysOf(r);
      report.check(`${label} [U101] -> 422 dgn invalidParamKeys "${key}"`, r.status() === 422 && k.includes(key), `status=${r.status()} keys=${k}`);
    }
    const uni = `QaRecMut مرحبا 你好 ${Date.now() % 1e5}`;
    const vuni = await vput({ name: uni });
    report.check('4.1 [U065] Nama lowongan Arab/CJK -> 200 & tersimpan identik', vuni.status() === 200 && (await getJson<{ name: string }>(page.request, `recruitment/vacancies/${v.vacancyId}`)).name === uni, `status=${vuni.status()}`);
    const sqlName = `QaRecMut ' OR '1'='1 ${Date.now() % 1e5}`;
    const vsql = await vput({ name: sqlName });
    report.check('5.1-SQLi [U065] Nama lowongan dgn kutip SQL -> 200 & tersimpan identik', vsql.status() === 200 && (await getJson<{ name: string }>(page.request, `recruitment/vacancies/${v.vacancyId}`)).name === sqlName, `status=${vsql.status()}`);

    report.step('[U101] Lampiran lowongan: create, update, delete');
    const aid = await addVacancyAttachment(page.request, v.vacancyId, 'qa-mut.pdf', 'awal');
    report.check('1.1-C [U101] POST lampiran -> id', typeof aid === 'number', `id=${aid}`);
    const au = await page.request.put(`${API}recruitment/vacancies/${v.vacancyId}/attachments/${aid}`, { data: { vacancyId: v.vacancyId, currentAttachment: 'keepCurrent', comment: 'diubah', attachmentType: 1 } });
    const list = await getJson<Array<{ id: number; comment: string }>>(page.request, `recruitment/vacancies/${v.vacancyId}/attachments`);
    report.check('1.1-U [U101] PUT komentar lampiran -> 200 & tersimpan', au.status() === 200 && list.find((x) => x.id === aid)?.comment === 'diubah', `status=${au.status()}`);
    const ad = await page.request.delete(`${API}recruitment/vacancy/attachments`, { data: { ids: [aid] } });
    const after2 = await getJson<Array<{ id: number }>>(page.request, `recruitment/vacancies/${v.vacancyId}/attachments`);
    report.check('1.1-D [U101] DELETE lampiran -> 200 & hilang dari daftar', ad.status() === 200 && !after2.some((x) => x.id === aid), `status=${ad.status()}`);

    report.step('1.4 Lowongan dihapus -> kandidat tetap ada');
    const del = await page.request.delete(`${API}recruitment/vacancies`, { data: { ids: [v2.vacancyId] } });
    const orphan = await page.request.get(C);
    const ov = ((await orphan.json().catch(() => ({}))) as { data?: Cand }).data?.vacancy;
    report.check('1.1-D / 1.4 [U065] DELETE lowongan -> 200; kandidatnya tetap ada (200)', del.status() === 200 && orphan.status() === 200, `delete=${del.status()}, kandidat=${orphan.status()}, vacancy=${JSON.stringify(ov)}`);
  } finally {
    await cleanupRecruitment(page.request, made, [v.vacancyId, v2.vacancyId]);
  }
  report.print();
});
