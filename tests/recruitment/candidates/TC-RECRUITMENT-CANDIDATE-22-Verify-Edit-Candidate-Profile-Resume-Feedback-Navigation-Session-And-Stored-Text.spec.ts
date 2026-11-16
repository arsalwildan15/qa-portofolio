/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-22 — Verify Editing A Candidate Profile: View, Update, Replace Resume, Feedback, Double Save, Refresh, Lost Session, Unicode/Emoji And Safe Display Of Stored Text
 * Modul    : Recruitment > Candidate Detail (U100, recruitment/addCandidate/<id>)
 * Kategori : Positive (+) 1.1-R 1.1-U 1.2 1.7 1.8 | Edge (!) 4.1 4.2 4.3 4.5 4.6 |
 *            Security (S) 5.1-XSS-Stored
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-22-Verify-Edit-Candidate-Profile-Resume-Feedback-Navigation-Session-And-Stored-Text.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN (alur dibaca LIVE 17 Nov 2026; kandidat uji dibuat lewat API & dihapus):
 *   1.1-R  detail menampilkan nama, email, lowongan (GET candidates/<id> 200).
 *   4.6    kandidat tanpa resume -> tidak ada nama file resume.
 *   1.1-U / 1.8  toggle Edit, ubah Last Name & Keywords -> PUT 200, toast "Successfully Updated",
 *          setelah reload nilai baru tampil.   1.2 kosongkan Keywords (opsional) -> tersimpan kosong.
 *   1.7    ganti resume lewat Browse -> PUT candidate/<id>/attachment 200, nama file tampil.
 *   4.3    ubah field lalu refresh tanpa Save -> tanpa PUT, nilai lama tetap.
 *   4.2    klik ganda Save -> tanpa 5xx, satu kandidat dgn nilai terakhir.
 *   4.5    sesi berakhir (cookie dihapus) lalu Save -> PUT 401, dialihkan ke login, data tidak berubah.
 *   4.1    First Name "Zoë 😀" -> toast sukses DAN setelah reload tampil identik.
 *   5.1-XSS-Stored  nama & notes berisi HTML -> tampil sbg teks di detail & hasil cari, tanpa
 *          elemen tersuntik / dialog.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-442 (Medium) -- emoji disimpan sebagai "?" ("Zoë 😀" -> "Zoë ?")
 *   padahal toast "Successfully Updated" & respons PUT menggemakan emoji utuh (data diam-diam rusak).
 *   Exception JS saat pengalihan sesi habis ("reading 'response'") adalah bug app-wide tersendiri,
 *   diuji di TC-XMOD-07, jadi dikecualikan dari check console TC ini.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-22-Verify-Edit-Candidate-Profile-Resume-Feedback-Navigation-Session-And-Stored-Text.spec.ts --project=chromium
 * ================================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createVacancyWithCandidate } from '../../../src/utils/maintenanceData';
import { API, candidateBody, cleanupRecruitment, formField, getJson } from '../../../src/utils/recruitmentData';

type Cand = { firstName: string; lastName: string; keywords: string | null; email: string; vacancy: { name: string } | null };

test('TC-RECRUITMENT-CANDIDATE-22: edit candidate profile - update, resume, feedback, navigation, session, emoji, stored text', async ({ page }, testInfo) => {
  testInfo.setTimeout(300_000);
  // Expired-session redirect noise (401 + unhandled "reading 'response'") is its own app-wide bug, asserted in TC-XMOD-07.
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-22', 'Edit Candidate Profile', env.baseURL, page, [/status of 401/, /reading 'response'/]);
  const dialogs: string[] = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  const v = await createVacancyWithCandidate(page.request, 'QaRecEdit');
  const cid = v.candidateId!;
  const C = `${API}recruitment/candidates/${cid}`;
  const s = `${Date.now() % 100000}`;
  await page.request.put(C, { data: candidateBody(v.vacancyId, { firstName: 'QaEdit', lastName: `L${s}`, email: `qa.edit${s}@example.com`, keywords: 'awal' }) });
  const cand = () => getJson<Cand>(page.request, `recruitment/candidates/${cid}`);
  const open = async () => {
    const detail = page.waitForResponse((r) => r.url().endsWith(`recruitment/candidates/${cid}`) && r.request().method() === 'GET', { timeout: 30_000 }).catch(() => null);
    await page.goto(`/web/index.php/recruitment/addCandidate/${cid}`);
    const d = await detail;
    await page.waitForLoadState('networkidle');
    return d;
  };
  const edit = async () => { await page.locator('.oxd-switch-input').first().click(); await page.getByPlaceholder('Last Name').waitFor(); };
  const saveAndWait = async () => {
    const put = page.waitForResponse((r) => r.url().endsWith(`recruitment/candidates/${cid}`) && r.request().method() === 'PUT', { timeout: 20_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Save' }).last().click();
    return put;
  };
  try {
    report.step('Lihat detail');
    const d = await open();
    const text = (await page.locator('.orangehrm-background-container').innerText()).replace(/\s+/g, ' ');
    report.check('1.1-R Detail kandidat: GET 200 & menampilkan lowongan + email', d?.status() === 200 && text.includes(v.vacancyName) && (await formField(page, 'Email').inputValue()) === `qa.edit${s}@example.com`, `GET=${d?.status()}`);
    report.check('4.6 Kandidat tanpa resume -> tidak ada nama file resume', (await page.locator('.orangehrm-file-name').count()) === 0, `fileName=${await page.locator('.orangehrm-file-name').count()}`);

    report.step('Ubah & simpan');
    await edit();
    await page.getByPlaceholder('Last Name').fill(`Baru${s}`);
    await formField(page, 'Keywords').fill('qa,playwright');
    const p1 = await saveAndWait();
    const t1 = await page.locator('.oxd-toast').first().innerText({ timeout: 10_000 }).catch(() => '');
    report.check('1.1-U / 1.8 Save -> PUT 200 & toast "Successfully Updated"', p1?.status() === 200 && /Successfully Updated/.test(t1), `PUT=${p1?.status()} toast=${t1.replace(/\s+/g, ' ')}`);
    await open();
    report.check('1.1-U Setelah reload Last Name & Keywords baru tampil', (await page.getByPlaceholder('Last Name').inputValue()) === `Baru${s}` && (await formField(page, 'Keywords').inputValue()) === 'qa,playwright');
    await edit();
    await formField(page, 'Keywords').fill('');
    const p2 = await saveAndWait();
    report.check('1.2 Keywords (opsional) dikosongkan -> PUT 200 & tersimpan kosong', p2?.status() === 200 && !(await cand()).keywords, `PUT=${p2?.status()} keywords=${(await cand()).keywords}`);

    report.step('Ganti resume');
    await open();
    await edit();
    const file = path.join(testInfo.outputDir, 'qa-resume.pdf');
    fs.mkdirSync(testInfo.outputDir, { recursive: true });
    fs.writeFileSync(file, '%PDF-1.4\n% qa resume\n');
    await page.locator('input[type="file"]').setInputFiles(file);
    const att = page.waitForResponse((r) => r.url().includes(`recruitment/candidate/${cid}/attachment`) && r.request().method() === 'PUT', { timeout: 20_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Save' }).last().click();
    const ar = await att;
    await open();
    report.check('1.7 Resume diunggah lewat Browse -> PUT attachment 200 & nama file tampil', ar?.status() === 200 && (await page.locator('.orangehrm-background-container').innerText()).includes('qa-resume.pdf'), `PUT=${ar?.status()}`);

    report.step('Navigasi: refresh tanpa Save');
    await edit();
    let puts = 0;
    const count = (r: { url(): string; request(): { method(): string } }) => { if (r.url().endsWith(`recruitment/candidates/${cid}`) && r.request().method() === 'PUT') puts++; };
    page.on('response', count);
    await page.getByPlaceholder('Last Name').fill('TidakDisimpan');
    await open();
    report.check('4.3 Refresh dgn perubahan belum disimpan -> tanpa PUT & nilai lama tetap', puts === 0 && (await page.getByPlaceholder('Last Name').inputValue()) === `Baru${s}`, `PUT=${puts}`);

    report.step('Klik ganda Save');
    await edit();
    await page.getByPlaceholder('Last Name').fill(`Ganda${s}`);
    await page.getByRole('button', { name: 'Save' }).last().dblclick();
    await page.locator('.oxd-toast').first().waitFor({ timeout: 10_000 }).catch(() => null);
    await page.waitForLoadState('networkidle');
    report.check('4.2 Klik ganda Save -> tanpa 5xx & nilai terakhir tersimpan', (await cand()).lastName === `Ganda${s}`, `PUT terkirim=${puts}`);
    page.off('response', count);

    report.step('Sesi berakhir sebelum Save');
    await open();
    await edit();
    await page.getByPlaceholder('Last Name').fill('SesiHabis');
    const cookies = await page.context().cookies();
    await page.context().clearCookies();
    const p3 = await saveAndWait();
    const toLogin = await page.waitForURL(/auth\/login/, { timeout: 20_000 }).then(() => true, () => false);
    await page.context().addCookies(cookies);
    report.check('4.5 Sesi berakhir lalu Save -> PUT ditolak 401, dialihkan ke login & data tidak berubah', p3?.status() === 401 && toLogin && (await cand()).lastName === `Ganda${s}`, `PUT=${p3?.status()} login=${toLogin} lastName=${(await cand()).lastName}`);

    report.step('Teks berisi HTML tampil aman');
    await page.request.put(C, { data: candidateBody(v.vacancyId, { firstName: '<img src=x onerror=alert(1)>', lastName: `X${s}`, email: `qa.edit${s}@example.com`, comment: '<script>alert(1)</script>' }) });
    await open();
    const injectedDetail = await page.locator('img[src="x"]').count();
    await page.goto('/web/index.php/recruitment/viewCandidates');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('Type for hints...').fill(`X${s}`);
    await page.getByRole('option').filter({ hasText: `X${s}` }).first().waitFor({ timeout: 20_000 }).catch(() => null);
    const hint = (await page.getByRole('option').allInnerTexts()).join(' | ');
    report.check('5.1-XSS-Stored Nama & notes berisi HTML -> tampil sbg teks di detail & saran nama, tanpa elemen tersuntik/dialog', injectedDetail === 0 && (await page.locator('img[src="x"]').count()) === 0 && dialogs.length === 0 && hint.includes('<img'), `img detail=${injectedDetail}, saran=${hint.slice(0, 80)}, dialog=${dialogs.length}`);

    report.step('Unicode & emoji');
    await page.request.put(C, { data: candidateBody(v.vacancyId, { firstName: 'QaEdit', lastName: `Baru${s}`, email: `qa.edit${s}@example.com` }) });
    await open();
    await edit();
    await page.getByPlaceholder('First Name').fill('Zoë 😀');
    const p4 = await saveAndWait();
    const t4 = await page.locator('.oxd-toast').first().innerText({ timeout: 10_000 }).catch(() => '');
    await open();
    const shown = await page.getByPlaceholder('First Name').inputValue();
    report.check('4.1 First Name "Zoë 😀" -> toast sukses DAN setelah reload tampil identik (bukan "?")', p4?.status() === 200 && /Successfully/.test(t4) && shown === 'Zoë 😀', `PUT=${p4?.status()} toast=${t4.replace(/\s+/g, ' ')} tampil="${shown}" api="${(await cand()).firstName}"`);
  } finally {
    await cleanupRecruitment(page.request, [cid], [v.vacancyId]);
  }
  report.print();
});
