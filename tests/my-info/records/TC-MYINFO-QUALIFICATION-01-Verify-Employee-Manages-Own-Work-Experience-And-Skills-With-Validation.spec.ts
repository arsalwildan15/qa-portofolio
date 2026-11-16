/**
 * ================================================================================
 * TC-MYINFO-QUALIFICATION-01 — Verify An Employee Manages Their Own Work Experience And Skills, With Required, Length, Date-Range, Number And Stored-XSS Checks
 * Modul    : My Info - Qualifications (ESS, U115)
 * Kategori : Positive (+) 1.1-C 1.1-R 1.1-U 1.1-D 1.8 | Negative (-) 2.1 2.2 | Boundary (B) 3.1 3.2 3.4 |
 *            Edge (!) 4.2 | Security (S) 5.1-XSS-Stored | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-QUALIFICATION-01-Verify-Employee-Manages-Own-Work-Experience-And-Skills-With-Validation.spec.ts
 * Path     : tests/my-info/records/
 * ================================================================================
 *
 * TUJUAN (sesi ESS baru, record milik sendiri; perilaku dibuktikan LIVE 16 Nov 2026):
 *   Work Experience
 *     2.1 / 8.4  Save kosong -> "Required" (Company & Job Title), tanpa POST.
 *     3.1 / 8.4  Company 101 karakter -> "Should not exceed 100 characters".
 *     3.4 / 8.4  To Date sebelum From Date -> "To date should be after from date", tanpa POST.
 *     1.1-C / 6.1  valid -> POST work-experiences 200, 1.8 toast; 1.1-R tampil di tabel.
 *     5.1-XSS-Stored  Company "<img src=x onerror=alert(1)>" -> teks literal, tanpa dialog/<img>.
 *     1.1-U / 6.1  edit Company -> PUT 200 & tabel menampilkan nilai baru.
 *     4.2   double-click Save -> tepat 1 record.
 *     1.1-D / 6.1  hapus -> DELETE 200 & hilang.
 *   Skills
 *     2.1   Save tanpa Skill -> "Required".
 *     2.2 / 8.4  Years of Experience "abc" / "-3" -> "Should be a number".
 *     3.2 / 8.4  Years of Experience 100 -> "Should be less than 100"; 99 diterima.
 *     1.1-C / 6.1  skill valid -> POST skills 200.
 *
 * HASIL 16 Nov 2026: 20/21 lolos. SENGAJA FAILED (R3): 4.2 double-click Save Work Experience -> 2
 *   record (tombol Save tidak dikunci selama request; akar sama dgn BG-427) = BUG BG-432.
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/records/TC-MYINFO-QUALIFICATION-01-Verify-Employee-Manages-Own-Work-Experience-And-Skills-With-Validation.spec.ts --project=chromium
 * ================================================================================
 */

import { expect, type Locator } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';
import { QualificationsPage } from '../../../src/pages';
import { fillDate } from '../../../src/utils/dateInput';
import { newEssSession, openMyInfoFromMenu, nextResponse, deleteRowContaining } from '../../../src/utils/myInfo';

const XSS = '<img src=x onerror=alert(1)>';

test('TC-MYINFO-QUALIFICATION-01: an employee manages their own work experience and skills with validation', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-MYINFO-QUALIFICATION-01', 'Employee Manages Own Work Experience And Skills', env.baseURL, page);
  const s = `${Date.now() % 100000}`;

  report.step('Setup: akun ESS, buka My Info lalu tab Qualifications');
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaMyInfoQual');
  const dialogs: string[] = [];
  essPage.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  const posts: Record<string, number> = {};
  essPage.on('request', (r) => {
    const key = r.method() === 'POST' ? /\/(work-experiences|skills)\b/.exec(r.url())?.[1] : undefined;
    if (key) posts[key] = (posts[key] ?? 0) + 1;
  });
  try {
    const empNumber = await openMyInfoFromMenu(essPage);
    const q = new QualificationsPage(essPage);
    const api = (seg: string) => `/web/index.php/api/v2/pim/employees/${empNumber}/${seg}`;
    // Rows of every Qualifications table; the test texts are unique, so filtering by text is enough.
    const weRows = () => essPage.locator('.oxd-table-card');
    const err = (t: string | RegExp): Locator => q.fieldErrors.filter({ hasText: t }).first();
    const open = async (fn: () => Promise<void>, first: Locator) => {
      await q.goto(empNumber);
      await essPage.waitForLoadState('networkidle');
      await fn();
      await first.waitFor({ state: 'visible', timeout: 15_000 });
    };

    report.step('Work Experience: validasi');
    await open(() => q.openAddWorkExperience(), q.companyInput);
    await q.save();
    report.check('2.1 / 8.4 Save kosong -> "Required" di Company & Job Title', (await q.fieldErrors.filter({ hasText: /^Required$/ }).count()) >= 2 || await isVisibleWithWait(err(/^Required$/), 6_000), `pesan=${(await q.fieldErrors.allInnerTexts()).join(', ')}`);
    await q.companyInput.fill('X'.repeat(101));
    report.check('3.1 / 8.4 Company 101 karakter -> "Should not exceed 100 characters"', await isVisibleWithWait(err('Should not exceed 100 characters'), 6_000));
    await q.companyInput.fill(`QaCo${s}`);
    await q.jobTitleInput.fill('QaTitle');
    await fillDate(q.fromDateInput, '2022-01-01', 'yyyy-dd-mm');
    await fillDate(q.toDateInput, '2021-01-01', 'yyyy-dd-mm');
    await q.companyInput.click();
    await q.save();
    report.check('3.4 / 8.4 To sebelum From -> "To date should be after from date"', await isVisibleWithWait(err('To date should be after from date'), 6_000));
    report.check('2.1 / 3.4 Tanpa POST selama form tidak valid', !posts['work-experiences'], `post=${posts['work-experiences'] ?? 0}`);

    report.step('Work Experience: tambah valid');
    await fillDate(q.toDateInput, '2023-01-01', 'yyyy-dd-mm');
    await q.companyInput.click();
    await isHiddenWithWait(err('To date should be after from date'), 6_000);
    const post = nextResponse(essPage, '/work-experiences', 'POST');
    await q.save();
    const resp = await post;
    report.check('1.1-C / 6.1 POST work-experiences 200', resp?.status() === 200, `status=${resp?.status()}`);
    report.check('1.8 Toast "Successfully Saved"', await isVisibleWithWait(essPage.getByText('Successfully Saved'), 10_000));
    await q.goto(empNumber);
    await essPage.waitForLoadState('networkidle');
    report.check('1.1-R Work Experience tampil di tabel', await isVisibleWithWait(weRows().filter({ hasText: `QaCo${s}` }).first(), 10_000));

    report.step('Work Experience: stored XSS di Company');
    await open(() => q.openAddWorkExperience(), q.companyInput);
    await q.companyInput.fill(XSS);
    await q.jobTitleInput.fill('QaXss');
    const xssPost = nextResponse(essPage, '/work-experiences', 'POST');
    await q.save();
    const xssResp = await xssPost;
    await q.goto(empNumber);
    await essPage.waitForLoadState('networkidle');
    const literal = await isVisibleWithWait(weRows().filter({ hasText: XSS }).first(), 10_000);
    const injected = await essPage.locator('.oxd-table-card img[src="x"]').count();
    report.check('5.1-XSS-Stored Payload di Company tampil sbg teks literal, tanpa dialog & tanpa <img> baru', xssResp?.status() === 200 && literal && injected === 0 && dialogs.length === 0, `post=${xssResp?.status()}, literal=${literal}, img=${injected}, dialog=${dialogs.length}`);

    report.step('Work Experience: edit');
    const hydrated = essPage.waitForResponse((r) => /\/work-experiences\/\d+/.test(r.url()) && r.request().method() === 'GET', { timeout: 20_000 }).catch(() => null);
    await weRows().filter({ hasText: `QaCo${s}` }).first().locator('.bi-pencil-fill').click();
    await hydrated;
    await expect(q.companyInput).toHaveValue(`QaCo${s}`, { timeout: 10_000 }).catch(() => {});
    await q.companyInput.fill(`QaCoU${s}`);
    const put = nextResponse(essPage, '/work-experiences', 'PUT');
    await q.save();
    const putResp = await put;
    report.check('1.1-U / 6.1 PUT work-experiences 200', putResp?.status() === 200, `status=${putResp?.status()}`);
    await q.goto(empNumber);
    await essPage.waitForLoadState('networkidle');
    report.check('1.1-U Tabel menampilkan Company baru', await isVisibleWithWait(weRows().filter({ hasText: `QaCoU${s}` }).first(), 10_000));

    report.step('Work Experience: double submit');
    await open(() => q.openAddWorkExperience(), q.companyInput);
    await q.companyInput.fill(`QaCoD${s}`);
    await q.jobTitleInput.fill('QaDbl');
    await q.saveButton.dblclick();
    await essPage.getByText('Successfully Saved').first().waitFor({ timeout: 15_000 }).catch(() => {});
    await essPage.waitForLoadState('networkidle');
    const weData = ((await (await essPage.request.get(api('work-experiences'))).json()) as { data: Array<{ company: string }> }).data;
    const dbl = weData.filter((r) => r.company === `QaCoD${s}`).length;
    report.check('4.2 Double-click Save -> tepat 1 record', dbl === 1, `record=${dbl}`);

    report.step('Work Experience: hapus');
    await q.goto(empNumber);
    await essPage.waitForLoadState('networkidle');
    const del = await deleteRowContaining(essPage, weRows(), `QaCoU${s}`, '/work-experiences');
    report.check('1.1-D / 6.1 DELETE work-experiences 200', del?.status() === 200, `status=${del?.status()}`);
    report.check('1.1-D Work Experience hilang dari tabel', await isHiddenWithWait(weRows().filter({ hasText: `QaCoU${s}` }).first(), 10_000));

    report.step('Skills: validasi angka & batas');
    await open(() => q.openAddSkill(), q.skillSelect);
    await q.save();
    report.check('2.1 Skill kosong -> "Required"', await isVisibleWithWait(err(/^Required$/), 6_000));
    // Option 0 is the "-- Select --" placeholder; take the first real skill.
    await q.skillSelect.click();
    await essPage.getByRole('option').nth(1).click();
    report.check('2.1 Skill dipilih -> pesan "Required" hilang', await isHiddenWithWait(err(/^Required$/), 6_000));
    for (const v of ['abc', '-3']) {
      await q.yearsOfExperienceInput.fill(v);
      report.check(`2.2 / 8.4 Years of Experience "${v}" -> "Should be a number"`, await isVisibleWithWait(err('Should be a number'), 6_000));
    }
    await q.yearsOfExperienceInput.fill('100');
    report.check('3.2 / 8.4 Years of Experience 100 -> "Should be less than 100"', await isVisibleWithWait(err('Should be less than 100'), 6_000));
    await q.yearsOfExperienceInput.fill('99');
    report.check('3.2 Years of Experience 99 -> tanpa pesan batas', await isHiddenWithWait(err('Should be less than 100'), 6_000));
    const skPost = nextResponse(essPage, '/skills', 'POST');
    await q.save();
    const skResp = await skPost;
    report.check('1.1-C / 6.1 POST skills 200 (99 tahun = batas atas valid)', skResp?.status() === 200, `status=${skResp?.status()}`);

    const leftovers = ((await (await essPage.request.get(api('work-experiences'))).json()) as { data: Array<{ id: number }> }).data.map((r) => r.id);
    if (leftovers.length) await essPage.request.delete(api('work-experiences'), { data: { ids: leftovers } });
  } finally {
    await close();
  }
  report.print();
});
