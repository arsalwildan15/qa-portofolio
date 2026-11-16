/**
 * ================================================================================
 * TC-MAINT-PURGE-EMP-01 — Verify Purging A Past Employee: Only Past Employees Are Offered, Cancel Keeps Them, Purge Removes Them, And The API Enforces The Rules
 * Modul    : Maintenance > Purge Records > Employee Records (U010)
 * Kategori : Positive (+) 1.1-D 1.1-R 1.3 1.8 | Negative (-) 2.5 2.6 | Boundary (B) 3.6 |
 *            Edge (!) 4.1 4.4 4.6 4.8 | Security (S) 5.1-SQLi 5.1-XSS-Reflected 5.2-BFLAC 5.9 |
 *            API (A) 6.2 6.3 6.4 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MAINT-PURGE-EMP-01-Verify-Purging-A-Past-Employee-UI-And-API.spec.ts
 * Path     : tests/maintenance/purge-records/
 * ================================================================================
 *
 * KESELAMATAN DATA: purge tidak bisa dibatalkan, jadi TC hanya mem-purge karyawan yang ia buat dan
 * terminate sendiri (createPastEmployee). Karyawan aktif pembanding dihapus lewat PIM di akhir.
 *
 * TUJUAN (alur & kontrak dibuktikan LIVE 17 Nov 2026):
 *   UI   1.3 / 5.9  autocomplete "Past Employee" menawarkan karyawan uji (berlabel "(Past Employee)")
 *                  dan TIDAK menawarkan karyawan aktif.
 *        3.6 / 4.6 nama yang tidak ada -> tidak ada opsi.
 *        4.1 / 5.1-SQLi / 5.1-XSS-Reflected  teks Arab, "' OR 1=1 --", <img onerror> di kotak cari
 *                  -> tanpa error, tanpa dialog, tanpa elemen tersuntik.
 *        1.1-R     Search -> tabel "Selected Employee" memuat nama karyawan uji.
 *        4.8       dialog konfirmasi "cannot be undone"; "No, Cancel" -> karyawan masih ada.
 *        1.1-D / 1.8  "Yes, Purge" -> DELETE maintenance/purge 200, toast "Successfully Purged",
 *                  data karyawan hilang (GET personal-details -> 422).
 *   API  6.2       respons purge = {data:{purged:{empNumber}}}.
 *        5.9       purge karyawan AKTIF -> 400 "Employee Cannot Be Purged" & karyawan tetap ada.
 *        6.5 / 2.6 body {}, empNumber null, "abc", 999999 -> 422.
 *        2.5       purge karyawan yang sudah di-purge -> 4xx.
 *        4.4       2 purge paralel atas karyawan yang sama -> tepat satu 200.
 *        6.3       PATCH & GET -> 405.    6.4 tanpa sesi -> 401.
 *        5.2-BFLAC sesi ESS -> 403 & karyawan tetap ada.
 *
 * RUN COMMAND:
 *   npx playwright test tests/maintenance/purge-records/TC-MAINT-PURGE-EMP-01-Verify-Purging-A-Past-Employee-UI-And-API.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession } from '../../../src/utils/myInfo';
import { createEmployee, createPastEmployee, openMaintenance, suggestions, selectedEmployeeText } from '../../../src/utils/maintenanceData';

const API = '/web/index.php/api/v2/';
const PURGE = `${API}maintenance/purge`;
const is4xx = (n: number) => n >= 400 && n < 500;

test('TC-MAINT-PURGE-EMP-01: purging a past employee - UI and API rules', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-MAINT-PURGE-EMP-01', 'Purging A Past Employee UI And API', env.baseURL, page);
  const s = `${Date.now() % 100000}`;
  const exists = async (emp: number) => (await page.request.get(`${API}pim/employees/${emp}/personal-details`)).status() === 200;
  const dialogs: string[] = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });

  const past = await createPastEmployee(page.request, 'QaPurgeUi', `P${s}`);
  const active = await createEmployee(page.request, 'QaPurgeUi', `A${s}`);
  try {
    report.step('UI: buka halaman (gerbang password) & autocomplete');
    const gated = await openMaintenance(page, 'purgeEmployee');
    report.finding('Gerbang "Administrator Access"', gated ? 'diminta & dilewati dgn password Admin' : 'tidak diminta pada sesi ini');
    const opts = await suggestions(page, `QaPurgeUi`);
    report.check('1.3 / 1.6 / 5.9 Autocomplete menawarkan karyawan uji yang sudah di-terminate, berlabel "(Past Employee)"', opts.some((o) => o.includes(`P${s}`) && o.includes('(Past Employee)')), opts.join(' | ') || '(kosong)');
    report.check('1.3 / 5.9 Autocomplete TIDAK menawarkan karyawan aktif', !opts.some((o) => o.includes(`A${s}`)), opts.join(' | '));
    const none = await suggestions(page, `QaTidakAda${s}zz`);
    report.check('3.6 / 4.6 Nama yang tidak ada -> tanpa opsi karyawan', !none.some((o) => /QaTidakAda/.test(o)), none.join(' | ') || '(kosong)');
    for (const [label, q] of [['4.1 Teks Arab', 'مرحبا'], ['5.1-SQLi', "' OR 1=1 --"], ['5.1-XSS-Reflected', '<img src=x onerror=alert(1)>']] as const) {
      const o = await suggestions(page, q);
      const injected = await page.locator('img[src="x"]').count();
      report.check(`4.1 / 5.1-SQLi / 5.1-XSS-Reflected Input tidak biasa (${label}) di kotak cari -> tanpa error, dialog, atau elemen tersuntik`, injected === 0 && dialogs.length === 0, `opsi=${o.length}, img=${injected}, dialog=${dialogs.length}`);
    }

    report.step('UI: pilih, Search, Cancel, lalu Purge');
    await suggestions(page, `QaPurgeUi P${s}`);
    await page.getByRole('option').filter({ hasText: `P${s}` }).first().click();
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForLoadState('networkidle');
    const selected = await selectedEmployeeText(page);
    report.check('1.1-R Search -> tabel "Selected Employee" memuat karyawan uji', selected.includes('Selected Employee') && selected.includes(`P${s}`), selected.slice(0, 160));
    await page.getByRole('button', { name: 'Purge' }).click();
    const dialogText = (await page.locator('.oxd-dialog-sheet').innerText().catch(() => '')).replace(/\s+/g, ' ');
    report.check('4.8 Dialog konfirmasi menyatakan purge tidak bisa dibatalkan', /cannot be undone/i.test(dialogText), dialogText.slice(0, 120));
    await page.getByRole('button', { name: 'No, Cancel' }).click();
    report.check('4.8 "No, Cancel" -> karyawan masih ada', await exists(past), `ada=${await exists(past)}`);
    await page.getByRole('button', { name: 'Purge' }).click();
    const del = page.waitForResponse((r) => r.url().includes('/maintenance/purge') && r.request().method() === 'DELETE', { timeout: 20_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Yes, Purge' }).click();
    const delResp = await del;
    const delBody = (await delResp?.json().catch(() => null)) as { data?: { purged?: { empNumber?: number } } } | null;
    report.check('1.1-D DELETE maintenance/purge -> 200', delResp?.status() === 200, `status=${delResp?.status()}`);
    report.check('6.2 Respons purge = {data:{purged:{empNumber}}} utk karyawan uji', delBody?.data?.purged?.empNumber === past, JSON.stringify(delBody));
    report.check('1.8 Toast "Successfully Purged"', await page.locator('.oxd-toast', { hasText: 'Successfully Purged' }).first().waitFor({ timeout: 10_000 }).then(() => true, () => false));
    const gone = await page.request.get(`${API}pim/employees/${past}/personal-details`);
    report.check('1.1-D Data karyawan hilang (GET personal-details -> 422)', gone.status() === 422, `status=${gone.status()}`);

    report.step('API: aturan & validasi');
    const again = await page.request.delete(PURGE, { data: { empNumber: past } });
    report.check('2.5 Purge karyawan yang sudah di-purge -> 4xx', is4xx(again.status()), `status=${again.status()}`);
    const act = await page.request.delete(PURGE, { data: { empNumber: active } });
    report.check('5.9 Purge karyawan AKTIF -> 400 & karyawan tetap ada', act.status() === 400 && await exists(active), `status=${act.status()} ${(await act.text()).slice(0, 80)}`);
    for (const [label, body] of [['body {}', {}], ['empNumber null', { empNumber: null }], ['empNumber "abc"', { empNumber: 'abc' }], ['empNumber 999999', { empNumber: 999999 }]] as const) {
      const r = await page.request.delete(PURGE, { data: body });
      report.check(`6.5 / 2.6 ${label} -> 422`, r.status() === 422, `status=${r.status()}`);
    }
    const twin = await createPastEmployee(page.request, 'QaPurgeUi', `T${s}`);
    const pair = await Promise.all([page.request.delete(PURGE, { data: { empNumber: twin } }), page.request.delete(PURGE, { data: { empNumber: twin } })]);
    report.check('4.4 Dua purge paralel atas karyawan yang sama -> tepat satu 200', pair.filter((r) => r.status() === 200).length === 1, pair.map((r) => r.status()).join(','));
    const [patch, get] = await Promise.all([page.request.patch(PURGE, { data: {} }), page.request.get(PURGE)]);
    report.check('6.3 PATCH & GET -> 405', patch.status() === 405 && get.status() === 405, `PATCH=${patch.status()}, GET=${get.status()}`);
    const anon = await request.newContext({ baseURL: env.baseURL });
    const noAuth = await anon.delete(PURGE, { data: { empNumber: active } });
    await anon.dispose();
    report.check('6.4 Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);

    report.step('API: ESS');
    const essPast = await createPastEmployee(page.request, 'QaPurgeUi', `S${s}`);
    const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaPurgeEss');
    try {
      const ess = await essPage.request.delete(PURGE, { data: { empNumber: essPast } });
      report.check('5.2-BFLAC Sesi ESS memanggil purge -> 403 & karyawan tetap ada', ess.status() === 403 && (await page.request.get(`${API}pim/employees/${essPast}/personal-details`)).status() === 200, `status=${ess.status()}`);
    } finally {
      await close();
    }
    await page.request.delete(PURGE, { data: { empNumber: essPast } });
  } finally {
    await page.request.delete(`${API}pim/employees`, { data: { ids: [active] } });
  }
  report.print();
});
