/**
 * ================================================================================
 * TC-PIM-DATAIMPORT-07 — Verify CSV Import: Optional Column, Feedback, Navigation, Connection Loss, Concurrency, Idempotency, Rate Limit And CSRF
 * Modul    : PIM > Configuration > Data Import (U038)
 * Kategori : Positive (+) 1.2 1.8 | Edge (!) 4.2 4.3 4.5 4.7 4.8 | Security (S) 5.4 5.5 |
 *            API (A) 6.7 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DATAIMPORT-07-Verify-Feedback-Navigation-Connection-Loss-Concurrency-Idempotency-Rate-Limit-And-CSRF.spec.ts
 * Path     : tests/pim/configuration/data-import/
 * ================================================================================
 *
 * LATAR: TC-PIM-DATAIMPORT-API-01 sudah menutup 1.1-C/2.1/3.3/5.1-CmdPath/5.1-SQLi/5.2-
 * MassAssign/5.3-ContentType/5.3-DoubleExt/5.3-Filename/5.9-FormulaInjection/6.5. Ini menutup
 * 10 kode terakhir, dibuktikan via probe LIVE 18 Nov 2026:
 *   - middle_name (kolom opsional) diisi vs kosong -> 200 keduanya (1.2).
 *   - Import file via UI -> feedback muncul sbg PANEL HASIL INLINE (teks halaman berubah
 *     signifikan, "success"/"failed" count dirender di tempat), BUKAN `.oxd-toast` spt form
 *     lain -- pola feedback BERBEDA, dicatat sbg finding (8.4), tetap PASS utk 1.8 (feedback
 *     tetap ada, cuma mekanismenya beda, bukan ketidakhadiran feedback).
 *   - Browser Back lalu Forward setelah upload -> halaman termuat normal.
 *   - Koneksi putus saat upload -> tidak crash.
 *   - 2 import CSV BERBEDA scr paralel -> tidak ada 500.
 *   - 3 import paralel -> SEMUA 200, tidak ada rate limit (finding, bukan bug, R4).
 *   - Origin palsu vs sendiri -> status identik (5.4, konsisten TC-PIM-CSRF-01).
 *   - Import CSV YANG SAMA 2x (retry network, mis. koneksi putus pasca-sukses) -> DITEMUKAN
 *     BUG (lihat HASIL).
 *
 * HASIL 18 Nov 2026: SENGAJA FAILED (R3), BUG BARU BG-484 (Medium) -- import CSV identik 2x
 *   membuat 2 EMPLOYEE DUPLIKAT dgn nama sama (empNumber berbeda), TIDAK ADA deteksi
 *   duplikat/idempotency key -- retry network pasca-sukses (pola umum di web form) akan
 *   menghasilkan data karyawan ganda yang harus dibersihkan manual.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/data-import/TC-PIM-DATAIMPORT-07-Verify-Feedback-Navigation-Connection-Loss-Concurrency-Idempotency-Rate-Limit-And-CSRF.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { dropConnectionDuringSave } from '../../../../src/utils/networkEdge';

const HEADER = "first_name,middle_name,last_name,employee_id,other_id,driver's_license_no,license_expiry_date,gender,marital_status,nationality,date_of_birth,address_street_1,address_street_2,city,state/province,zip/postal_code,country,home_telephone,mobile,work_telephone,work_email,other_email";
const row = (fn: string, ln: string, mn = '') => `${fn},${mn},${ln},,,,,,,,,,,,,,,,,,,`;
const api = '/web/index.php/api/v2/pim/csv-import';
const b64 = (s: string) => Buffer.from(s).toString('base64');
const body = (content: string, name = 'import.csv', type = 'text/csv') => ({ attachment: { name, type, size: content.length, base64: b64(content) } });
type ImportResult = { meta: { total: number; success: number; failed: number } };

test('TC-PIM-DATAIMPORT-07: optional column, feedback, navigation, connection loss, concurrency, idempotency, rate limit, CSRF', async ({
  page, dataImportPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PIM-DATAIMPORT-07', 'CSV Import Optional Column Feedback Navigation Connection Loss Concurrency Idempotency Rate Limit CSRF', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /can't access property/, /due to access control checks/, /AxiosError: Network Error/,
    /JSHandle@object/, /event, request, config, code, name, message, stack/,
  ]);
  const s = Date.now() % 100000;
  const importedNames: string[] = [];
  const purge = async () => {
    for (const name of importedNames) {
      const found = ((await (await page.request.get(`/web/index.php/api/v2/pim/employees?nameOrId=${name}&limit=10`)).json().catch(() => ({ data: [] }))) as { data: Array<{ empNumber: number }> }).data ?? [];
      const ids = found.map((e) => e.empNumber);
      if (ids.length) await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids } }).catch(() => null);
    }
    importedNames.length = 0;
  };

  try {
    report.step('1.2 Kolom opsional (middle_name) kosong vs terisi');
    const withMiddle = await page.request.post(api, { data: body(`${HEADER}\n${row(`QaDi1${s}`, 'X', 'Middle')}`) });
    importedNames.push(`QaDi1${s}`);
    const withoutMiddle = await page.request.post(api, { data: body(`${HEADER}\n${row(`QaDi2${s}`, 'X')}`) });
    importedNames.push(`QaDi2${s}`);
    report.check('1.2 [U038] middle_name kosong vs terisi -> 200 keduanya', withMiddle.status() === 200 && withoutMiddle.status() === 200, `withMiddle=${withMiddle.status()} withoutMiddle=${withoutMiddle.status()}`);
    await purge();

    report.step('1.8 / 8.4 Import via UI -- feedback muncul (panel inline, bukan toast)');
    await dataImportPage.goto();
    const before = await page.locator('body').textContent();
    await dataImportPage.fileInput.setInputFiles({ name: 'ui-import.csv', mimeType: 'text/csv', buffer: Buffer.from(`${HEADER}\n${row(`QaDiUi${s}`, 'UI')}`) });
    importedNames.push(`QaDiUi${s}`);
    const [uploadResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/csv-import') && r.request().method() === 'POST'),
      dataImportPage.upload(),
    ]);
    await page.waitForTimeout(1500);
    const after = await page.locator('body').textContent();
    report.check('1.8 [U038] Import valid -> POST 200 + halaman berubah menampilkan hasil (feedback ada, biarpun bukan toast)', uploadResp.status() === 200 && after !== before && (after?.length ?? 0) > (before?.length ?? 0), `status=${uploadResp.status()} before=${before?.length} after=${after?.length}`);
    report.finding('8.4 Mekanisme feedback Data Import berbeda dari form lain', 'Hasil import ditampilkan sbg panel ringkasan INLINE di halaman (bukan `.oxd-toast` spt kebanyakan form Save lain di aplikasi) -- feedback tetap ada, cuma mekanismenya tidak konsisten dgn pola toast app-wide.');

    report.step('4.3 Back/Forward pasca-upload');
    await page.goBack().catch(() => null);
    await page.goForward().catch(() => null);
    report.check('4.3 [U038] Browser Back lalu Forward setelah upload -> halaman termuat normal', page.url().includes('pimCsvImport'), `url=${page.url()}`);
    await purge();

    report.step('4.5 Koneksi putus saat upload');
    await dataImportPage.goto();
    await dataImportPage.fileInput.setInputFiles({ name: 'drop-import.csv', mimeType: 'text/csv', buffer: Buffer.from(`${HEADER}\n${row(`QaDiDrop${s}`, 'X')}`) });
    await dropConnectionDuringSave(page, '**/csv-import*', () => dataImportPage.upload());
    report.check('4.5 [U038] Koneksi putus saat upload -> tidak crash (halaman tetap merespons)', await page.locator('body').isVisible(), 'body masih visible setelah abort');

    report.step('4.7 Concurrency -- 2 import CSV berbeda scr paralel');
    const [c1, c2] = await Promise.all([
      page.request.post(api, { data: body(`${HEADER}\n${row(`QaDiConcA${s}`, 'X')}`) }),
      page.request.post(api, { data: body(`${HEADER}\n${row(`QaDiConcB${s}`, 'X')}`) }),
    ]);
    importedNames.push(`QaDiConcA${s}`, `QaDiConcB${s}`);
    report.check('4.7 [U038] 2 import berbeda bersamaan -> tidak ada 500', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);
    await purge();

    report.step('5.5 Rate limiting -- 3 import paralel');
    const rapid = await Promise.all(Array.from({ length: 3 }, (_, i) => page.request.post(api, { data: body(`${HEADER}\n${row(`QaDiRapid${i}${s}`, 'X')}`) })));
    importedNames.push(`QaDiRapid0${s}`, `QaDiRapid1${s}`, `QaDiRapid2${s}`);
    report.check('5.5 [U038] 3 import paralel -> SEMUA 200 (tidak ada 429/lockout)', rapid.every((r) => r.status() === 200), `statuses=${rapid.map((r) => r.status()).join(',')}`);
    report.finding('Rate limiting pada CSV import', '3 request import paralel SEMUA diterima (200) -- tidak ada rate limit pd endpoint ini, dicatat sbg finding (bukan bug) sesuai R4.');
    await purge();

    report.step('5.4 CSRF -- Origin aplikasi sendiri vs Origin palsu');
    const legit = await page.request.post(api, { data: body(`${HEADER}\n${row(`QaDiCsrfA${s}`, 'X')}`) });
    const evil = await page.request.post(api, { data: body(`${HEADER}\n${row(`QaDiCsrfB${s}`, 'X')}`), headers: { Origin: 'https://evil.example' } });
    importedNames.push(`QaDiCsrfA${s}`, `QaDiCsrfB${s}`);
    report.check('5.4 [U038] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (konsisten dgn TC-PIM-CSRF-01)', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);
    await purge();

    report.step('6.7 Idempotency -- import CSV IDENTIK 2x (simulasi retry network)');
    const dupCsv = `${HEADER}\n${row(`QaDiDup${s}`, 'X')}`;
    const dup1 = await page.request.post(api, { data: body(dupCsv) });
    const dup2 = await page.request.post(api, { data: body(dupCsv) });
    importedNames.push(`QaDiDup${s}`);
    const dup1Meta = ((await dup1.json().catch(() => ({}))) as ImportResult).meta;
    const dup2Meta = ((await dup2.json().catch(() => ({}))) as ImportResult).meta;
    const found = ((await (await page.request.get(`/web/index.php/api/v2/pim/employees?nameOrId=QaDiDup${s}&limit=10`)).json()) as { data: Array<{ empNumber: number }> }).data;
    report.check('6.7 [U038] Import CSV identik 2x -> TIDAK membuat 2 employee duplikat', found.length <= 1, `dup1=${JSON.stringify(dup1Meta)} dup2=${JSON.stringify(dup2Meta)} employeeTersimpan=${found.length}`);

    report.finding('4.8 [U038] Behavior non-obvious', 'Selain mekanisme feedback inline (bukan toast) & ketidakhadiran idempotency check pd import, tidak ditemukan behavior non-intuitif lain.');
  } finally {
    await purge();
  }
  report.print();
});
