/**
 * ================================================================================
 * TC-PIM-ATTACHMENT-API-02 — Verify Attachment API: Update, Optional Field, ESS Access Control, Double Extension And Parameter Validation
 * Modul    : PIM > Employee > Attachments (all tabs) (U098)
 * Kategori : Positive (+) 1.1-U 1.2 1.5 | Negative (-) 2.1 2.4 | Security (S) 5.2-IDOR
 *            5.3-DoubleExt | API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ATTACHMENT-API-02-Verify-Update-Optional-Field-ESS-Access-Control-And-Parameter-Validation.spec.ts
 * Path     : tests/pim/security/
 * ================================================================================
 *
 * LATAR: TC-PIM-ATTACHMENT-API-01 sudah menutup 1.1-C/1.1-R/1.1-D/1.4/3.3/5.1-SQLi/
 * 5.1-XSS-Stored/5.1-CmdPath/5.2-MassAssign/5.3-ContentType/5.3-Oversize/5.3-Filename/6.7.
 * TC ini menutup sisanya, dibuktikan via probe LIVE 18 Nov 2026:
 *   - PUT attachment/<id> BERHASIL (rename filename + ubah description) -> 1.1-U nyata.
 *   - description kosong vs terisi -> 1.2.
 *   - ESS BISA upload ke attachment MILIK SENDIRI (My Info) -> 1.5 positif.
 *   - name kosong -> 422 -> 2.1.
 *   - ESS mencoba GET/POST ke endpoint PIM admin-side utk attachment karyawan LAIN -> 422
 *     KEDUANYA (bukan 200/500) -> aman, 2.4 (aksi admin-only via API langsung ditolak) & 5.2-
 *     IDOR (tidak bisa akses/tulis data karyawan lain) SEKALIGUS.
 *   - "evil.pdf.exe" (ekstensi ganda) -> 422 DITOLAK (beda dgn BG-462/463 yg soal ISI file,
 *     bukan nama -- di sini NAMA file dgn ekstensi ganda justru ditegakkan benar) -> 5.3-
 *     DoubleExt lolos, bukan bug.
 *   - Field asing tambahan, attachment:null, size bertipe salah -> 422 semua (skema ketat)
 *     -> 6.5.
 *   - [TEMUAN] List endpoint MENOLAK sortField (422 invalid param) -- TIDAK ADA kapasitas
 *     search/filter/sort apa pun pd attachment list, dibuktikan di level API (lebih kuat dari
 *     sekadar "tidak ada kontrol UI") -> 1.6 N/A genuine, dicatat TANPA kode literal di label
 *     finding sesuai konvensi (supaya tidak salah ke-tag COVERED).
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/security/TC-PIM-ATTACHMENT-API-02-Verify-Update-Optional-Field-ESS-Access-Control-And-Parameter-Validation.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';
import { newEssSession, openMyInfoFromMenu } from '../../../src/utils/myInfo';

const b64 = (s: string) => Buffer.from(s).toString('base64');
type Attachment = { id: number; filename: string; description: string | null };

test('TC-PIM-ATTACHMENT-API-02: update, optional field, ESS access control, double extension, parameter validation', async ({
  page, browser, addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PIM-ATTACHMENT-API-02', 'Attachment Update Optional Field ESS Access Control Double Extension Parameter Validation', env.baseURL);
  const emp = await createEmployee(page.request, 'QaAttApi2', `L${Date.now() % 100000}`);
  const api = `/web/index.php/api/v2/pim/employees/${emp}/screen/contact/attachments`;
  const content = '%PDF-1.4 content';
  const createdIds: number[] = [];

  try {
    report.step('1.1-U Update (rename + ubah description)');
    const created = await page.request.post(api, { data: { attachment: { name: 'original.pdf', type: 'application/pdf', size: content.length, base64: b64(content) }, description: '' } });
    const createdData = ((await created.json().catch(() => ({}))) as { data?: Attachment }).data;
    if (createdData?.id) createdIds.push(createdData.id);
    const updated = await page.request.put(`${api}/${createdData?.id}`, { data: { attachment: { name: 'renamed.pdf', type: 'application/pdf', size: content.length, base64: b64(content) }, description: 'updated description' } });
    const updatedData = ((await updated.json().catch(() => ({}))) as { data?: Attachment }).data;
    report.check('1.1-U [U098] PUT attachment -> 200, filename & description berubah', updated.status() === 200 && updatedData?.filename === 'renamed.pdf' && updatedData?.description === 'updated description', `status=${updated.status()}`);

    report.step('1.2 Field opsional (description) kosong vs terisi');
    report.check('1.2 [U098] description kosong (sudah dibuktikan di create awal) vs terisi (PUT di atas) -> 200 keduanya', created.status() === 200 && updated.status() === 200, `created=${created.status()} updated=${updated.status()}`);

    report.step('2.1 Required field (name) kosong');
    const noName = await page.request.post(api, { data: { attachment: { name: '', type: 'application/pdf', size: content.length, base64: b64(content) }, description: '' } });
    report.check('2.1 [U098] name kosong -> 422', noName.status() === 422, `status=${noName.status()}`);

    report.step('5.3-DoubleExt Ekstensi ganda pd nama file');
    const doubleExtContent = 'MZ_exe_header';
    const doubleExt = await page.request.post(api, { data: { attachment: { name: 'evil.pdf.exe', type: 'application/pdf', size: doubleExtContent.length, base64: b64(doubleExtContent) }, description: '' } });
    report.check('5.3-DoubleExt [U098] Nama file "evil.pdf.exe" (ekstensi ganda) -> 422 ditolak', doubleExt.status() === 422, `status=${doubleExt.status()}`);

    report.step('6.5 Parameter negatif');
    const nullAttachment = await page.request.post(api, { data: { attachment: null, description: '' } });
    report.check('6.5 [U098] attachment: null -> 422', nullAttachment.status() === 422, `status=${nullAttachment.status()}`);
    const wrongTypeSize = await page.request.post(api, { data: { attachment: { name: 'a.pdf', type: 'application/pdf', size: 'not-a-number', base64: b64(content) }, description: '' } });
    report.check('6.5 [U098] size bertipe string bukan angka -> 422', wrongTypeSize.status() === 422, `status=${wrongTypeSize.status()}`);
    const sortRejected = await page.request.get(`${api}?sortField=filename`);
    report.check('6.5 [U098] Parameter sortField tidak dikenal endpoint ini -> 422 (skema ketat)', sortRejected.status() === 422, `status=${sortRejected.status()}`);
    report.finding('Kapasitas search/filter/sort pada daftar attachment', `Endpoint list MENOLAK (422) parameter sortField -- dibuktikan di level API bhw attachment list TIDAK memiliki kapasitas search/filter/sort apa pun (bukan sekadar tidak ada kontrol UI, tapi API-nya sendiri tidak mendukung).`);

    report.step('1.5 / 2.4 / 5.2-IDOR: ESS upload ke attachment milik sendiri vs milik orang lain');
    const { ess, essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaAttApi2Ess');
    await openMyInfoFromMenu(essPage);
    const ownApi = `/web/index.php/api/v2/pim/employees/${ess.empNumber}/screen/contact/attachments`;
    const ownUpload = await essPage.request.post(ownApi, { data: { attachment: { name: 'own.pdf', type: 'application/pdf', size: content.length, base64: b64(content) }, description: '' } });
    report.check('1.5 [U098] ESS upload ke attachment MILIK SENDIRI (My Info) -> 200', ownUpload.status() === 200, `status=${ownUpload.status()}`);
    const idorGet = await essPage.request.get(api);
    const idorUpload = await essPage.request.post(api, { data: { attachment: { name: 'ess-idor.pdf', type: 'application/pdf', size: content.length, base64: b64(content) }, description: '' } });
    report.check('2.4 / 5.2-IDOR [U098] ESS GET & POST ke attachment karyawan LAIN via endpoint PIM admin-side -> 422 KEDUANYA (ditolak, bukan 200/500)', idorGet.status() === 422 && idorUpload.status() === 422, `GET=${idorGet.status()} POST=${idorUpload.status()}`);
    await close();

    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
