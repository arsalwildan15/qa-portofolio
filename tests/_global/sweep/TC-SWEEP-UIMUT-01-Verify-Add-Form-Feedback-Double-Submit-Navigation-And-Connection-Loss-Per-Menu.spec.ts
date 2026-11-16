/**
 * ================================================================================
 * TC-SWEEP-UIMUT-01 — Verify The Add Form Of Every Named-Entity Menu: Feedback, Message Consistency, Double Submit, Navigation And Connection Loss
 * Modul    : 19 menu entitas bernama (registry src/data/unitMutationRegistry.ts -> UI_ADD_FORMS)
 * Kategori : Positive (+) 1.8 | Negative (-) 2.1 2.3 | Boundary (B) 3.1 |
 *            Edge (!) 4.2 4.3 4.5 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SWEEP-UIMUT-01-Verify-Add-Form-Feedback-Double-Submit-Navigation-And-Connection-Loss-Per-Menu.spec.ts
 * Path     : tests/_global/sweep/
 * ================================================================================
 *
 * TUJUAN (per menu, label [U###]; semua record uji berprefix "QaUi" & dihapus di akhir):
 *   2.1 / 8.4  Save dgn nama kosong -> pesan persis "Required", tidak ada POST.
 *   3.1 / 8.4  Nama 300 karakter -> pesan "Should not exceed N characters" (format seragam).
 *   2.3 / 8.4  Nama yg sudah ada -> pesan persis "Already exists" (menu ber-nama unik).
 *   1.8        Save valid -> toast "Successfully Saved", keluar dari form, tepat 1 record.
 *   4.3        Browser Back lalu Forward setelah submit -> tidak membuat record kedua;
 *              tab baru dgn sesi yg sama -> daftar terbuka (tidak dilempar ke login);
 *              refresh saat submit berjalan -> paling banyak 1 record, form termuat normal.
 *   4.2        Double-click Save -> tepat 1 record (tidak ada double submission).
 *   4.5        Koneksi putus saat submit (POST di-abort) -> tetap di form, isian tidak hilang,
 *              tidak ada toast sukses, tidak ada record; ada/tidaknya pesan error dinilai
 *              sekali utk semua form (perilaku global aplikasi).
 *   4.5        Sesi hilang saat mengisi form (cookie dihapus) -> dilempar ke login, tidak ada record.
 *
 * Perilaku dibuktikan LIVE 16 Nov 2026 (probe): koneksi putus -> toast error generik "Unexpected
 * Error!", isian utuh; double-click Save di Reporting Methods/Locations/KPIs membuat 2 record (menu
 * lain tetap 1 krn server menolak nama duplikat) -> tombol Save tidak dikunci selama request
 * berjalan; create Pay Grade tidak menampilkan toast sukses (hanya "Info: No Records Found" dari
 * tabel currency halaman edit), sedangkan edit Pay Grade menampilkan "Successfully Updated".
 *
 * HASIL 16 Nov 2026: 188/192 lolos. SENGAJA FAILED (R3): 4.2 double-click Save -> 2 record di
 *   U019 Locations, U039 Reporting Methods, U066 KPIs (BUG BG-427, Medium); 1.8 create Pay Grade tanpa
 *   toast sukses (BUG BG-429, Low).
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sweep/TC-SWEEP-UIMUT-01-Verify-Add-Form-Feedback-Double-Submit-Navigation-And-Connection-Loss-Per-Menu.spec.ts --project=chromium
 * ================================================================================
 */

import { expect, type Page } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { MUTATION_UNITS, UI_ADD_FORMS, type MutationUnit } from '../../../src/data/unitMutationRegistry';
import { PAGE_UNITS } from '../../../src/data/unitRegistry';

const API = '/web/index.php/api/v2/';
const APP = '/web/index.php/';

type Row = Record<string, unknown>;
const listRows = async (page: Page, u: MutationUnit): Promise<Row[]> =>
  (((await (await page.request.get(`${API}${u.endpoint}?limit=0`)).json().catch(() => null)) as { data?: Row[] } | null)?.data ?? []);
const named = async (page: Page, u: MutationUnit, name: string) => (await listRows(page, u)).filter((r) => r[u.nameKey] === name);

test('TC-SWEEP-UIMUT-01: add form feedback, message consistency, double submit, navigation and connection loss per menu', async ({ page, context }, testInfo) => {
  testInfo.setTimeout(MUTATION_UNITS.length * 150_000);
  const report = new TestReport('TC-SWEEP-UIMUT-01', 'Add Form Feedback Double Submit Navigation Connection Loss', env.baseURL);
  const nameInput = page.locator('form .oxd-input-group').first().locator('input');
  const nameError = page.locator('form .oxd-input-group').first().locator('.oxd-input-field-error-message');
  const save = page.locator('form').getByRole('button', { name: 'Save' });
  const successToast = page.locator('.oxd-toast').filter({ hasText: 'Successfully Saved' });
  const silentOnAbort: string[] = [];
  const abortMessages = new Set<string>();
  const errorToast = page.locator('.oxd-toast--error');
  const tooLongMessages = new Set<string>();

  for (const u of MUTATION_UNITS) {
    const form = UI_ADD_FORMS[u.id];
    if (!form) throw new Error(`${u.id} has no entry in UI_ADD_FORMS`);
    const listUrl = PAGE_UNITS.find((p) => p.id === u.id)?.url as string;
    const tag = `[${u.id} ${u.path}]`;
    const s = `${Date.now() % 100000}`;
    const nm = (base: string) => `${base} ${s}`;
    const openForm = async () => {
      // A navigation still settling from the previous step (login redirect) aborts goto once.
      await page.goto(APP + form.addUrl).catch(async (e: Error) => {
        if (!/ERR_ABORTED/.test(e.message)) throw e;
        await page.waitForLoadState('networkidle');
        await page.goto(APP + form.addUrl);
      });
      await page.waitForLoadState('networkidle');
      await nameInput.waitFor({ timeout: 30_000 });
    };
    const fillValid = async (name: string) => {
      await nameInput.fill(name);
      if (form.fillRequired) await form.fillRequired(page);
      await expect(nameError).toHaveCount(0, { timeout: 10_000 }).catch(() => {});
    };
    const leftForm = () => !page.url().includes(form.addUrl) || /payGrade\/\d+/.test(page.url());

    // ------------------------------------------------------------ validation messages
    report.step(`${tag} pesan validasi`);
    await openForm();
    let posted = false;
    const onReq = (r: { method(): string; url(): string }) => { if (r.method() === 'POST' && r.url().includes(API + u.endpoint)) posted = true; };
    page.on('request', onReq);
    await save.click();
    const reqText = (await nameError.textContent({ timeout: 10_000 }).catch(() => null))?.trim();
    page.off('request', onReq);
    report.check(`${tag} 2.1 / 8.4 Nama kosong -> pesan "Required", tanpa POST`, reqText === 'Required' && !posted, `pesan=${JSON.stringify(reqText)}, post=${posted}`);

    await nameInput.fill(`QaUiLong${'X'.repeat(292)}`);
    await expect(nameError).toHaveText(/Should not exceed/, { timeout: 10_000 }).catch(() => {});
    const longText = (await nameError.textContent().catch(() => null))?.trim() ?? '';
    tooLongMessages.add(longText.replace(/\d+/, 'N'));
    report.check(`${tag} 3.1 / 8.4 Nama 300 karakter -> "Should not exceed N characters"`, /^Should not exceed \d+ characters$/.test(longText), `pesan=${JSON.stringify(longText)}`);

    if (u.uniqueName) {
      const existing = (await listRows(page, u)).find((r) => typeof r[u.nameKey] === 'string' && !String(r[u.nameKey]).startsWith('Qa'))?.[u.nameKey] as string | undefined;
      if (existing) {
        await nameInput.fill(existing);
        await expect(nameError).toHaveText(/Already exists/, { timeout: 10_000 }).catch(() => {});
        const dupText = (await nameError.textContent().catch(() => null))?.trim();
        report.check(`${tag} 2.3 / 8.4 Nama yg sudah ada ("${existing}") -> pesan "Already exists"`, dupText === 'Already exists', `pesan=${JSON.stringify(dupText)}`);
      } else report.finding(`${tag} 2.3 duplikat UI`, 'tidak ada record bawaan utk diuji');
    }

    // ------------------------------------------------------------ 1.8 valid save + 4.3 back/forward + new tab
    report.step(`${tag} simpan valid & navigasi`);
    await openForm();
    const okName = nm('QaUiOk');
    await fillValid(okName);
    await save.click();
    const toastSeen = await successToast.first().waitFor({ timeout: 20_000 }).then(() => true, () => false);
    await page.waitForURL((url) => !url.pathname.endsWith(form.addUrl), { timeout: 20_000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
    const okRows = await named(page, u, okName);
    report.check(`${tag} 1.8 Save valid -> toast "Successfully Saved", keluar dari form, 1 record`, toastSeen && leftForm() && okRows.length === 1, `toast=${toastSeen}, url=${page.url().replace(/.*index\.php\//, '')}, record=${okRows.length}`);

    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.goForward();
    await page.waitForLoadState('networkidle');
    const afterNav = await named(page, u, okName);
    report.check(`${tag} 4.3 Back lalu Forward setelah submit -> tidak ada record kedua`, afterNav.length === 1, `record=${afterNav.length}`);

    const tab = await context.newPage();
    await tab.goto(APP + listUrl);
    await tab.waitForLoadState('networkidle');
    const tabOk = !tab.url().includes('auth/login') && (await tab.locator('.oxd-table, .orangehrm-container').first().isVisible().catch(() => false));
    report.check(`${tag} 4.3 Tab baru dgn sesi yg sama -> daftar terbuka, tidak ke login`, tabOk, `url=${tab.url().replace(/.*index\.php\//, '')}`);
    await tab.close();

    // ------------------------------------------------------------ 4.2 double submit
    report.step(`${tag} double submit`);
    await openForm();
    const dblName = nm('QaUiDbl');
    await fillValid(dblName);
    await save.dblclick();
    await successToast.first().waitFor({ timeout: 20_000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
    const dblRows = await named(page, u, dblName);
    report.check(`${tag} 4.2 Double-click Save -> tepat 1 record`, dblRows.length === 1, `record=${dblRows.length}`);

    // ------------------------------------------------------------ 4.3 refresh while submitting
    await openForm();
    const refName = nm('QaUiRef');
    await fillValid(refName);
    await save.click();
    await page.reload();
    await page.waitForLoadState('networkidle');
    const formBack = await nameInput.isVisible().catch(() => false) || leftForm();
    const refRows = await named(page, u, refName);
    report.check(`${tag} 4.3 Refresh saat submit -> maks 1 record, halaman termuat normal`, refRows.length <= 1 && formBack, `record=${refRows.length}, url=${page.url().replace(/.*index\.php\//, '')}`);

    // ------------------------------------------------------------ 4.5 connection lost on submit
    report.step(`${tag} koneksi & sesi`);
    await openForm();
    const abName = nm('QaUiAbort');
    await fillValid(abName);
    await page.route((url) => url.pathname.endsWith(`/api/v2/${u.endpoint}`), (r) => (r.request().method() === 'POST' ? r.abort('internetdisconnected') : r.continue()));
    const failed = page.waitForEvent('requestfailed', { timeout: 20_000 }).catch(() => null);
    await save.click();
    await failed;
    const abortMsg = await errorToast.first().textContent({ timeout: 10_000 }).catch(() => null);
    if (abortMsg) abortMessages.add(abortMsg.replace(/×/g, '').trim());
    const kept = await nameInput.inputValue().catch(() => '');
    const okToast = await successToast.count();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    const abRows = await named(page, u, abName);
    report.check(`${tag} 4.5 Koneksi putus saat submit -> tetap di form, isian utuh, tanpa toast sukses, tanpa record`, page.url().includes(form.addUrl) && kept === abName && okToast === 0 && abRows.length === 0, `url=${page.url().replace(/.*index\.php\//, '')}, isian=${JSON.stringify(kept)}, toastSukses=${okToast}, record=${abRows.length}`);
    if (!abortMsg) silentOnAbort.push(u.id);

    // ------------------------------------------------------------ 4.5 session lost while filling
    await openForm();
    const sessName = nm('QaUiSess');
    await fillValid(sessName);
    const cookies = await context.cookies();
    await context.clearCookies();
    await save.click();
    const toLogin = await page.waitForURL(/auth\/login/, { timeout: 20_000 }).then(() => true, () => false);
    await page.waitForLoadState('networkidle');
    await context.addCookies(cookies);
    const sessRows = await named(page, u, sessName);
    report.check(`${tag} 4.5 Sesi hilang saat mengisi form -> dilempar ke login, tanpa record`, toLogin && sessRows.length === 0, `login=${toLogin}, record=${sessRows.length}`);

    // ------------------------------------------------------------ cleanup
    const ids = (await listRows(page, u)).filter((r) => String(r[u.nameKey] ?? '').startsWith('QaUi')).map((r) => r['id']);
    if (ids.length) await page.request.delete(API + u.endpoint, { data: { ids } });
  }

  report.step('Konsistensi lintas form');
  report.check(`8.4 Format pesan "terlalu panjang" seragam di ${MUTATION_UNITS.length} form`, tooLongMessages.size === 1, [...tooLongMessages].join(' | '));
  report.check(`4.5 Koneksi putus saat submit -> pengguna mendapat toast error (semua form)`, silentOnAbort.length === 0, silentOnAbort.length ? `tanpa toast error di: ${silentOnAbort.join(', ')}` : `pesan: ${[...abortMessages].join(' | ')}`);
  report.finding('4.5 Isi pesan koneksi putus', `${[...abortMessages].join(' | ')} (pesan generik, tidak menyebut koneksi/perlu coba lagi)`);
  report.print();
});
