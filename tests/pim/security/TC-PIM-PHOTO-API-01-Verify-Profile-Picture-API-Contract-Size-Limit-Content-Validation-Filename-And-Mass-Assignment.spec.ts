/**
 * ================================================================================
 * TC-PIM-PHOTO-API-01 — Verify The Profile Picture API: Contract, Size Limit, Content-Type Allowlist, Filename Sanitization, Mass Assignment, Unknown Employee And Method
 * Modul    : PIM > Employee > Profile Picture (U099)
 * Kategori : Positive (+) 1.1-U | Negative (-) 2.6 | Boundary (B) 3.3 | Security (S)
 *            5.1-CmdPath 5.2-MassAssign 5.3-ContentType 5.3-DoubleExt 5.3-Oversize
 *            5.3-Filename | API (A) 6.2 6.3 6.4 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PHOTO-API-01-Verify-Profile-Picture-API-Contract-Size-Limit-Content-Validation-Filename-And-Mass-Assignment.spec.ts
 * Path     : tests/pim/security/
 * ================================================================================
 *
 * LATAR (body direkam LIVE dari UI 17 Nov 2026 via page.on('request')): PUT
 * pim/employees/<empNumber>/picture body JSON {empPicture:{name,type,size,base64}} --
 * endpoint TERPISAH dari PUT .../personal-details, kontrak & gaya validasi SAMA dgn
 * Attachments (TC-PIM-ATTACHMENT-API-01, TC-MYINFO-ATTACHMENT-02): type ditegakkan via
 * allowlist tapi isi file tidak diperiksa thd type yg diklaim.
 *
 * TUJUAN:
 *   1.1-U / 6.2  PUT valid -> 200 & kontrak (empNumber, filename, fileType, size).
 *   3.3 / 5.3-Oversize  file 2MB -> 422.
 *   5.3-ContentType  .exe type=octet-stream -> 422 (di luar allowlist).
 *   5.3-DoubleExt / 5.1-CmdPath  "bad.php.png" (isi kode PHP, type diklaim image/png) ->
 *        dicatat (lihat HASIL, pola sama dgn BG-462/BG-463).
 *   5.3-Filename  nama file path traversal -> dicatat (lihat HASIL).
 *   5.2-MassAssign  field asing (empNumber karyawan lain) di body -> diabaikan (foto tetap
 *        milik empNumber di URL, bukan di body).
 *   2.6  PUT ke empNumber yg tidak ada (999999) -> 422 (BUKAN 500 -- kontras positif dgn
 *        pola "ghost id -> 500" yg sudah dikonfirmasi di modul lain).
 *   6.3  PATCH -> 405.  6.4  tanpa sesi -> 401.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-464 (Medium) -- pola SAMA dgn BG-462/BG-463:
 *   (1) file "bad.php.png" berisi kode PHP, type diklaim "image/png" -> DITERIMA (200),
 *   server hanya memeriksa field type yg diklaim klien, bukan isi file; (2) nama file path
 *   traversal ("../../etc/passwd.png") -> DITERIMA (200) & disimpan APA ADANYA tanpa
 *   sanitasi. Mengonfirmasi backend upload file OrangeHRM (Attachments & Profile Picture,
 *   Admin & ESS) berbagi kode validasi yg sama persis, jadi kerentanan yg sama berlaku di
 *   KEEMPAT varian.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/security/TC-PIM-PHOTO-API-01-Verify-Profile-Picture-API-Contract-Size-Limit-Content-Validation-Filename-And-Mass-Assignment.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

type Picture = { empNumber: number; filename: string; fileType: string; size: string };

test('TC-PIM-PHOTO-API-01: Profile Picture API - contract, size limit, type allowlist, filename, mass assignment', async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-PIM-PHOTO-API-01', 'Profile Picture API Contract Size Limit Type Allowlist Filename Mass Assignment', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  const empA = await createEmployee(page.request, 'QaPhotoApiA', `L${Date.now() % 100000}`);
  const empB = await createEmployee(page.request, 'QaPhotoApiB', `L${(Date.now() + 1) % 100000}`);
  const b64 = (s: string) => Buffer.from(s).toString('base64');
  const body = (name: string, type: string, content: string, over: Record<string, unknown> = {}) => ({ empPicture: { name, type, size: content.length, base64: b64(content) }, ...over });

  try {
    const api = `/web/index.php/api/v2/pim/employees/${empA}/picture`;

    report.step('Kontrak PUT valid');
    const ok = await page.request.put(api, { data: body('valid.png', 'image/png', 'fake png bytes') });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: Picture }).data;
    report.check('1.1-U / 6.2 [U099] PUT valid -> 200 + empNumber/filename/fileType/size', ok.status() === 200 && okData?.empNumber === empA && !!okData?.filename && okData?.fileType === 'image/png', `status=${ok.status()}`);

    report.step('Batas ukuran & allowlist type');
    const oversize = await page.request.put(api, { data: body('big.png', 'image/png', 'A'.repeat(2 * 1024 * 1024)) });
    report.check('3.3 / 5.3-Oversize [U099] File 2MB -> 422', oversize.status() === 422, `status=${oversize.status()}`);
    const badExt = await page.request.put(api, { data: body('bad.exe', 'application/octet-stream', 'MZ fake exe') });
    report.check('5.3-ContentType [U099] .exe type=octet-stream -> 422 (di luar allowlist)', badExt.status() === 422, `status=${badExt.status()}`);

    report.step('Double extension & path traversal pada nama file');
    const doubleExt = await page.request.put(api, { data: body('bad.php.png', 'image/png', '<?php echo 1; ?>') });
    report.check('5.3-DoubleExt / 5.1-CmdPath [U099] "bad.php.png" berisi kode PHP, type diklaim image/png -> DITOLAK (isi divalidasi)', doubleExt.status() === 422, `status=${doubleExt.status()}`);
    const traversalName = `../../etc/passwd-${Date.now() % 100000}.png`;
    const traversal = await page.request.put(api, { data: body(traversalName, 'image/png', 'fake png bytes') });
    const traversalData = ((await traversal.json().catch(() => ({}))) as { data?: Picture }).data;
    report.check('5.3-Filename [U099] Nama file path traversal -> ditolak ATAU disanitasi (bukan disimpan apa adanya)', traversal.status() === 422 || (traversal.status() === 200 && traversalData?.filename !== traversalName), `status=${traversal.status()} filename=${traversalData?.filename}`);

    report.step('Mass assignment, employee tidak ada, method, sesi');
    const mass = await page.request.put(api, { data: body('mass.png', 'image/png', 'fake bytes', { empNumber: empB }) });
    const massData = ((await mass.json().catch(() => ({}))) as { data?: Picture }).data;
    report.check('5.2-MassAssign [U099] empNumber karyawan lain di body diabaikan (foto tetap milik empNumber di URL)', mass.status() === 200 && massData?.empNumber === empA, `status=${mass.status()} empNumber=${massData?.empNumber}`);
    const ghost = await page.request.put('/web/index.php/api/v2/pim/employees/999999/picture', { data: body('ghost.png', 'image/png', 'fake bytes') });
    report.check('2.6 [U099] PUT ke empNumber 999999 (tidak ada) -> 422 (BUKAN 500, kontras positif dgn modul lain)', ghost.status() === 422, `status=${ghost.status()}`);
    const patch = await page.request.patch(api, { data: {} });
    report.check('6.3 [U099] PATCH -> 405', patch.status() === 405, `status=${patch.status()}`);
    const noAuth = await anon.put(api, { data: body('anon.png', 'image/png', 'fake bytes') });
    report.check('6.4 [U099] Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);
  } finally {
    await anon.dispose();
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [empA, empB] } }).catch(() => null);
  }
  report.print();
});
