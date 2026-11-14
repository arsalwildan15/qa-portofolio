/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-10 — Verify File Upload Rejects Disguised Executable (Renamed Extension)
 * Modul    : Claim - Assign Claim (Attachments)
 * Kategori : Security (S) 5.3 - File Upload / Ekstensi di-rename (bypass ekstensi)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-10-Verify-File-Upload-Extension-Bypass.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi validasi upload file pada Claim Attachments thd 3 skenario:
 *   1. Upload .php LANGSUNG (ekstensi asli): harapannya ditolak.
 *   2. Upload .php yg DI-RENAME jadi .jpg (payload PHP identik, cuma ekstensi diganti):
 *      INI YG DIUJI UTAMA -- taksonomi 5.3 secara eksplisit mengharuskan validasi MIME
 *      real/magic byte, bukan cuma nama file, krn penyerang bisa upload payload berbahaya
 *      disamarkan sbg gambar.
 *   3. Upload .txt valid sbg kontrol pembanding (harus diterima normal).
 *
 * [BUG APP, dikonfirmasi live -- TC ini SENGAJA FAILED utk mendokumentasikan temuan nyata]
 *   - .php LANGSUNG: DITOLAK client-side (tidak ada POST terkirim sama sekali) -- validasi
 *     ekstensi di sisi client BEKERJA.
 *   - .php DI-RENAME jadi .jpg: DITERIMA PENUH oleh server (POST 200, attachment tersimpan
 *     dgn fileType="image/jpeg" -- diambil dari ekstensi file, BUKAN dari pemeriksaan
 *     konten/magic-byte asli) dan BISA DI-DOWNLOAD KEMBALI via tombol download di UI.
 *     Ini classic file-upload extension-bypass vulnerability: validasi HANYA berdasarkan
 *     nama/ekstensi file, tidak pernah memeriksa konten biner sungguhan. Severity dibatasi
 *     oleh app ini menyajikan file sbg forced-download (bukan inline-execute), tapi gap
 *     validasinya tetap nyata dan harus diperbaiki sesuai taksonomi 5.3.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-10-Verify-File-Upload-Extension-Bypass.spec.ts --project=chromium --headed
 * ================================================================================
 */

import path from 'node:path';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

const FIXTURES_DIR = path.join(__dirname, '..', '..', 'fixtures', 'uploads');

test('TC-CLAIM-ASSIGN-10: a .php payload renamed to .jpg bypasses file upload validation', async ({
  page,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-10', 'File Upload Extension Bypass', env.baseURL, page);

  report.step('Buat claim baru utk pengujian upload');
  const target = await pickLightlyUsedEmployee(page);
  await assignClaimPage.goto();
  await assignClaimPage.selectEmployee(target.employeeId);
  await assignClaimPage.selectEvent('Travel Allowance');
  await assignClaimPage.selectCurrencyByIndex(1);
  const createResp = await assignClaimPage.create();
  const claimId = (await createResp?.json().catch(() => null))?.data?.id;
  report.check('[API] Claim baru berhasil dibuat', createResp?.status() === 200, `claimId=${claimId}`);
  await assignClaimPage.gotoDetail(claimId);

  report.step('Upload .php LANGSUNG (ekstensi asli) -- harapannya ditolak client-side');
  const phpResp = await assignClaimPage.addAttachment(path.join(FIXTURES_DIR, 'malicious.php'), 'php direct test');
  report.check('TIDAK ada POST terkirim utk .php langsung (ditolak client-side)', phpResp === null, `status=${phpResp?.status()}`);

  report.step('Upload .php DI-RENAME jadi .jpg (payload identik) -- ini yg SEHARUSNYA ditolak via validasi MIME/magic byte');
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  const renamedResp = await assignClaimPage.addAttachment(path.join(FIXTURES_DIR, 'malicious_renamed.jpg'), 'php renamed as jpg test');
  const renamedBody = await renamedResp?.json().catch(() => null);
  report.check(
    'File .php yg di-rename jadi .jpg HARUS ditolak server (validasi konten asli) -- TC ini mendokumentasikan bahwa server MENERIMANYA (bug)',
    renamedResp?.status() !== 200,
    `status=${renamedResp?.status()}, fileType=${renamedBody?.data?.attachment?.fileType}`,
  );

  report.step('Kontrol pembanding: upload .txt valid -- harapannya diterima normal');
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  const validResp = await assignClaimPage.addAttachment(path.join(FIXTURES_DIR, 'valid.txt'), 'valid control file');
  report.check('[API] File .txt valid diterima normal (status 200)', validResp?.status() === 200, `status=${validResp?.status()}`);

  report.finding(
    'File upload extension bypass: .php di-rename jadi .jpg diterima server (CONFIRMED)',
    `Server/client hanya memvalidasi berdasarkan nama/ekstensi file (fileType tersimpan "${renamedBody?.data?.attachment?.fileType}" diambil dari ekstensi, bukan konten asli). File berhasil di-upload DAN bisa di-download kembali via UI dgn nama aslinya. Severity dibatasi krn disajikan sbg forced-download (bukan inline-execute), tapi validasi MIME real/magic-byte TIDAK ADA sama sekali -- gap nyata sesuai taksonomi 5.3.`,
  );

  report.print();
});
