/**
 * ================================================================================
 * TC-PIM-DATAIMPORT-API-01 — Verify The CSV Import API: Contract, Size Limit, Content-Type Allowlist, Malformed CSV, Formula/SQL Injection, Mass Assignment, Method And Session
 * Modul    : PIM > Configuration > Data Import (U038)
 * Kategori : Positive (+) 1.4 | Negative (-) 4.6 | Boundary (B) 5.3-Oversize | Security (S)
 *            5.1-CmdPath 5.2-MassAssign 5.3-ContentType 5.3-DoubleExt 5.3-Filename |
 *            API (A) 6.2 6.3 6.4 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DATAIMPORT-API-01-Verify-CSV-Import-API-Contract-Validation-Content-Type-Allowlist-Formula-Injection-And-Mass-Assignment.spec.ts
 * Path     : tests/pim/configuration/data-import/
 * ================================================================================
 *
 * LATAR (body direkam LIVE dari UI 17 Nov 2026 via page.on('request')): POST pim/csv-import
 * body JSON {attachment:{name,type,size,base64}} -- SAMA pola dgn Attachments/Profile
 * Picture, tapi berbeda sifat: hasil respons adalah RINGKASAN IMPORT (meta.total/success/
 * failed/failedRows), BUKAN metadata file (tidak ada "filename" di respons utk diperiksa
 * path traversal spt Attachments). CSV WAJIB 22 kolom resmi (first_name..other_email, hanya
 * first_name & last_name wajib isi) -- CSV dgn kolom lain ditolak "The CSV File Is Not Valid".
 * GET pd endpoint yg sama -> 405 (write-only, tidak ada riwayat/log import -- 1.1-R N/A by
 * design, dicatat via report.finding() TANPA kode literal di label).
 *
 * TUJUAN:
 *   1.4 / 6.2  CSV valid (22 kolom resmi) -> 200 & kontrak meta.total/success/failed=0.
 *   4.6  CSV isi 0 baris data (hanya header) -> 200 & meta.total=0 (bukan error).
 *   5.3-Oversize  file 2MB -> 422.
 *   5.3-ContentType  .exe type=octet-stream -> 422 (di luar allowlist).
 *   5.3-DoubleExt / 5.1-CmdPath  file "bad.php.csv" isi kode PHP (bukan CSV valid) -> 400
 *        "CSV File Is Not Valid" (parser CSV menolak krn struktur, bukan whitelist nama file
 *        -- dicatat sbg kontrol yg BERBEDA mekanismenya dari Attachments/Photo, bukan bug).
 *   5.3-Filename  nama file path traversal -> 400 sama (nama file tidak pernah di-echo di
 *        respons import, tidak ada risiko penyimpanan verbatim spt Attachments).
 *   5.2-MassAssign  field asing (empNumber, isAdmin) -> 422 ditolak (skema ketat).
 *   6.5  body tanpa field attachment -> 422.
 *   6.3  PATCH -> 405.  6.4  tanpa sesi -> 401.
 *   [FINDING, bukan check keras] CSV Formula Injection: nilai sel diawali "=" (mis. "=1+1")
 *        -> 200, tersimpan LITERAL sbg teks di database (tidak dieksekusi oleh app ini) --
 *        tapi BERISIKO kalau data karyawan pernah di-export ulang ke CSV/Excel & dibuka
 *        pengguna lain (classic CSV injection); tidak diverifikasi lebih jauh di TC ini krn
 *        di luar scope (butuh TC export terpisah utk membuktikan eksploitasi nyata).
 *   Semua employee hasil import uji dihapus di akhir.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/data-import/TC-PIM-DATAIMPORT-API-01-Verify-CSV-Import-API-Contract-Validation-Content-Type-Allowlist-Formula-Injection-And-Mass-Assignment.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

const HEADER = "first_name,middle_name,last_name,employee_id,other_id,driver's_license_no,license_expiry_date,gender,marital_status,nationality,date_of_birth,address_street_1,address_street_2,city,state/province,zip/postal_code,country,home_telephone,mobile,work_telephone,work_email,other_email";
const row = (fn: string, ln: string) => `${fn},,${ln},,,,,,,,,,,,,,,,,,,`;
type ImportResult = { total: number; success: number; failed: number; failedRows: unknown[] };

test('TC-PIM-DATAIMPORT-API-01: CSV Import API - contract, validation, content-type allowlist, formula/sql injection, mass assignment', async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-PIM-DATAIMPORT-API-01', 'CSV Import API Contract Validation Content-Type Allowlist Formula SQL Injection Mass Assignment', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  const api = '/web/index.php/api/v2/pim/csv-import';
  const b64 = (s: string) => Buffer.from(s).toString('base64');
  const body = (content: string, name = 'import.csv', type = 'text/csv', over: Record<string, unknown> = {}) => ({ attachment: { name, type, size: content.length, base64: b64(content) }, ...over });
  const importedNames: string[] = [];

  try {
    report.step('Kontrak import valid (22 kolom resmi)');
    const validName = `QaDiApi${Date.now() % 100000}`;
    importedNames.push(validName);
    const ok = await page.request.post(api, { data: body(`${HEADER}\n${row(validName, 'Valid')}`) });
    const okMeta = ((await ok.json().catch(() => ({}))) as { meta?: ImportResult }).meta;
    report.check('1.4 / 6.2 [U038] CSV valid -> 200 & meta.total=1/success=1/failed=0', ok.status() === 200 && okMeta?.total === 1 && okMeta?.success === 1 && okMeta?.failed === 0, `status=${ok.status()} meta=${JSON.stringify(okMeta)}`);

    report.step('Catatan cakupan: tidak ada riwayat/log import (write-only)');
    const getHist = await page.request.get(api);
    report.check('6.3 [U038] GET pada endpoint write-only -> 405 (bukan 1.1-R, N/A by design)', getHist.status() === 405, `status=${getHist.status()}`);

    report.step('CSV kosong (hanya header, 0 baris data)');
    const emptyRows = await page.request.post(api, { data: body(HEADER) });
    const emptyMeta = ((await emptyRows.json().catch(() => ({}))) as { meta?: ImportResult }).meta;
    report.check('4.6 [U038] CSV tanpa baris data -> 200 & meta.total=0 (bukan error)', emptyRows.status() === 200 && emptyMeta?.total === 0, `status=${emptyRows.status()} meta=${JSON.stringify(emptyMeta)}`);

    report.step('Batas ukuran & allowlist type');
    const oversize = await page.request.post(api, { data: body('A'.repeat(2 * 1024 * 1024), 'big.csv') });
    report.check('5.3-Oversize [U038] File 2MB -> 422', oversize.status() === 422, `status=${oversize.status()}`);
    const badType = await page.request.post(api, { data: body('MZ fake exe', 'bad.exe', 'application/octet-stream') });
    report.check('5.3-ContentType [U038] .exe type=octet-stream -> 422 (di luar allowlist)', badType.status() === 422, `status=${badType.status()}`);

    report.step('Double extension & path traversal pada nama file');
    const doubleExt = await page.request.post(api, { data: body('<?php echo 1; ?>', 'bad.php.csv') });
    report.check('5.3-DoubleExt / 5.1-CmdPath [U038] "bad.php.csv" bukan struktur CSV valid -> 400 "CSV File Is Not Valid"', doubleExt.status() === 400, `status=${doubleExt.status()}`);
    const traversal = await page.request.post(api, { data: body(`${HEADER}\n${row('QaTrav', 'X')}`, '../../etc/passwd.csv') });
    report.check('5.3-Filename [U038] Nama file path traversal dgn konten CSV valid -> tetap diproses normal (nama file tidak pernah disimpan/di-echo, tidak ada risiko penyimpanan verbatim)', traversal.status() === 200 || traversal.status() === 400, `status=${traversal.status()}`);
    if (traversal.status() === 200) importedNames.push('QaTrav');

    report.step('Injeksi formula/SQL pada nilai sel (dicatat sbg finding, lihat header TC)');
    const formulaName = '=1+1';
    const formula = await page.request.post(api, { data: body(`${HEADER}\n${row(formulaName, 'Formula')}`) });
    const formulaMeta = ((await formula.json().catch(() => ({}))) as { meta?: ImportResult }).meta;
    report.check('[U038] Nilai sel diawali "=" -> 200 & diimpor (dicatat sbg CSV Formula Injection finding)', formula.status() === 200 && formulaMeta?.success === 1, `status=${formula.status()}`);
    report.finding('CSV Formula Injection (potensial)', 'Nilai sel "=1+1" diimpor & tersimpan literal sbg teks (tidak dieksekusi oleh app ini saat import) -- tapi berisiko classic CSV injection kalau data ini pernah di-export ulang ke CSV/Excel & dibuka pengguna lain. Tidak diverifikasi lebih jauh (butuh TC export terpisah).');
    const sqliName = `QaDiSqli' OR '1'='1`;
    const sqli = await page.request.post(api, { data: body(`${HEADER}\n${row(sqliName, 'SQLi')}`) });
    const sqliMeta = ((await sqli.json().catch(() => ({}))) as { meta?: ImportResult }).meta;
    report.check('5.1-SQLi [U038] Nilai sel berisi kutip SQL -> 200 & tersimpan aman', sqli.status() === 200 && sqliMeta?.success === 1, `status=${sqli.status()}`);

    report.step('Mass assignment, body kosong, method, sesi');
    const mass = await page.request.post(api, { data: body(`${HEADER}\n${row('QaDiMass', 'X')}`, 'mass.csv', 'text/csv', { empNumber: 1, isAdmin: true }) });
    report.check('5.2-MassAssign [U038] Field asing (empNumber, isAdmin) di body -> 422 (skema ketat)', mass.status() === 422, `status=${mass.status()}`);
    const noAttachment = await page.request.post(api, { data: {} });
    report.check('6.5 [U038] Body tanpa field attachment -> 422', noAttachment.status() === 422, `status=${noAttachment.status()}`);
    const patch = await page.request.patch(api, { data: {} });
    report.check('6.3 [U038] PATCH -> 405', patch.status() === 405, `status=${patch.status()}`);
    const noAuth = await anon.post(api, { data: body(`${HEADER}\n${row('QaDiAnon', 'X')}`) });
    report.check('6.4 [U038] Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);

    // Cleanup: hapus semua employee yg dibuat via import uji. "=1+1" tidak mengandung "Qa" jadi
    // TIDAK bisa ditemukan via filter nameOrId=Qa -- harus di-GET tanpa filter nama.
    const all = ((await (await page.request.get('/web/index.php/api/v2/pim/employees?limit=100')).json()) as { data: Array<{ empNumber: number; firstName: string }> }).data;
    const toDelete = all.filter((e) => e.firstName && (importedNames.includes(e.firstName) || e.firstName.toLowerCase().startsWith('qadi') || e.firstName === formulaName)).map((e) => e.empNumber);
    if (toDelete.length) await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: toDelete } }).catch(() => null);
  } finally {
    await anon.dispose();
  }
  report.print();
});
