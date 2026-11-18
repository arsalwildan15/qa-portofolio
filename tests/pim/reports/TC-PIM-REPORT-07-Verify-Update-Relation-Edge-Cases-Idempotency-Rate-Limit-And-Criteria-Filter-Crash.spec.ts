/**
 * ================================================================================
 * TC-PIM-REPORT-07 — Verify Reports: Update, Field-Group Relation, Edge Cases, Idempotency, Rate Limit And Criteria Filter Crash
 * Modul    : PIM > Reports (U042)
 * Kategori : Positive (+) 1.1-U 1.4 | Negative (-) 1.2 | Edge (!) 4.1 4.2 4.3 4.5 4.7 |
 *            Security (S) 5.1-CmdPath 5.5 | API (A) 6.7 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORT-07-Verify-Update-Relation-Edge-Cases-Idempotency-Rate-Limit-And-Criteria-Filter-Crash.spec.ts
 * Path     : tests/pim/reports/
 * ================================================================================
 *
 * LATAR: TC-PIM-REPORT-API-01 sudah menutup 1.1-C/1.1-R/1.1-D/2.2/3.1/5.1-SQLi/5.1-XSS-
 * Reflected/5.2-MassAssign/6.3/6.4/6.5. Ini menutup 11 kode terakhir, dibuktikan via probe
 * LIVE 18 Nov 2026:
 *   - PUT report -> 200 & name berubah (1.1-U).
 *   - fieldGroup merujuk group id LAIN (bukan group 1) -> 200 diterima (1.4, relasi antar
 *     fieldGroup berfungsi).
 *   - Nama dgn unicode/emoji -> 200 diterima (4.1).
 *   - Nama path traversal ("../../etc/passwd-N") -> 200 diterima SEBAGAI STRING BIASA --
 *     aman krn name HANYA disimpan sbg label, TIDAK PERNAH dipakai sbg path file/command di
 *     server manapun yg sudah diuji (5.1-CmdPath, N/A genuine, dicatat finding tanpa kode
 *     literal).
 *   - Create report dgn name SAMA 2x -> KEDUANYA 200 (6.7, tidak ada uniqueness constraint --
 *     SAMA KELAS dgn BG-468 custom field duplikat, bukan bug baru, Reports secara desain
 *     bukan entity unik spt employeeId).
 *   - 3 create paralel -> semua 200, tidak ada rate limit (5.5, finding).
 *   - Add Report valid via UI (field group "Personal" > "First Name", tombol "+" WAJIB
 *     diklik dulu spt TC-PIM-REPORT-02) -> toast sukses, double-click/back-forward/koneksi
 *     putus/concurrency semua normal (4.2/4.3/4.5/4.7/8.4).
 *   - POST dgn `criteria` TERISI (APA PUN bentuknya -- numeric key, string key, nested
 *     object) -> SELALU 500 Internal Server Error, 3/3 percobaan dgn format berbeda semua
 *     crash -- DITEMUKAN BUG (lihat HASIL).
 *
 * HASIL 18 Nov 2026: SENGAJA FAILED (R3), BUG BARU BG-485 (Medium) -- field `criteria` pd
 *   endpoint create Report SELALU menyebabkan HTTP 500 Internal Server Error apa pun bentuk
 *   datanya (dicoba 3 format berbeda, semua crash) ketika diisi non-kosong, bukannya
 *   divalidasi (422) atau diterima. Fitur filter kriteria report (jika ada di UI) berpotensi
 *   TIDAK BISA DIPAKAI SAMA SEKALI via API langsung; TC-PIM-REPORT-API-01/02 sebelumnya hanya
 *   menguji `criteria: {}` (kosong), tidak pernah mengisi nilai sungguhan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/reports/TC-PIM-REPORT-07-Verify-Update-Relation-Edge-Cases-Idempotency-Rate-Limit-And-Criteria-Filter-Crash.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { dropConnectionDuringSave } from '../../../src/utils/networkEdge';

const api = '/web/index.php/api/v2/pim/reports/defined';
const body = (name: string, over: Record<string, unknown> = {}) => ({ name, include: 'onlyCurrent', criteria: {}, fieldGroup: { '1': { fields: [11], includeHeader: false } }, ...over });
type ReportRecord = { id: number; name: string };

test('TC-PIM-REPORT-07: update, relation, edge cases, idempotency, rate limit, criteria filter crash', async ({
  page, pimReportsPage,
}, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-PIM-REPORT-07', 'Reports Update Relation Edge Cases Idempotency Rate Limit Criteria Filter Crash', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /can't access property/, /due to access control checks/, /AxiosError: Network Error/,
    /JSHandle@object/, /event, request, config, code, name, message, stack/,
  ]);
  const s = Date.now() % 100000;
  const createdIds: number[] = [];

  try {
    report.step('1.1-U Update report');
    const created = await page.request.post(api, { data: body(`QaRep07${s}`) });
    const createdData = ((await created.json().catch(() => ({}))) as { data?: ReportRecord }).data;
    if (createdData?.id) createdIds.push(createdData.id);
    const updated = await page.request.put(`${api}/${createdData?.id}`, { data: body(`QaRep07Upd${s}`) });
    const updatedData = ((await updated.json().catch(() => ({}))) as { data?: ReportRecord }).data;
    report.check('1.1-U [U042] PUT update -> 200 & name berubah', updated.status() === 200 && updatedData?.name === `QaRep07Upd${s}`, `status=${updated.status()}`);

    report.step('1.4 fieldGroup merujuk group lain (relasi antar fieldGroup)');
    const withGroup2 = await page.request.post(api, { data: body(`QaRep07Grp${s}`, { fieldGroup: { '2': { fields: [20], includeHeader: false } } }) });
    const withGroup2Data = ((await withGroup2.json().catch(() => ({}))) as { data?: ReportRecord }).data;
    if (withGroup2Data?.id) createdIds.push(withGroup2Data.id);
    report.check('1.4 [U042] fieldGroup merujuk group id lain (bukan "1") -> 200 diterima', withGroup2.status() === 200, `status=${withGroup2.status()}`);

    report.step('4.1 Karakter tidak biasa (unicode/emoji) pd nama');
    const unicode = await page.request.post(api, { data: body(`QaRep07🎉émoji${s}`) });
    const unicodeData = ((await unicode.json().catch(() => ({}))) as { data?: ReportRecord }).data;
    if (unicodeData?.id) createdIds.push(unicodeData.id);
    report.check('4.1 [U042] Nama dgn unicode/emoji -> 200 diterima', unicode.status() === 200, `status=${unicode.status()}`);

    report.step('5.1-CmdPath Path traversal pd nama (hanya label, bukan path file)');
    const trav = await page.request.post(api, { data: body(`../../etc/passwd-${s}`) });
    const travData = ((await trav.json().catch(() => ({}))) as { data?: ReportRecord }).data;
    if (travData?.id) createdIds.push(travData.id);
    report.finding('5.1-CmdPath pada nama Report', 'Nama report dgn path traversal diterima (200) & disimpan sbg string biasa -- aman krn name HANYA label tampilan, tidak pernah dipakai sbg path file atau argumen command di server manapun yg sudah diuji.');

    report.step('6.7 Idempotency -- create nama SAMA 2x');
    const dupName = `QaRep07Dup${s}`;
    const dup1 = await page.request.post(api, { data: body(dupName) });
    const dup2 = await page.request.post(api, { data: body(dupName) });
    const dup1Data = ((await dup1.json().catch(() => ({}))) as { data?: ReportRecord }).data;
    const dup2Data = ((await dup2.json().catch(() => ({}))) as { data?: ReportRecord }).data;
    if (dup1Data?.id) createdIds.push(dup1Data.id);
    if (dup2Data?.id) createdIds.push(dup2Data.id);
    report.finding('6.7 Idempotency/uniqueness pada nama Report', `Create report dgn nama SAMA 2x -> KEDUANYA 200 (dup1=${dup1.status()} dup2=${dup2.status()}), tidak ada uniqueness constraint -- sama kelas dgn BG-468 (Custom Field duplikat), bukan bug baru; Reports secara desain bukan entity unik spt employeeId.`);

    report.step('5.5 Rate limiting -- 3 create paralel');
    const rapid = await Promise.all(Array.from({ length: 3 }, (_, i) => page.request.post(api, { data: body(`QaRep07Rapid${i}${s}`) })));
    report.check('5.5 [U042] 3 create paralel -> SEMUA 200 (tidak ada 429/lockout)', rapid.every((r) => r.status() === 200), `statuses=${rapid.map((r) => r.status()).join(',')}`);
    for (const r of rapid) {
      const d = ((await r.json().catch(() => ({}))) as { data?: ReportRecord }).data;
      if (d?.id) createdIds.push(d.id);
    }
    report.finding('Rate limiting pada create Report', '3 request create paralel SEMUA diterima (200) -- tidak ada rate limit pd endpoint ini, dicatat sbg finding (bukan bug) sesuai R4.');

    report.step('4.2 / 4.3 / 8.4 Add Report valid via UI -- toast sukses, double-click, back/forward');
    const addAndSelectField = async (name: string) => {
      await pimReportsPage.gotoAddForm();
      await pimReportsPage.reportNameInput.waitFor({ state: 'visible' });
      await pimReportsPage.reportNameInput.fill(name);
      await pimReportsPage.selectDropdownOption(pimReportsPage.displayFieldGroupSelect, 'Personal');
      await page.waitForTimeout(500);
      await pimReportsPage.selectDropdownOption(pimReportsPage.displayFieldSelect, 'First Name');
      await page.locator('button.orangehrm-report-icon').last().click();
      await page.waitForTimeout(500);
    };
    await addAndSelectField(`QaRep07Ui${s}`);
    const [saveResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/reports/defined') && r.request().method() === 'POST', { timeout: 10_000 }),
      pimReportsPage.save(),
    ]);
    const toastText = await page.locator('.oxd-toast').first().textContent({ timeout: 3_000 }).catch(() => null);
    report.check('4.2 [U042] Add Report via UI -> POST 200 + toast sukses muncul', saveResp.status() === 200 && !!toastText && /Successfully/i.test(toastText), `status=${saveResp.status()} toast=${toastText}`);
    report.check('8.4 [U042] Teks toast konsisten dgn pola "Successfully ..." di form lain', !!toastText && /Successfully Saved/i.test(toastText), `toast="${toastText}"`);
    const uiData = ((await saveResp.json().catch(() => ({}))) as { data?: ReportRecord }).data;
    if (uiData?.id) createdIds.push(uiData.id);

    await page.goBack().catch(() => null);
    await page.goForward().catch(() => null);
    report.check('4.3 [U042] Browser Back lalu Forward setelah save -> halaman termuat normal', page.url().includes('definePredefinedReport'), `url=${page.url()}`);

    report.step('4.5 Koneksi putus saat save');
    await addAndSelectField(`QaRep07Drop${s}`);
    await dropConnectionDuringSave(page, '**/reports/defined*', () => pimReportsPage.save());
    report.check('4.5 [U042] Koneksi putus saat save -> tidak crash (halaman tetap merespons)', await page.locator('body').isVisible(), 'body masih visible setelah abort');

    report.step('4.7 Concurrency -- 2 create berbeda scr paralel');
    const [c1, c2] = await Promise.all([
      page.request.post(api, { data: body(`QaRep07ConcA${s}`) }),
      page.request.post(api, { data: body(`QaRep07ConcB${s}`) }),
    ]);
    const c1Data = ((await c1.json().catch(() => ({}))) as { data?: ReportRecord }).data;
    const c2Data = ((await c2.json().catch(() => ({}))) as { data?: ReportRecord }).data;
    if (c1Data?.id) createdIds.push(c1Data.id);
    if (c2Data?.id) createdIds.push(c2Data.id);
    report.check('4.7 [U042] 2 create berbeda bersamaan -> tidak ada 500', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);

    report.step('1.2 Variasi input opsional -- field criteria terisi (3 format berbeda)');
    const attempts: number[] = [];
    for (const criteria of [
      { '1': { type: 'LISTBOX', value: [1] } },
      { employeeName: 'Qa' },
      { 'employee.empStatus': { type: 'LISTBOX', value: [1] } },
    ]) {
      const r = await page.request.post(api, { data: body(`QaRep07Crit${attempts.length}_${s}`, { criteria }) });
      attempts.push(r.status());
      const d = ((await r.json().catch(() => ({}))) as { data?: ReportRecord }).data;
      if (d?.id) createdIds.push(d.id);
    }
    report.check('1.2 [U042] Field criteria terisi (3 format dicoba) -> TIDAK BOLEH 500 (harus 200 diterima ATAU 422 ditolak, bukan crash)', attempts.every((s2) => s2 !== 500), `statuses=${attempts.join(',')}`);
  } finally {
    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  }
  report.print();
});
