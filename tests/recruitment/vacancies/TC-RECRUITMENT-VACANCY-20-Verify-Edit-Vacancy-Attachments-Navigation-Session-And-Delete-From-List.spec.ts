/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-20 — Verify Editing A Vacancy And Its Attachments (Add, Edit, Delete, Double Save, Stored HTML), Refresh/Back, Lost Session, And Deleting A Vacancy From The List
 * Modul    : Recruitment > Vacancy Detail & Attachments (U101) + Vacancies list (U065)
 * Kategori : Positive (+) 1.1-R 1.1-U 1.1-D 1.7 1.8 | Edge (!) 4.2 4.3 4.5 4.6 |
 *            Security (S) 5.1-XSS-Stored 5.1-XSS-Reflected
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-20-Verify-Edit-Vacancy-Attachments-Navigation-Session-And-Delete-From-List.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN (alur dibaca LIVE 17 Nov 2026; lowongan uji dibuat lewat API & dihapus lewat UI):
 *   1.1-R  Edit Vacancy memuat data (GET vacancies/<id> 200, Vacancy Name terisi).
 *   4.6    tanpa lampiran -> "No Records Found".
 *   1.7 / 1.8  Attachments > Add, pilih file + komentar, Save -> POST 200, toast "Successfully Saved",
 *          baris tampil.   4.2 klik ganda Save lampiran -> tepat 1 lampiran tersimpan.
 *   1.1-U  ikon pensil -> ubah komentar -> PUT vacancies/<id>/attachments/<aid> 200, komentar baru tampil.
 *   5.1-XSS-Stored  komentar HTML -> tampil sbg teks, tanpa elemen tersuntik / dialog.
 *   1.1-D  ikon tempat sampah lampiran -> dialog -> DELETE 200 -> baris hilang.
 *   4.3    ubah Vacancy Name lalu refresh tanpa Save -> tanpa PUT, nama lama; Back -> kembali ke daftar.
 *   4.5    sesi berakhir lalu Save -> dialihkan ke login (cek nama unik dijawab 401) & nama tidak berubah.
 *   5.1-XSS-Reflected [U065]  query string berisi HTML di URL daftar -> tanpa elemen tersuntik.
 *   1.1-D / 1.8 [U065]  hapus lowongan dari daftar (filter Vacancy -> tempat sampah -> Yes, Delete)
 *          -> DELETE 200, toast "Successfully Deleted", GET lowongan 404.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-446 (Low) -- klik ganda Save di form Add Attachment menyimpan 2 lampiran
 *   identik (2x dari 2 run; pola double-submit spt BG-205/BG-427). Exception JS saat pengalihan sesi
 *   habis dikecualikan dari check console (bug app-wide tersendiri, TC-XMOD-07).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-20-Verify-Edit-Vacancy-Attachments-Navigation-Session-And-Delete-From-List.spec.ts --project=chromium
 * ================================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createVacancyWithCandidate } from '../../../src/utils/maintenanceData';
import { API, cleanupRecruitment, formField, getJson } from '../../../src/utils/recruitmentData';

test('TC-RECRUITMENT-VACANCY-20: edit vacancy & attachments, navigation, session, delete from list', async ({ page }, testInfo) => {
  testInfo.setTimeout(300_000);
  // Expired-session redirect noise (401 + unhandled "reading 'response'") is its own app-wide bug, asserted in TC-XMOD-07.
  const report = new TestReport('TC-RECRUITMENT-VACANCY-20', 'Edit Vacancy Attachments Navigation Session Delete', env.baseURL, page, [/status of 401/, /reading 'response'/]);
  const dialogs: string[] = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  const v = await createVacancyWithCandidate(page.request, 'QaRecVacEdit', false);
  const file = path.join(testInfo.outputDir, 'qa-vacancy.pdf');
  fs.mkdirSync(testInfo.outputDir, { recursive: true });
  fs.writeFileSync(file, '%PDF-1.4\n% qa vacancy\n');
  const rows = () => page.locator('.oxd-table-body .oxd-table-card');
  const attachmentsText = async () => (await page.locator('.oxd-table').last().innerText().catch(() => '')) + ' ' + (await page.locator('.orangehrm-background-container').last().innerText());
  const open = async () => {
    const d = page.waitForResponse((r) => r.url().endsWith(`recruitment/vacancies/${v.vacancyId}`) && r.request().method() === 'GET', { timeout: 30_000 }).catch(() => null);
    await page.goto(`/web/index.php/recruitment/addJobVacancy/${v.vacancyId}`);
    const r = await d;
    await page.waitForLoadState('networkidle');
    return r;
  };
  const addAttachment = async (comment: string, dbl = false) => {
    await page.getByRole('button', { name: /Add/ }).last().click();
    await page.locator('input[type="file"]').last().setInputFiles(file);
    await page.locator('textarea').last().fill(comment);
    const posts: number[] = [];
    const on = (r: { url(): string; status(): number; request(): { method(): string } }) => { if (r.url().includes('recruitment/vacancy/attachments') && r.request().method() === 'POST') posts.push(r.status()); };
    page.on('response', on);
    const first = page.waitForResponse((r) => r.url().includes('recruitment/vacancy/attachments') && r.request().method() === 'POST', { timeout: 20_000 }).catch(() => null);
    const save = page.getByRole('button', { name: 'Save' }).last();
    if (dbl) await save.dblclick(); else await save.click();
    await first;
    const toast = await page.locator('.oxd-toast', { hasText: 'Successfully Saved' }).first().innerText({ timeout: 10_000 }).catch(() => '');
    await page.waitForResponse((r) => /recruitment\/vacancies\/\d+\/attachments/.test(r.url()) && r.request().method() === 'GET', { timeout: 15_000 }).catch(() => null);
    await page.waitForLoadState('networkidle');
    page.off('response', on);
    return { posts, toast: toast.replace(/\s+/g, ' ') };
  };
  try {
    report.step('Lihat');
    const d = await open();
    report.check('1.1-R Edit Vacancy: GET 200 & Vacancy Name terisi', d?.status() === 200 && (await formField(page, 'Vacancy Name').inputValue()) === v.vacancyName, `GET=${d?.status()}`);
    report.check('4.6 Tanpa lampiran -> "No Records Found"', /No Records Found/.test(await attachmentsText()));

    report.step('Lampiran: tambah, ubah, HTML, hapus');
    const a1 = await addAttachment('komentar awal');
    report.check('1.7 / 1.8 Tambah lampiran -> POST 200, toast "Successfully Saved", baris tampil', a1.posts[0] === 200 && /Successfully Saved/.test(a1.toast) && (await rows().filter({ hasText: 'qa-vacancy.pdf' }).count()) === 1, `POST=${a1.posts.join(',')} toast=${a1.toast}`);
    const row = rows().filter({ hasText: 'komentar awal' });
    await row.locator('.bi-pencil-fill').click();
    await page.locator('textarea').last().fill('<img src=x onerror=alert(1)> komentar diubah');
    const put = page.waitForResponse((r) => /recruitment\/vacancies\/\d+\/attachments\/\d+/.test(r.url()) && r.request().method() === 'PUT', { timeout: 20_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Save' }).last().click();
    const pr = await put;
    await page.waitForLoadState('networkidle');
    await page.waitForResponse((r) => /recruitment\/vacancies\/\d+\/attachments/.test(r.url()) && r.request().method() === 'GET', { timeout: 15_000 }).catch(() => null);
    await page.waitForLoadState('networkidle');
    const listText = await attachmentsText();
    report.check('1.1-U Ubah komentar lewat pensil -> PUT 200 & komentar baru tampil', pr?.status() === 200 && listText.includes('komentar diubah'), `PUT=${pr?.status()}`);
    report.check('5.1-XSS-Stored Komentar HTML tampil sbg teks, tanpa elemen tersuntik/dialog', listText.includes('<img src=x') && (await page.locator('img[src="x"]').count()) === 0 && dialogs.length === 0, `dialog=${dialogs.length}`);
    const before = (await getJson<unknown[]>(page.request, `recruitment/vacancies/${v.vacancyId}/attachments`)).length;
    const a2 = await addAttachment('klik ganda', true);
    const afterDbl = (await getJson<unknown[]>(page.request, `recruitment/vacancies/${v.vacancyId}/attachments`)).length;
    report.check('4.2 Klik ganda Save lampiran -> tepat 1 lampiran tersimpan (tanpa duplikat, tanpa 5xx)', a2.posts.every((x) => x < 500) && afterDbl - before === 1, `POST=${a2.posts.join(',') || '-'} baris ${before}->${afterDbl}`);
    for (const label of ['komentar diubah', 'klik ganda']) {
      while ((await rows().filter({ hasText: label }).count()) > 0) {
        await rows().filter({ hasText: label }).first().locator('.bi-trash').click();
        const del = page.waitForResponse((r) => r.url().includes('recruitment/vacancy/attachments') && r.request().method() === 'DELETE', { timeout: 20_000 }).catch(() => null);
        await page.getByRole('button', { name: /Yes, Delete/ }).click();
        const dr = await del;
        await page.waitForLoadState('networkidle');
        if (label === 'komentar diubah') report.check('1.1-D Hapus lampiran (tempat sampah -> Yes, Delete) -> DELETE 200 & baris hilang', dr?.status() === 200 && (await rows().filter({ hasText: label }).count()) === 0, `DELETE=${dr?.status()}`);
      }
    }

    report.step('Navigasi & sesi');
    let puts = 0;
    const count = (r: { url(): string; request(): { method(): string } }) => { if (r.url().endsWith(`recruitment/vacancies/${v.vacancyId}`) && r.request().method() === 'PUT') puts++; };
    page.on('response', count);
    await formField(page, 'Vacancy Name').fill('QaTidakDisimpan');
    await open();
    report.check('4.3 Refresh dgn Vacancy Name belum disimpan -> tanpa PUT & nama lama', puts === 0 && (await formField(page, 'Vacancy Name').inputValue()) === v.vacancyName, `PUT=${puts}`);
    page.off('response', count);
    await page.goto('/web/index.php/recruitment/viewJobVacancy');
    await page.waitForLoadState('networkidle');
    await open();
    await page.goBack();
    await page.waitForLoadState('networkidle');
    report.check('4.3 Back dari Edit Vacancy -> kembali ke daftar lowongan', /viewJobVacancy/.test(page.url()), page.url().replace(env.baseURL, ''));
    await open();
    await formField(page, 'Vacancy Name').fill('QaSesiHabis');
    const cookies = await page.context().cookies();
    await page.context().clearCookies();
    await page.getByRole('button', { name: 'Save' }).first().click();
    const toLogin = await page.waitForURL(/auth\/login/, { timeout: 20_000 }).then(() => true, () => false);
    await page.context().addCookies(cookies);
    const nameNow = (await getJson<{ name: string }>(page.request, `recruitment/vacancies/${v.vacancyId}`)).name;
    report.check('4.5 Sesi berakhir lalu Save -> dialihkan ke login & nama tidak berubah', toLogin && nameNow === v.vacancyName, `login=${toLogin} nama=${nameNow}`);

    report.step('[U065] Daftar lowongan');
    await page.goto('/web/index.php/recruitment/viewJobVacancy?name=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E&q=%22%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    await page.waitForLoadState('networkidle');
    report.check('5.1-XSS-Reflected [U065] HTML di query string daftar lowongan -> tanpa elemen tersuntik/dialog', (await page.locator('img[src="x"]').count()) === 0 && dialogs.length === 0, `dialog=${dialogs.length}`);
    await page.goto('/web/index.php/recruitment/viewJobVacancy');
    await page.waitForLoadState('networkidle');
    await page.locator('.oxd-input-group').filter({ hasText: 'Vacancy' }).locator('.oxd-select-text').click();
    await page.getByRole('option', { name: v.vacancyName }).click();
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForLoadState('networkidle');
    await rows().filter({ hasText: v.vacancyName }).locator('.bi-trash').click();
    const vdel = page.waitForResponse((r) => r.url().includes('recruitment/vacancies') && r.request().method() === 'DELETE', { timeout: 20_000 }).catch(() => null);
    await page.getByRole('button', { name: /Yes, Delete/ }).click();
    const vr = await vdel;
    const vt = await page.locator('.oxd-toast').first().innerText({ timeout: 10_000 }).catch(() => '');
    const gone = await page.request.get(`${API}recruitment/vacancies/${v.vacancyId}`);
    report.check('1.1-D / 1.8 [U065] Hapus lowongan dari daftar -> DELETE 200, toast "Successfully Deleted", GET 404', vr?.status() === 200 && /Successfully Deleted/.test(vt) && gone.status() === 404, `DELETE=${vr?.status()} toast=${vt.replace(/\s+/g, ' ')} GET=${gone.status()}`);
  } finally {
    await cleanupRecruitment(page.request, [], [v.vacancyId]);
  }
  report.print();
});
