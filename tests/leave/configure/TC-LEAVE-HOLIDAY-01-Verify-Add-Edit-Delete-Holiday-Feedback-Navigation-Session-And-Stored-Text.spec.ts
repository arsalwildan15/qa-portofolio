/**
 * ================================================================================
 * TC-LEAVE-HOLIDAY-01 — Verify Adding, Editing And Deleting A Holiday: Feedback, Double-Click Save, Refresh/Back, Lost Session, And Unusual Names Rendered Safely
 * Modul    : Leave > Configure > Holidays (U053)
 * Kategori : Positive (+) 1.2 1.4 1.8 | Negative (-) 2.3 | Edge (!) 4.1 4.2 4.3 4.5 4.8 |
 *            Security (S) 5.1-SQLi 5.1-XSS-Stored | Usability 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-HOLIDAY-01-Verify-Add-Edit-Delete-Holiday-Feedback-Navigation-Session-And-Stored-Text.spec.ts
 * Path     : tests/leave/configure/
 * ================================================================================
 *
 * LATAR (probe LIVE 17 Nov 2026): Add/Edit Holiday is a SEPARATE route (leave/saveHolidays[/<id>]),
 * not an inline modal -- its own Save self-redirects back to viewHolidayList after a delay, the
 * same pattern already handled elsewhere in this suite (ApplyLeavePage.goto() etc). The form has a
 * CLIENT-SIDE "Already exists" check that blocks Save (no network request at all) the moment a
 * SECOND holiday is added on a date that already has one -- regardless of name. This is a pure
 * client convenience check: TC-LEAVE-MUT-01 already proved the server itself has NO such
 * constraint (a duplicate name+date pair POSTed directly still succeeds, 200 twice). Every sub-test
 * below therefore uses its own distinct date to avoid tripping that unrelated client check, except
 * the "2.3" step, which exists specifically to prove the mismatch between the two layers.
 *
 * TUJUAN:
 *   1.2 / 1.8  Add Holiday, isi Name + Date -> Save -> toast "Success", baris tampil di daftar.
 *   1.1-U / 1.4  Edit nama & Length (Full Day -> Half Day) lewat ikon pensil -> tersimpan.
 *   1.1-D  Delete lewat ikon tempat sampah + "Yes, Delete" -> baris hilang.
 *   4.1 / 5.1-SQLi / 5.1-XSS-Stored  nama Arab/CJK, kutip SQL, HTML -> tersimpan & tampil sbg teks
 *          di daftar, tanpa elemen tersuntik / dialog.
 *   2.3    menambah holiday KE-2 pada tanggal yg SUDAH terisi -> form blokir (client-side
 *          "Already exists", TANPA request terkirim) -- TAPI body yg identik via API langsung
 *          tetap diterima (200), konsisten dgn BG yg sama di TC-LEAVE-MUT-01.
 *   4.2    klik ganda Save -> tepat satu holiday tersimpan (tanpa duplikat dari double-submit).
 *   4.3    ubah Name lalu refresh tanpa Save -> holiday itu tidak pernah tercipta.
 *   4.5    sesi berakhir lalu Save -> ditolak (401), dialihkan ke login, holiday tidak tercipta.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-456 (Low) -- klik ganda Save di Add Holiday
 *   mengirim 2 POST -> 2 holiday identik tersimpan (pola double-submit yg sama dgn
 *   BG-205/BG-427/BG-446 di modul lain). Finding (bukan bug baru, lihat BG yg sama di TC-LEAVE-MUT-01):
 *   form hanya mencegah duplikat tanggal lewat check client-side; server sendiri tidak menegakkan
 *   constraint apa pun, body identik yg dikirim langsung ke API tetap diterima 200.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/configure/TC-LEAVE-HOLIDAY-01-Verify-Add-Edit-Delete-Holiday-Feedback-Navigation-Session-And-Stored-Text.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { DATE_INPUT_SELECTOR, fillDate as fillDateInput } from '../../../src/utils/dateInput';
import { createHoliday, deleteHolidays, getJson } from '../../../src/utils/leaveData';

type HolidayRow = { id: number; name: string; lengthName?: string };

test('TC-LEAVE-HOLIDAY-01: add/edit/delete holiday - feedback, double-submit, navigation, session, unusual names', async ({ page }, testInfo) => {
  testInfo.setTimeout(240_000);
  // Expired-session redirect noise is its own app-wide bug (TC-XMOD-07); excluded here.
  const report = new TestReport('TC-LEAVE-HOLIDAY-01', 'Add Edit Delete Holiday Feedback Navigation Session Stored Text', env.baseURL, page, [/status of 401/, /reading 'response'/]);
  const dialogs: string[] = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  const s = `${Date.now() % 100000}`;
  const ids: number[] = [];
  // Add/Edit is a separate route whose own Save self-redirects after a delay; a goto() called
  // right after can race that and get ERR_ABORTED (same pattern as elsewhere in this suite).
  const goto = async () => {
    try {
      await page.goto('/web/index.php/leave/viewHolidayList');
    } catch (error) {
      if (error instanceof Error && error.message.includes('ERR_ABORTED')) {
        await page.waitForTimeout(1_500);
        await page.goto('/web/index.php/leave/viewHolidayList');
      } else {
        throw error;
      }
    }
    await page.waitForLoadState('networkidle');
  };
  const openAdd = async () => {
    await page.getByRole('button', { name: /Add/ }).first().click();
    await page.waitForURL(/saveHolidays/, { timeout: 10_000 }).catch(() => null);
    await page.waitForLoadState('networkidle');
  };
  const fillName = (name: string) => page.locator('.oxd-input-group', { has: page.getByText('Name', { exact: true }) }).locator('input').fill(name);
  const fillHolidayDate = (d: string) => fillDateInput(page.locator(DATE_INPUT_SELECTOR).first(), d, 'yyyy-dd-mm');
  const clickSave = () => page.getByRole('button', { name: 'Save' }).click();
  const toastText = () => page.locator('.oxd-toast').first().innerText({ timeout: 8_000 }).catch(() => '');
  const listRange = () => getJson<HolidayRow[]>(page.request, 'leave/holidays?fromDate=2026-09-01&toDate=2026-09-30');
  const rowFor = (name: string) => page.locator('.oxd-table-card').filter({ hasText: name });
  try {
    report.step('Add Holiday: isi valid, Save, feedback');
    await goto();
    await openAdd();
    const name1 = `QaHoliday${s}`;
    await fillName(name1);
    await fillHolidayDate('2026-01-09');
    await clickSave();
    const toast1 = await toastText();
    report.check('1.2 / 1.8 Add Holiday valid -> toast "Success" & tersimpan', /Success/.test(toast1) && (await listRange()).some((h) => h.name === name1), `toast=${toast1.replace(/\s+/g, ' ')}`);
    const id1 = (await listRange()).find((h) => h.name === name1)?.id;
    if (id1) ids.push(id1);
    await goto();
    report.check('1.2 Holiday baru tampil di daftar', (await rowFor(name1).count()) === 1);

    report.step('Edit: ubah nama & Length lewat ikon pensil');
    await rowFor(name1).locator('.bi-pencil-fill').click();
    await page.waitForURL(/saveHolidays/, { timeout: 10_000 }).catch(() => null);
    await page.waitForLoadState('networkidle');
    const name1b = `QaHolidayEdited${s}`;
    await fillName(name1b);
    await page.locator('.oxd-select-text').first().click();
    await page.getByRole('option', { name: 'Half Day', exact: true }).click();
    await clickSave();
    const toastEdit = await toastText();
    await goto();
    const editedRow = (await listRange()).find((h) => h.name === name1b);
    report.check('1.1-U / 1.4 Edit nama & Length -> toast sukses, nama baru tampil & Length jadi Half Day', /Success/.test(toastEdit) && editedRow?.lengthName === 'Half Day', `toast=${toastEdit.replace(/\s+/g, ' ')} lengthName=${editedRow?.lengthName}`);

    report.step('Nama tidak biasa & SQLi/XSS tampil aman');
    const unusual: Array<readonly [string, string, string]> = [
      ['4.1 Arab/CJK', `مرحبا 你好 ${s}`, '2026-05-09'],
      ['5.1-SQLi', `QaSQLi' OR '1'='1 ${s}`, '2026-06-09'],
      ['5.1-XSS-Stored', `<img src=x onerror=alert(1)> ${s}`, '2026-07-09'],
    ];
    for (const [label, name, date] of unusual) {
      await openAdd();
      await fillName(name);
      await fillHolidayDate(date);
      await clickSave();
      await toastText();
      await goto();
      const row = rowFor(name);
      report.check(`4.1 / 5.1-SQLi / 5.1-XSS-Stored Nama tersimpan & tampil sbg teks, tanpa elemen tersuntik/dialog (${label})`, (await row.count()) === 1 && (await page.locator('img[src="x"]').count()) === 0 && dialogs.length === 0, `dialog=${dialogs.length}`);
      const id = (await listRange()).find((h) => h.name === name)?.id;
      if (id) ids.push(id);
    }

    report.step('2.3 Holiday ke-2 pada tanggal yang sudah terisi');
    await openAdd();
    const busyDate = '2026-08-09';
    const firstOnDate = `QaHolidayBusy${s}`;
    await fillName(firstOnDate);
    await fillHolidayDate(busyDate);
    await clickSave();
    await toastText();
    const idBusy = (await listRange()).find((h) => h.name === firstOnDate)?.id;
    if (idBusy) ids.push(idBusy);
    await goto();
    await openAdd();
    const secondOnDate = `QaHolidayBusy2${s}`;
    await fillName(secondOnDate);
    await fillHolidayDate(busyDate);
    let postFired = false;
    const onReq = (r: { url(): string; method(): string }) => { if (r.url().includes('/api/v2/leave/holidays') && r.method() === 'POST') postFired = true; };
    page.on('request', onReq);
    await clickSave();
    await page.waitForTimeout(1500);
    page.off('request', onReq);
    const clientErr = (await page.locator('.oxd-input-field-error-message').allInnerTexts()).join(' | ');
    report.check('2.3 / 8.4 Form holiday ke-2 pada tanggal terisi -> diblokir CLIENT-SIDE dgn pesan jelas ("Already exists"), tanpa request terkirim', !postFired && /Already exists/.test(clientErr), `request=${postFired} err=${clientErr}`);
    const apiDup = await createHoliday(page.request, secondOnDate, busyDate).catch(() => undefined);
    if (apiDup) ids.push(apiDup);
    report.check('5.9 Body identik dikirim LANGSUNG ke API -> 200, diterima (server tidak menegakkan constraint yg sama; bug sudah tercatat di TC-LEAVE-MUT-01)', typeof apiDup === 'number', `id=${apiDup}`);

    report.step('4.2 Klik ganda Save');
    await goto();
    await openAdd();
    const name2 = `QaHolidayDbl${s}`;
    await fillName(name2);
    await fillHolidayDate('2026-02-09');
    let postCount = 0;
    const onResp = (r: { url(): string; method(): string }) => { if (r.url().includes('/api/v2/leave/holidays') && r.method() === 'POST') postCount += 1; };
    page.on('request', onResp);
    await page.getByRole('button', { name: 'Save' }).dblclick();
    await page.waitForTimeout(2500);
    page.off('request', onResp);
    await goto();
    const dblRows = (await listRange()).filter((h) => h.name === name2);
    for (const h of dblRows) ids.push(h.id);
    report.check('4.2 Klik ganda Save -> tepat satu holiday tersimpan (tanpa duplikat double-submit)', dblRows.length === 1, `POST terkirim=${postCount} baris=${dblRows.length}`);

    report.step('4.3 Refresh tanpa Save');
    await openAdd();
    await fillName('QaTidakDisimpan');
    await fillHolidayDate('2026-03-09');
    await goto();
    report.check('4.3 Refresh dgn Name belum disimpan -> holiday "QaTidakDisimpan" tidak pernah tercipta', (await rowFor('QaTidakDisimpan').count()) === 0);

    report.step('4.5 Sesi berakhir sebelum Save');
    await openAdd();
    const name3 = `QaHolidaySess${s}`;
    await fillName(name3);
    await fillHolidayDate('2026-04-09');
    const cookies = await page.context().cookies();
    await page.context().clearCookies();
    await clickSave();
    const toLogin = await page.waitForURL(/auth\/login/, { timeout: 20_000 }).then(() => true, () => false);
    await page.context().addCookies(cookies);
    const notCreated = (await listRange()).every((h) => h.name !== name3);
    report.check('4.5 Sesi berakhir lalu Save -> dialihkan ke login, holiday tidak tercipta', toLogin && notCreated, `login=${toLogin}`);

    report.step('1.1-D Delete lewat ikon tempat sampah');
    await goto();
    await rowFor(name1b).locator('.bi-trash').click();
    await page.getByRole('button', { name: /Yes, Delete/ }).click();
    const toastDel = await toastText();
    await goto();
    const stillThere = (await rowFor(name1b).count()) === 1;
    report.check('1.1-D Hapus holiday (tempat sampah -> Yes, Delete) -> toast sukses & baris hilang', /Success/.test(toastDel) && !stillThere, `toast=${toastDel.replace(/\s+/g, ' ')}`);
  } finally {
    await deleteHolidays(page.request, ids);
  }
  report.print();
});
