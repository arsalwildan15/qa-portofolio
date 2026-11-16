/**
 * ================================================================================
 * TC-MYINFO-IMMIGRATION-01 — Verify An Employee Manages Their Own Immigration Records, With Required, Length, Date-Range, Stored-XSS And Double-Submit Checks
 * Modul    : My Info - Immigration (ESS, U111)
 * Kategori : Positive (+) 1.1-C 1.1-R 1.1-U 1.1-D 1.8 | Negative (-) 2.1 | Boundary (B) 3.1 3.4 |
 *            Edge (!) 4.2 | Security (S) 5.1-XSS-Stored | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-IMMIGRATION-01-Verify-Employee-Manages-Own-Immigration-Records-With-Validation.spec.ts
 * Path     : tests/my-info/records/
 * ================================================================================
 *
 * TUJUAN (sesi ESS baru, record milik sendiri; perilaku dibuktikan LIVE 16 Nov 2026):
 *   2.1 / 8.4  Save form kosong -> "Required" di Number, tanpa POST.
 *   3.1 / 8.4  Number 31 karakter -> "Should not exceed 30 characters"; Comments 251 karakter ->
 *              "Should not exceed 250 characters".
 *   3.4 / 8.4  Expiry Date sebelum Issued Date -> "Expiry date should be after issued date", tanpa POST.
 *   1.1-C / 6.1  Passport valid -> POST immigrations 200; 1.8 toast "Successfully Saved";
 *   1.1-R  baris tampil di tabel dgn Number tsb.
 *   5.1-XSS-Stored  Number = "<img src=x onerror=alert(1)>" (28 karakter) -> tersimpan, tampil sbg
 *              teks literal di tabel, tanpa dialog & tanpa elemen <img> baru.
 *   1.1-U / 6.1  Edit Number -> PUT 200 & tabel menampilkan nilai baru.
 *   4.2    Double-click Save pada record baru -> tepat 1 record (GET immigrations).
 *   1.1-D / 6.1  Hapus -> DELETE 200 & hilang dari tabel.
 *
 * HASIL 16 Nov 2026: 15/16 lolos. SENGAJA FAILED (R3): 4.2 double-click Save -> 2 record (tombol Save
 *   tidak dikunci selama request, akar sama dgn BG-427; Immigration tanpa pengaman keunikan) = BUG BG-431.
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/records/TC-MYINFO-IMMIGRATION-01-Verify-Employee-Manages-Own-Immigration-Records-With-Validation.spec.ts --project=chromium
 * ================================================================================
 */

import { expect } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';
import { ImmigrationPage } from '../../../src/pages';
import { fillDate } from '../../../src/utils/dateInput';
import { newEssSession, openMyInfoFromMenu, nextResponse, deleteRowContaining } from '../../../src/utils/myInfo';

const XSS = '<img src=x onerror=alert(1)>';

test('TC-MYINFO-IMMIGRATION-01: an employee manages their own immigration records with validation', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-MYINFO-IMMIGRATION-01', 'Employee Manages Own Immigration Records', env.baseURL, page);
  const s = `${Date.now() % 100000}`;

  report.step('Setup: akun ESS, buka My Info lalu tab Immigration');
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaMyInfoImm');
  const dialogs: string[] = [];
  essPage.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  let posts = 0;
  essPage.on('request', (r) => { if (r.url().includes('/immigrations') && r.method() === 'POST') posts++; });
  try {
    const empNumber = await openMyInfoFromMenu(essPage);
    const imm = new ImmigrationPage(essPage);
    const listApi = `/web/index.php/api/v2/pim/employees/${empNumber}/immigrations`;
    const openAdd = async () => {
      await imm.goto(empNumber);
      await essPage.waitForLoadState('networkidle');
      await imm.addButton.click();
      await imm.numberInput.waitFor({ state: 'visible', timeout: 15_000 });
    };
    const errorText = (t: string | RegExp) => imm.fieldErrors.filter({ hasText: t }).first();

    report.step('Validasi form');
    await openAdd();
    await imm.save();
    report.check('2.1 / 8.4 Form kosong -> "Required" di Number', await isVisibleWithWait(errorText(/^Required$/), 6_000));
    report.check('2.1 Form kosong -> tanpa POST', posts === 0, `post=${posts}`);
    await imm.numberInput.fill('N'.repeat(31));
    report.check('3.1 / 8.4 Number 31 karakter -> "Should not exceed 30 characters"', await isVisibleWithWait(errorText('Should not exceed 30 characters'), 6_000));
    await imm.commentsInput.fill('C'.repeat(251));
    report.check('3.1 / 8.4 Comments 251 karakter -> "Should not exceed 250 characters"', await isVisibleWithWait(errorText('Should not exceed 250 characters'), 6_000));
    await imm.numberInput.fill(`QaImm${s}`);
    await imm.commentsInput.fill('');
    await fillDate(imm.issuedDateInput, '2024-10-01', 'yyyy-dd-mm');
    await fillDate(imm.expiryDateInput, '2023-10-01', 'yyyy-dd-mm');
    await imm.numberInput.click();
    await imm.save();
    report.check('3.4 / 8.4 Expiry sebelum Issued -> "Expiry date should be after issued date"', await isVisibleWithWait(errorText('Expiry date should be after issued date'), 6_000));
    report.check('3.4 Expiry sebelum Issued -> tanpa POST', posts === 0, `post=${posts}`);

    report.step('Tambah passport valid');
    await fillDate(imm.expiryDateInput, '2030-10-01', 'yyyy-dd-mm');
    // Close the date picker and let the range error clear before saving (the open picker covers Save).
    await imm.numberInput.click();
    await isHiddenWithWait(errorText('Expiry date should be after issued date'), 6_000);
    const post = nextResponse(essPage, '/immigrations', 'POST');
    await imm.save();
    const resp = await post;
    report.check('1.1-C / 6.1 POST immigrations 200', resp?.status() === 200, `status=${resp?.status()}`);
    report.check('1.8 Toast "Successfully Saved"', await isVisibleWithWait(essPage.getByText('Successfully Saved'), 10_000));
    report.check('1.1-R Record tampil di tabel', await isVisibleWithWait(imm.tableRows.filter({ hasText: `QaImm${s}` }).first(), 10_000));

    report.step('Stored XSS di Number');
    await openAdd();
    await imm.numberInput.fill(XSS);
    const xssPost = nextResponse(essPage, '/immigrations', 'POST');
    await imm.save();
    const xssResp = await xssPost;
    await imm.goto(empNumber);
    await essPage.waitForLoadState('networkidle');
    const literal = await isVisibleWithWait(imm.tableRows.filter({ hasText: XSS }).first(), 10_000);
    const injected = await essPage.locator('.oxd-table-card img[src="x"]').count();
    report.check('5.1-XSS-Stored Payload di Number tampil sbg teks literal, tanpa dialog & tanpa <img> baru', xssResp?.status() === 200 && literal && injected === 0 && dialogs.length === 0, `post=${xssResp?.status()}, literal=${literal}, img=${injected}, dialog=${dialogs.length}`);

    report.step('Edit record');
    const row = imm.tableRows.filter({ hasText: `QaImm${s}` }).first();
    // The edit form loads the record with GET immigrations/<id> and overwrites the inputs when it
    // arrives; filling before that response is lost (first run: PUT 200 but old Number kept).
    const hydrated = essPage.waitForResponse((r) => /\/immigrations\/\d+/.test(r.url()) && r.request().method() === 'GET', { timeout: 20_000 }).catch(() => null);
    await row.locator('.bi-pencil-fill').click();
    await hydrated;
    await imm.numberInput.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(imm.numberInput).toHaveValue(`QaImm${s}`, { timeout: 10_000 }).catch(() => {});
    await imm.numberInput.fill(`QaImmU${s}`);
    const put = nextResponse(essPage, '/immigrations', 'PUT');
    await imm.save();
    const putResp = await put;
    report.check('1.1-U / 6.1 PUT immigrations 200', putResp?.status() === 200, `status=${putResp?.status()}`);
    report.check('1.1-U Tabel menampilkan Number baru', await isVisibleWithWait(imm.tableRows.filter({ hasText: `QaImmU${s}` }).first(), 10_000));

    report.step('Double submit');
    await openAdd();
    await imm.numberInput.fill(`QaImmD${s}`);
    await imm.saveButton.dblclick();
    await essPage.getByText('Successfully Saved').first().waitFor({ timeout: 15_000 }).catch(() => {});
    await essPage.waitForLoadState('networkidle');
    const rows = ((await (await essPage.request.get(listApi)).json()) as { data: Array<{ number: string }> }).data;
    const dbl = rows.filter((r) => r.number === `QaImmD${s}`).length;
    report.check('4.2 Double-click Save -> tepat 1 record', dbl === 1, `record=${dbl}`);

    report.step('Hapus record');
    await imm.goto(empNumber);
    await essPage.waitForLoadState('networkidle');
    const del = await deleteRowContaining(essPage, imm.tableRows, `QaImmU${s}`, '/immigrations');
    report.check('1.1-D / 6.1 DELETE immigrations 200', del?.status() === 200, `status=${del?.status()}`);
    report.check('1.1-D Record hilang dari tabel', await isHiddenWithWait(imm.tableRows.filter({ hasText: `QaImmU${s}` }).first(), 10_000));
  } finally {
    await close();
  }
  report.print();
});
