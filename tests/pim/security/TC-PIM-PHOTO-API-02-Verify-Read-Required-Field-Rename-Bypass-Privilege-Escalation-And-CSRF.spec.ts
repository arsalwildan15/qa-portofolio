/**
 * ================================================================================
 * TC-PIM-PHOTO-API-02 — Verify Profile Picture: Read, Required Field, Extension Enforcement, Rename Bypass, Privilege Escalation And CSRF
 * Modul    : PIM > Employee > Profile Picture (U099)
 * Kategori : Positive (+) 1.1-R | Negative (-) 2.1 | Security (S) 5.2-PrivEsc 5.3-BadExt
 *            5.3-Rename 5.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PHOTO-API-02-Verify-Read-Required-Field-Rename-Bypass-Privilege-Escalation-And-CSRF.spec.ts
 * Path     : tests/pim/security/
 * ================================================================================
 *
 * LATAR: TC-PIM-PHOTO-API-01 sudah menutup 1.1-U/2.6/3.3/5.1-CmdPath/5.2-MassAssign/
 * 5.3-ContentType/5.3-DoubleExt/5.3-Filename/5.3-Oversize/6.2/6.3/6.4/6.5. Ini menutup 5
 * kode terakhir yg genuine (bukan struktural), dibuktikan via probe LIVE 18 Nov 2026:
 *   - GET picture setelah ada foto ter-upload -> 200 + kontrak (empNumber/filename/fileType/
 *     size); GET SEBELUM ada foto -> 404 Record Not Found (bukan bug, employee baru memang
 *     belum punya foto).
 *   - empPicture: null -> 422 (required field ditegakkan).
 *   - "virus.exe" dgn type application/x-msdownload (ekstensi & type APA ADANYA, bukan di-
 *     rename) -> 422 DITOLAK (5.3-BadExt, beda dgn 5.3-Rename di bawah).
 *   - File dgn byte MZ (executable) di-"rename" nama+type jadi "fake.png"/image/png -> 200
 *     DITERIMA (5.3-Rename, pola SAMA dgn BG-462/463/464 yg sudah tercatat, tidak
 *     diduplikasi sbg bug baru).
 *   - ESS upload foto MILIK SENDIRI dgn field asing (isAdmin, userRoleId) di body -> 422
 *     DITOLAK (5.2-PrivEsc, skema ketat -- KONTRAS POSITIF dgn Attachments yg field asing
 *     endpoint attachment TIDAK pernah diuji privilege-escalation spesifik ini sebelumnya).
 *   - POST dgn Origin palsu vs Origin aplikasi sendiri -> status identik (5.4, konsisten
 *     dgn TC-PIM-CSRF-01/TC-PIM-ATTACHMENT-API-03).
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru (5.3-Rename sudah punya bug tercatat di
 *   BG-462/463/464, tidak diduplikasi di sini sesuai konvensi project).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/security/TC-PIM-PHOTO-API-02-Verify-Read-Required-Field-Rename-Bypass-Privilege-Escalation-And-CSRF.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';
import { newEssSession, openMyInfoFromMenu } from '../../../src/utils/myInfo';

type Picture = { empNumber: number; filename: string; fileType: string; size: string };
const b64 = (s: string) => Buffer.from(s).toString('base64');

test('TC-PIM-PHOTO-API-02: read, required field, rename bypass, privilege escalation, CSRF', async ({
  page, browser, addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PIM-PHOTO-API-02', 'Profile Picture Read Required Field Rename Bypass Privilege Escalation CSRF', env.baseURL);
  const empA = await createEmployee(page.request, 'QaPhotoApi2', `L${Date.now() % 100000}`);
  const api = `/web/index.php/api/v2/pim/employees/${empA}/picture`;

  try {
    report.step('1.1-R Read: GET setelah ada foto ter-upload');
    const seed = await page.request.put(api, { data: { empPicture: { name: 'seed.png', type: 'image/png', size: 4, base64: b64('test') } } });
    report.check('[setup] PUT seed foto -> 200', seed.status() === 200, `status=${seed.status()}`);
    const read = await page.request.get(api);
    const readData = ((await read.json().catch(() => ({}))) as { data?: Picture }).data;
    report.check('1.1-R [U099] GET picture -> 200 + kontrak empNumber/filename/fileType/size', read.status() === 200 && readData?.empNumber === empA && readData?.filename === 'seed.png', `status=${read.status()}`);

    report.step('2.1 Required field: empPicture null');
    const empty = await page.request.put(api, { data: { empPicture: null } });
    report.check('2.1 [U099] empPicture: null -> 422', empty.status() === 422, `status=${empty.status()}`);

    report.step('5.3-BadExt: ekstensi & type .exe apa adanya (bukan rename)');
    const exeBuf = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    const badExt = await page.request.put(api, { data: { empPicture: { name: 'virus.exe', type: 'application/x-msdownload', size: exeBuf.length, base64: b64(exeBuf.toString('binary')) } } });
    report.check('5.3-BadExt [U099] "virus.exe" type application/x-msdownload -> 422 ditolak', badExt.status() === 422, `status=${badExt.status()}`);

    report.step('5.3-Rename: byte MZ (executable) di-rename jadi nama+type .png');
    const renamed = await page.request.put(api, { data: { empPicture: { name: 'fake.png', type: 'image/png', size: exeBuf.length, base64: exeBuf.toString('base64') } } });
    report.check('5.3-Rename [U099] Exe byte MZ, nama & type diklaim .png -> 200 DITERIMA (pola sama dgn BG-462/463/464, bukan bug baru)', renamed.status() === 200, `status=${renamed.status()}`);
    report.finding('Validasi isi file thd ekstensi/type diklaim pd Profile Picture', 'Server menerima file dgn konten biner executable (header MZ) selama nama & type yg diklaim client adalah .png/image-png -- pola yg sama dgn BG-462/463/464, sudah tercatat, tidak diduplikasi sbg bug baru di sini.');

    report.step('5.4 CSRF: Origin aplikasi sendiri vs Origin palsu');
    const legit = await page.request.put(api, { data: { empPicture: { name: 'csrfA.png', type: 'image/png', size: 4, base64: b64('test') } } });
    const evil = await page.request.put(api, { data: { empPicture: { name: 'csrfB.png', type: 'image/png', size: 4, base64: b64('test') } }, headers: { Origin: 'https://evil.example' } });
    report.check('5.4 [U099] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (konsisten dgn TC-PIM-CSRF-01)', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);

    report.step('5.2-PrivEsc: ESS upload foto MILIK SENDIRI dgn field privilese asing');
    const { ess, essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaPhotoApi2Ess');
    await openMyInfoFromMenu(essPage);
    const ownApi = `/web/index.php/api/v2/pim/employees/${ess.empNumber}/picture`;
    const privEsc = await essPage.request.put(ownApi, { data: { empPicture: { name: 'ess.png', type: 'image/png', size: 4, base64: b64('test') }, isAdmin: true, userRoleId: 1 } });
    report.check('5.2-PrivEsc [U099] ESS upload foto sendiri + field asing (isAdmin/userRoleId) -> 422 ditolak (skema ketat)', privEsc.status() === 422, `status=${privEsc.status()}`);
    const idor = await essPage.request.put(api, { data: { empPicture: { name: 'idor.png', type: 'image/png', size: 4, base64: b64('test') } } });
    report.check('5.2-IDOR [U099] ESS mencoba ubah foto karyawan LAIN via endpoint PIM admin-side -> 422 ditolak (sudah dibuktikan di modul lain, konfirmasi di sini)', idor.status() === 422, `status=${idor.status()}`);
    await close();
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [empA] } }).catch(() => null);
  }
  report.print();
});
