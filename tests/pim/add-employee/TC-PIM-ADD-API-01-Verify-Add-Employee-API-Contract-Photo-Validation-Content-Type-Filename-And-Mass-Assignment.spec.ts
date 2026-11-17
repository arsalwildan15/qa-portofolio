/**
 * ================================================================================
 * TC-PIM-ADD-API-01 — Verify The Add Employee API: Contract, Required Fields, Photo Content-Type Allowlist, Double Extension, Filename Sanitization, Mass Assignment, Method And Session
 * Modul    : PIM > Add Employee (U041)
 * Kategori : Positive (+) 1.2 1.4 | Negative (-) 4.6 | Security (S) 5.1-CmdPath
 *            5.2-MassAssign 5.3-ContentType 5.3-Oversize 5.3-Filename | API (A) 6.2 6.3
 *            6.4 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-API-01-Verify-Add-Employee-API-Contract-Photo-Validation-Content-Type-Filename-And-Mass-Assignment.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * LATAR (body direkam LIVE dari UI 17 Nov 2026): POST pim/employees body {firstName,
 * middleName,lastName,empPicture,employeeId}; empPicture (opsional) = {name,type,size,
 * base64} -- SAMA pola dgn Attachments/Profile Picture/Data Import, dgn `size` WAJIB cocok
 * persis dgn panjang konten base64-decoded (size yg tidak cocok -> 422, ditemukan via
 * percobaan awal yg salah pakai literal "size:10").
 *
 * TUJUAN:
 *   1.2 / 1.4  create tanpa photo (opsional) -> 200; create DENGAN photo valid -> 200 &
 *        empNumber benar.
 *   4.6  firstName/lastName kosong -> 422 (bukan 200 dgn data kosong).
 *   5.3-ContentType  photo type=application/octet-stream (.exe) -> 422; type=text/html ->
 *        422 (allowlist ditegakkan).
 *   5.3-Oversize  photo 2MB -> 422.
 *   5.3-DoubleExt / 5.1-CmdPath  photo "bad.php.png" (isi kode PHP, type diklaim image/png)
 *        -> dicatat (lihat HASIL, pola sama dgn BG-462/463/464).
 *   5.3-Filename  nama file path traversal -> dicatat (lihat HASIL); DIVERIFIKASI nama file
 *        TIDAK di-echo di respons employee/personal-details manapun (beda dgn Attachments
 *        yg eksplisit menampilkan filename) -- mengurangi radius dampak yg terkonfirmasi,
 *        tapi akar masalahnya (validasi berbasis metadata klien) tetap sama.
 *   5.2-MassAssign  field asing (empNumber, isAdmin) di body -> 422 ditolak (skema ketat).
 *   6.3  PATCH -> 405.  6.4  tanpa sesi -> 401.
 *   Semua employee uji dihapus di akhir.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-469 (Medium) -- pola SAMA dgn BG-462/463/
 *   464 (konfirmasi KE-4): file "bad.php.png" (isi kode PHP, type diklaim image/png)
 *   DITERIMA (200) saat membuat employee baru -- server hanya memeriksa field type yg
 *   diklaim klien, bukan isi file sesungguhnya; nama file path traversal
 *   ("../../etc/passwd.png") DITERIMA (200) saat create employee (TIDAK di-echo di API
 *   manapun yg diuji, jadi dampak penyimpanan verbatim TIDAK terkonfirmasi langsung spt di
 *   Attachments, tapi root cause validasi yg sama tetap berlaku).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-API-01-Verify-Add-Employee-API-Contract-Photo-Validation-Content-Type-Filename-And-Mass-Assignment.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

type Employee = { empNumber: number; firstName: string; lastName: string };

test('TC-PIM-ADD-API-01: Add Employee API - contract, photo validation, content-type allowlist, filename, mass assignment, method, session', async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-PIM-ADD-API-01', 'Add Employee API Contract Photo Validation Content Type Filename Mass Assignment Method Session', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  const api = '/web/index.php/api/v2/pim/employees';
  const b64 = (s: string) => Buffer.from(s).toString('base64');
  const pic = (name: string, type: string, content: string) => ({ name, type, size: content.length, base64: b64(content) });
  const body = (firstName: string, over: Record<string, unknown> = {}) => ({ firstName, middleName: '', lastName: 'QaAddApiTest', employeeId: null, empPicture: null, ...over });
  const stamp = Date.now() % 100000;
  const createdIds: number[] = [];

  try {
    report.step('Kontrak create tanpa & dengan photo valid');
    const noPic = await page.request.post(api, { data: body(`QaAddApi${stamp}`) });
    const noPicData = ((await noPic.json().catch(() => ({}))) as { data?: Employee }).data;
    if (noPicData?.empNumber) createdIds.push(noPicData.empNumber);
    report.check('1.2 [U041] POST tanpa photo (opsional) -> 200 + empNumber', noPic.status() === 200 && !!noPicData?.empNumber, `status=${noPic.status()}`);
    const withPic = await page.request.post(api, { data: body(`QaAddApiPic${stamp}`, { empPicture: pic('photo.png', 'image/png', 'fake png content') }) });
    const withPicData = ((await withPic.json().catch(() => ({}))) as { data?: Employee }).data;
    if (withPicData?.empNumber) createdIds.push(withPicData.empNumber);
    report.check('1.4 [U041] POST dengan photo valid -> 200 + empNumber', withPic.status() === 200 && !!withPicData?.empNumber, `status=${withPic.status()}`);

    report.step('Required field kosong');
    const empty = await page.request.post(api, { data: { firstName: '', middleName: '', lastName: '', employeeId: null, empPicture: null } });
    report.check('4.6 / 6.5 [U041] firstName & lastName kosong -> 422 (bukan employee kosong tersimpan)', empty.status() === 422, `status=${empty.status()}`);

    report.step('Allowlist type & batas ukuran photo');
    const badExt = await page.request.post(api, { data: body(`QaAddApiExe${stamp}`, { empPicture: pic('bad.exe', 'application/octet-stream', 'MZ fake exe content') }) });
    report.check('5.3-ContentType [U041] photo .exe type=octet-stream -> 422 (di luar allowlist)', badExt.status() === 422, `status=${badExt.status()}`);
    const badType = await page.request.post(api, { data: body(`QaAddApiHtml${stamp}`, { empPicture: pic('mismatch.html', 'text/html', '<script>alert(1)</script>') }) });
    report.check('5.3-ContentType [U041] photo type=text/html -> 422 (di luar allowlist)', badType.status() === 422, `status=${badType.status()}`);
    const oversize = await page.request.post(api, { data: body(`QaAddApiBig${stamp}`, { empPicture: pic('big.png', 'image/png', 'A'.repeat(2 * 1024 * 1024)) }) });
    report.check('5.3-Oversize [U041] photo 2MB -> 422', oversize.status() === 422, `status=${oversize.status()}`);

    report.step('Double extension & path traversal pada nama file (lihat HASIL utk bug)');
    const doubleExt = await page.request.post(api, { data: body(`QaAddApiDbl${stamp}`, { empPicture: pic('bad.php.png', 'image/png', '<?php echo 1; ?>') }) });
    const doubleExtData = ((await doubleExt.json().catch(() => ({}))) as { data?: Employee }).data;
    if (doubleExtData?.empNumber) createdIds.push(doubleExtData.empNumber);
    report.check('5.3-DoubleExt / 5.1-CmdPath [U041] photo "bad.php.png" berisi kode PHP, type diklaim image/png -> DITOLAK (isi divalidasi)', doubleExt.status() === 422, `status=${doubleExt.status()}`);
    const travName = `../../etc/passwd-${stamp}.png`;
    const traversal = await page.request.post(api, { data: body(`QaAddApiTrav${stamp}`, { empPicture: pic(travName, 'image/png', 'fake png content') }) });
    const traversalData = ((await traversal.json().catch(() => ({}))) as { data?: Employee }).data;
    if (traversalData?.empNumber) createdIds.push(traversalData.empNumber);
    report.check('5.3-Filename [U041] Nama file path traversal pd photo create employee -> ditolak (4xx)', traversal.status() >= 400 && traversal.status() < 500, `status=${traversal.status()}`);
    if (traversalData?.empNumber) {
      const detail = await page.request.get(`${api}/${traversalData.empNumber}`);
      const detailText = await detail.text();
      report.check('5.3-Filename [U041] Nama file path traversal TIDAK pernah di-echo di API employee (beda dgn Attachments)', !detailText.includes('passwd'), detailText.slice(0, 150));
    }

    report.step('Mass assignment, method, sesi');
    const mass = await page.request.post(api, { data: { ...body(`QaAddApiMass${stamp}`), empNumber: 1, isAdmin: true } });
    report.check('5.2-MassAssign [U041] Field asing (empNumber, isAdmin) di body -> 422 (skema ketat)', mass.status() === 422, `status=${mass.status()}`);
    const patch = await page.request.patch(api, { data: {} });
    report.check('6.3 [U041] PATCH -> 405', patch.status() === 405, `status=${patch.status()}`);
    const noAuth = await anon.get(api);
    report.check('6.4 [U041] Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);

    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  } finally {
    await anon.dispose();
  }
  report.print();
});
