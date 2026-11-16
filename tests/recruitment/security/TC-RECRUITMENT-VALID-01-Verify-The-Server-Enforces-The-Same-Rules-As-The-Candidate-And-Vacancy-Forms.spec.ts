/**
 * ================================================================================
 * TC-RECRUITMENT-VALID-01 — Verify The Server Enforces The Same Rules As The Candidate And Vacancy Forms (Length, Uniqueness, Number Of Positions, Inactive Vacancy) And The Form Explains What The Server Rejects
 * Modul    : Recruitment (U005 Candidates, U065 Vacancies, U100 Candidate Detail, U101 Vacancy Detail & Attachments)
 * Kategori : Negative (-) 2.3 2.5 | Boundary (B) 3.1 3.2 | Edge (!) 4.8 | Security (S) 5.9 | Usability 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VALID-01-Verify-The-Server-Enforces-The-Same-Rules-As-The-Candidate-And-Vacancy-Forms.spec.ts
 * Path     : tests/recruitment/security/
 * ================================================================================
 *
 * LATAR: validasi di form hanya berarti bila server menegakkan aturan yang sama (klien API, skrip,
 * atau UI lain bisa melewati form). Setiap aturan dibuktikan dulu di FORM (pesannya), lalu body yang
 * sama dikirim ke API dengan sesi Admin yang sama.
 *
 * TUJUAN (LIVE 17 Nov 2026; data uji milik TC):
 *   3.1  Vacancy Name > 50     form "Should not exceed 50 characters" -> API harus 422.
 *   2.3  Vacancy Name duplikat form "Already exists"                   -> API harus 422.
 *   3.2 / 5.9  Number of Positions 0, -1, 100  form "Should be a number between 1-99" /
 *        "Should be a numeric value" -> API harus 422.
 *   3.1  Email kandidat > 50   form "Should not exceed 50 characters" -> API harus 422.
 *   3.1  Komentar lampiran lowongan > 200  form "Should not exceed 200 characters" -> API harus 422.
 *   2.5 / 5.9  Lowongan nonaktif tidak ditawarkan di form Add Candidate -> API POST kandidat ke
 *        lowongan nonaktif harus ditolak (bila diterima, kandidat macet: Shortlist dijawab 403).
 *   8.4  Notes kandidat 251 karakter: server menolak (422) -> form harus memberi pesan di field,
 *        bukan hanya toast "Invalid Parameter".
 *   Kontrol konsisten: First Name 31 & Keywords 251 -> form memberi pesan DAN API 422.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-445 (Medium) -- API menerima (200) nama lowongan 51 karakter, nama
 *   duplikat, posisi 0/-1/100, email 51 karakter, komentar lampiran 201 karakter, dan kandidat untuk
 *   lowongan nonaktif; Notes 251 hanya memunculkan toast "Invalid Parameter" tanpa pesan di field,
 *   (halaman juga melempar exception "fe" = AxiosError tak tertangani, pola app-wide BG-199; dikecualikan
 *   dari check console agar tidak dilaporkan ganda).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/security/TC-RECRUITMENT-VALID-01-Verify-The-Server-Enforces-The-Same-Rules-As-The-Candidate-And-Vacancy-Forms.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createVacancyWithCandidate } from '../../../src/utils/maintenanceData';
import { API, candidateBody, cleanupRecruitment, fieldErrors, filePayload, formField, getJson, vacancyBody } from '../../../src/utils/recruitmentData';

test('TC-RECRUITMENT-VALID-01: the server enforces the same rules as the candidate & vacancy forms', async ({ page }, testInfo) => {
  testInfo.setTimeout(300_000);
  // The deliberate 422 (Notes 251) makes the app throw its minified AxiosError "fe" -- app-wide BG-199, not re-reported here.
  const report = new TestReport('TC-RECRUITMENT-VALID-01', 'Server Enforces Same Rules As Recruitment Forms', env.baseURL, page, [/status of 422/, /^Uncaught exception: fe$/]);
  const v = await createVacancyWithCandidate(page.request, 'QaRecValid');
  const other = await createVacancyWithCandidate(page.request, 'QaRecValidDup', false);
  const inactive = await createVacancyWithCandidate(page.request, 'QaRecValidOff', false);
  const extra: number[] = [];
  const formSays = async (label: string, value: string, blurTo: string): Promise<string> => {
    await formField(page, label).fill(value);
    await formField(page, blurTo).click();
    await page.locator('.oxd-input-field-error-message').first().waitFor({ timeout: 8_000 }).catch(() => null);
    const e = (await fieldErrors(page)).join(' | ');
    return e;
  };
  try {
    report.step('[U101] Form Edit Vacancy');
    await page.goto(`/web/index.php/recruitment/addJobVacancy/${v.vacancyId}`);
    await page.waitForResponse((r) => r.url().includes(`recruitment/vacancies/${v.vacancyId}`)).catch(() => null);
    await page.waitForLoadState('networkidle');
    const original = await formField(page, 'Vacancy Name').inputValue();
    const vacRules: Array<[string, string, string, RegExp, Record<string, unknown>]> = [
      ['3.1 Vacancy Name 51 karakter', 'Vacancy Name', 'v'.repeat(51), /Should not exceed 50 characters/, { name: `QaRecValid ${'v'.repeat(40)}` }],
      ['2.3 Vacancy Name duplikat', 'Vacancy Name', other.vacancyName, /Already exists/, { name: other.vacancyName }],
      ['3.2 / 5.9 Number of Positions 0', 'Number of Positions', '0', /between 1-99/, { numOfPositions: 0 }],
      ['3.2 / 5.9 Number of Positions -1', 'Number of Positions', '-1', /numeric value|between 1-99/, { numOfPositions: -1 }],
      ['3.2 / 5.9 Number of Positions 100', 'Number of Positions', '100', /between 1-99/, { numOfPositions: 100 }],
    ];
    for (const [label, fieldName, value, msg, apiBody] of vacRules) {
      const e = await formSays(fieldName, value, 'Description');
      report.check(`${label} [U101] -> form menolak (${msg.source})`, msg.test(e), e || '(tanpa pesan)');
      await formField(page, fieldName).fill(fieldName === 'Vacancy Name' ? original : '1');
      const r = await page.request.put(`${API}recruitment/vacancies/${v.vacancyId}`, { data: await vacancyBody(page.request, v.vacancyId, { ...apiBody, ...(apiBody.name ? {} : { name: original }) }) });
      report.check(`${label} [U101] -> API juga menolak (422)`, r.status() === 422, `status=${r.status()}`);
      await page.request.put(`${API}recruitment/vacancies/${v.vacancyId}`, { data: await vacancyBody(page.request, v.vacancyId, { name: original, numOfPositions: 1 }) });
    }

    report.step('[U101] Komentar lampiran lowongan');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Add/ }).last().click();
    await page.locator('textarea').last().fill('c'.repeat(201));
    await page.locator('.oxd-input-field-error-message').first().waitFor({ timeout: 8_000 }).catch(() => null);
    const ce = (await fieldErrors(page)).join(' | ');
    report.check('3.1 Komentar lampiran 201 karakter [U101] -> form menolak (Should not exceed 200 characters)', /Should not exceed 200/.test(ce), ce || '(tanpa pesan)');
    const ca = await page.request.post(`${API}recruitment/vacancy/attachments`, { data: { vacancyId: v.vacancyId, attachment: filePayload('qa.pdf', 'application/pdf', '%PDF'), comment: 'c'.repeat(201), attachmentType: 1 } });
    report.check('3.1 Komentar lampiran 201 karakter [U101] -> API juga menolak (422)', ca.status() === 422, `status=${ca.status()}`);

    report.step('[U100] Form Edit Candidate');
    await page.goto(`/web/index.php/recruitment/addCandidate/${v.candidateId}`);
    await page.waitForLoadState('networkidle');
    await page.locator('.oxd-switch-input').first().click();
    const ee = await formSays('Email', `${'a'.repeat(39)}@example.com`, 'Contact Number');
    report.check('3.1 Email 51 karakter [U100] -> form menolak (Should not exceed 50 characters)', /Should not exceed 50/.test(ee), ee || '(tanpa pesan)');
    const ea = await page.request.put(`${API}recruitment/candidates/${v.candidateId}`, { data: candidateBody(v.vacancyId, { email: `${'a'.repeat(39)}@example.com` }) });
    report.check('3.1 Email 51 karakter [U100] -> API juga menolak (422)', ea.status() === 422, `status=${ea.status()}`);
    await formField(page, 'Email').fill('qa.valid@example.com');
    const fe = await (async () => { await page.getByPlaceholder('First Name').fill('f'.repeat(31)); await formField(page, 'Email').click(); await page.locator('.oxd-input-field-error-message').first().waitFor({ timeout: 8_000 }).catch(() => null); return (await fieldErrors(page)).join(' | '); })();
    const fa = await page.request.put(`${API}recruitment/candidates/${v.candidateId}`, { data: candidateBody(v.vacancyId, { firstName: 'f'.repeat(31) }) });
    report.check('3.1 / 8.4 Kontrol: First Name 31 [U100] -> form menolak DAN API 422', /Should not exceed 30/.test(fe) && fa.status() === 422, `form=${fe}, api=${fa.status()}`);
    await page.getByPlaceholder('First Name').fill('QaRecValid');
    const ke = await formSays('Keywords', 'k'.repeat(251), 'Email');
    const ka = await page.request.put(`${API}recruitment/candidates/${v.candidateId}`, { data: candidateBody(v.vacancyId, { keywords: 'k'.repeat(251) }) });
    report.check('3.1 / 8.4 Kontrol: Keywords 251 [U100] -> form menolak DAN API 422', /Should not exceed 250/.test(ke) && ka.status() === 422, `form=${ke}, api=${ka.status()}`);
    await formField(page, 'Keywords').fill('');
    await formField(page, 'Notes').fill('n'.repeat(251));
    await formField(page, 'Email').click();
    const save = page.waitForResponse((r) => r.url().includes(`recruitment/candidates/${v.candidateId}`) && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Save' }).last().click();
    const sr = await save;
    const toast = (await page.locator('.oxd-toast').first().innerText({ timeout: 8_000 }).catch(() => '')).replace(/\s+/g, ' ');
    const ne = (await fieldErrors(page)).join(' | ');
    report.check('8.4 Notes 251 karakter [U100] -> server menolak (422) dan form menjelaskan di field Notes (bukan hanya toast umum)', sr?.status() === 422 && /250/.test(ne), `PUT=${sr?.status()}, pesanField=${ne || '(tidak ada)'}, toast=${toast}`);

    report.step('[U005] Lowongan nonaktif');
    await page.request.put(`${API}recruitment/vacancies/${inactive.vacancyId}`, { data: await vacancyBody(page.request, inactive.vacancyId, { status: false }) });
    await page.goto('/web/index.php/recruitment/addCandidate');
    await page.waitForLoadState('networkidle');
    await page.locator('.oxd-select-text').first().click();
    const opts = await page.getByRole('option').allInnerTexts();
    report.check('2.5 Form Add Candidate [U005] tidak menawarkan lowongan nonaktif', opts.length > 0 && !opts.some((o) => o.includes(inactive.vacancyName)), `opsi=${opts.length}`);
    const ip = await page.request.post(`${API}recruitment/candidates`, { data: candidateBody(inactive.vacancyId, { email: 'qa.inactive@example.com' }) });
    const iid = ((await ip.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;
    if (iid) extra.push(iid);
    let shortlist = 'n/a';
    if (iid) shortlist = String((await page.request.put(`${API}recruitment/candidates/${iid}/shortlist`, { data: { note: null } })).status());
    report.check('2.5 / 5.9 API POST kandidat ke lowongan nonaktif [U005] -> ditolak (4xx)', ip.status() >= 400 && ip.status() < 500, `status=${ip.status()}; bila diterima, Shortlist kandidat itu -> ${shortlist}`);
    const vac = await getJson<{ status: boolean }>(page.request, `recruitment/vacancies/${inactive.vacancyId}`);
    report.finding('4.8 Lowongan nonaktif', `status=${vac.status}; kandidat lama tetap ada di lowongan nonaktif, aksi workflow utk kandidat itu dijawab 403`);
  } finally {
    await cleanupRecruitment(page.request, [v.candidateId, ...extra], [v.vacancyId, other.vacancyId, inactive.vacancyId]);
  }
  report.print();
});
