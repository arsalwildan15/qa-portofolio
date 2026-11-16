/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-23 — Verify The Candidate List Filters: Vacancy Relation, Date Of Application Range And Format, Long/Unicode/Command-Like Keywords And Reflected HTML
 * Modul    : Recruitment > Candidates (U005, recruitment/viewCandidates)
 * Kategori : Positive (+) 1.2 1.4 1.8 | Boundary (B) 3.1 3.4 | Edge (!) 4.1 4.8 |
 *            Security (S) 5.1-XSS-Reflected 5.1-CmdPath | Usability 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-23-Verify-Candidate-List-Filters-Dates-Unusual-Text-And-Reflected-Input.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN (perilaku dibaca LIVE 17 Nov 2026; kandidat uji dgn keywords Arab dibuat lewat API):
 *   1.4 / 1.2  filter Vacancy = lowongan uji -> "(1) Record Found" & nama kandidat uji.
 *   3.4  Date of Application From > To -> "To date should be after from date"; tanggal tidak valid
 *        -> "Should be a valid date in yyyy-dd-mm format".
 *   4.8  format tanggal demo = yyyy-dd-mm (bukan yyyy-mm-dd): rentang 2026-31-10..2026-02-11
 *        (= 31 Okt..2 Nov 2026) menemukan kandidat uji; query API dikirim sbg yyyy-mm-dd.
 *   3.4  satu hari (From = To) diterima form -> harus menampilkan kandidat hari itu.
 *   4.1  Keywords Arab -> kandidat uji ditemukan.   3.1 Keywords 300 karakter -> tanpa error.
 *   5.1-CmdPath  "; cat /etc/passwd" -> tanpa error server.
 *   5.1-XSS-Reflected  HTML di Keywords & Candidate Name -> tanpa elemen tersuntik / dialog.
 *   1.8  pencarian tanpa hasil -> info "No Records Found".   8.4 pesan validasi konsisten.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-443 (Low) -- From = To lolos validasi form tetapi server menjawab 400
 *   "From Date Should Be Earlier Than To Date"; daftar tetap menampilkan SEMUA kandidat (tanpa filter)
 *   -> kandidat satu tanggal tidak bisa dicari. Console 400 ikut tercatat (akar masalah sama).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-23-Verify-Candidate-List-Filters-Dates-Unusual-Text-And-Reflected-Input.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createVacancyWithCandidate } from '../../../src/utils/maintenanceData';
import { API, candidateBody, cleanupRecruitment, fieldErrors } from '../../../src/utils/recruitmentData';

test('TC-RECRUITMENT-CANDIDATE-23: candidate list filters - vacancy, dates, unusual text, reflected input', async ({ page }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-23', 'Candidate List Filters Dates Unusual Text Reflected Input', env.baseURL, page);
  const dialogs: string[] = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  const v = await createVacancyWithCandidate(page.request, 'QaRecList');
  const s = `${Date.now() % 100000}`;
  const kw = `مرحبا${s}`;
  await page.request.put(`${API}recruitment/candidates/${v.candidateId}`, { data: candidateBody(v.vacancyId, { firstName: 'QaList', lastName: `L${s}`, email: `qa.list${s}@example.com`, keywords: kw, dateOfApplication: '2026-11-01' }) });
  const result = () => page.locator('.orangehrm-container, .orangehrm-horizontal-padding').allInnerTexts().then((t) => t.join(' ').replace(/\s+/g, ' '));
  const search = async () => {
    const resp = page.waitForResponse((r) => r.url().includes('/recruitment/candidates?'), { timeout: 20_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Search' }).click();
    const r = await resp;
    await page.waitForLoadState('networkidle');
    return r;
  };
  const fresh = async () => { await page.goto('/web/index.php/recruitment/viewCandidates'); await page.waitForLoadState('networkidle'); };
  const kwBox = () => page.getByPlaceholder('Enter comma seperated words...');
  try {
    report.step('Filter Vacancy');
    await fresh();
    await page.locator('.oxd-input-group').filter({ hasText: 'Vacancy' }).locator('.oxd-select-text').click();
    await page.getByRole('option', { name: v.vacancyName }).click();
    const r1 = await search();
    const t1 = await result();
    report.check('1.4 / 1.2 Filter Vacancy = lowongan uji -> "(1) Record Found" & nama kandidat uji', r1?.status() === 200 && /\(1\) Record Found/.test(t1) && t1.includes(`L${s}`), t1.slice(0, 160));

    report.step('Rentang tanggal');
    await fresh();
    await page.getByPlaceholder('From').fill('2026-10-11');
    await page.getByPlaceholder('To').fill('2026-01-11');
    await page.getByRole('button', { name: 'Search' }).click();
    const e1 = (await fieldErrors(page)).join(' | ');
    report.check('3.4 / 8.4 From > To -> "To date should be after from date"', /To date should be after from date/.test(e1), e1 || '(tanpa pesan)');
    await fresh();
    await page.getByPlaceholder('From').fill('2026-13-45');
    await page.getByRole('button', { name: 'Search' }).click();
    const e2 = (await fieldErrors(page)).join(' | ');
    report.check('3.4 / 8.4 Tanggal tidak valid "2026-13-45" -> "Should be a valid date in yyyy-dd-mm format"', /Should be a valid date in yyyy-dd-mm format/.test(e2), e2 || '(tanpa pesan)');
    await fresh();
    await kwBox().fill(kw);
    await page.getByPlaceholder('From').fill('2026-31-10');
    await page.getByPlaceholder('To').fill('2026-02-11');
    const r2 = await search();
    const t2 = await result();
    report.check('4.8 Format yyyy-dd-mm: 2026-31-10..2026-02-11 (= 31 Okt..2 Nov 2026) menemukan kandidat uji & query API 2026-10-31..2026-11-02', /fromDate=2026-10-31&toDate=2026-11-02/.test(r2?.url() ?? '') && r2?.status() === 200 && t2.includes(`L${s}`), `${(r2?.url() ?? '').replace(/^.*\?/, '').slice(0, 120)} | ${t2.slice(0, 80)}`);
    await fresh();
    await kwBox().fill(kw);
    await page.getByPlaceholder('From').fill('2026-01-11');
    await page.getByPlaceholder('To').fill('2026-01-11');
    const formOk = (await fieldErrors(page)).length === 0;
    const r3d = await search();
    const t3d = await result();
    const toast = (await page.locator('.oxd-toast').allInnerTexts()).join(' ').replace(/\s+/g, ' ');
    report.check('3.4 Satu hari (From = To = 1 Nov 2026), diterima form -> server menampilkan kandidat hari itu (bukan 400 & daftar tanpa filter)', formOk && r3d?.status() === 200 && /\(1\) Record Found/.test(t3d) && t3d.includes(`L${s}`), `formError=${!formOk}, GET=${r3d?.status()}, toast=${toast || '-'}, daftar=${t3d.slice(0, 40)}`);

    report.step('Keywords tidak biasa');
    await fresh();
    await kwBox().fill(kw);
    const r4 = await search();
    report.check('4.1 Keywords Arab -> kandidat uji ditemukan', r4?.status() === 200 && (await result()).includes(`L${s}`), `status=${r4?.status()}`);
    for (const [label, q] of [['3.1 Keywords 300 karakter', 'k'.repeat(300)], ['5.1-CmdPath Keywords "; cat /etc/passwd"', '; cat /etc/passwd'], ['5.1-XSS-Reflected Keywords HTML', '<img src=x onerror=alert(1)>']] as const) {
      await fresh();
      await kwBox().fill(q);
      const r = await search();
      const t = await result();
      report.check(`${label} -> 200, tanpa error/elemen tersuntik/dialog & info "No Records Found" (1.8)`, r?.status() === 200 && (await page.locator('img[src="x"]').count()) === 0 && dialogs.length === 0 && /No Records Found/.test(t) && (await fieldErrors(page)).length === 0, `status=${r?.status()} ${t.slice(0, 60)}`);
    }
    await fresh();
    await page.getByPlaceholder('Type for hints...').fill('<img src=x onerror=alert(1)>');
    await page.getByRole('option').first().waitFor({ timeout: 15_000 }).catch(() => null);
    report.check('5.1-XSS-Reflected Candidate Name HTML -> saran tanpa elemen tersuntik/dialog', (await page.locator('img[src="x"]').count()) === 0 && dialogs.length === 0, (await page.getByRole('option').allInnerTexts()).join('|'));
  } finally {
    await cleanupRecruitment(page.request, [v.candidateId], [v.vacancyId]);
  }
  report.print();
});
