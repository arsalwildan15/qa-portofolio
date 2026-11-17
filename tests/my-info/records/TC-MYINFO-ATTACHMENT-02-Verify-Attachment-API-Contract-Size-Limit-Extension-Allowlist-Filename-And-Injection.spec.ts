/**
 * ================================================================================
 * TC-MYINFO-ATTACHMENT-02 — Verify The Attachment API Of An Employee's Own Record: Contract, Size Limit, Content-Type Allowlist, Filename Sanitization And Injection
 * Modul    : My Info - Personal Details Attachments (ESS, U117)
 * Kategori : Positive (+) 1.1-C 1.1-R 1.4 | Negative (-) 2.6 | Boundary (B) 3.1 3.3 |
 *            Security (S) 5.1-SQLi 5.1-XSS-Stored 5.1-CmdPath 5.2-MassAssign 5.3-BadExt
 *            5.3-ContentType 5.3-Oversize 5.3-Filename | API (A) 6.1 6.2 6.3 6.4 6.7
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-ATTACHMENT-02-Verify-Attachment-API-Contract-Size-Limit-Extension-Allowlist-Filename-And-Injection.spec.ts
 * Path     : tests/my-info/records/
 * ================================================================================
 *
 * LATAR (body direkam LIVE dari UI 17 Nov 2026, BUKAN multipart): POST
 * pim/employees/<self>/screen/personal/attachments body JSON {attachment:{name,type,size,
 * base64}, description}. `type` ditegakkan via ALLOWLIST server (text/html ditolak 422), tapi
 * server TIDAK memeriksa ISI file sesungguhnya thd `type` yg diklaim klien -- klien bebas
 * mengklaim type="application/pdf" utk konten apa pun (pola yg sama dgn BG-003: validasi
 * berbasis metadata klien, bukan isi file).
 *
 * TUJUAN:
 *   6.1 / 6.2 / 1.1-C / 1.1-R / 1.4  upload valid -> 200 & kontrak (id, filename, fileType,
 *        size, attachedByName = nama/username sesi sendiri -- attachedBy adalah login user id,
 *        bukan empNumber); GET list -> muncul.
 *   3.1 / 3.3 / 5.3-Oversize  file 2MB -> 422 (batas ukuran ditegakkan).
 *   5.3-BadExt  .exe dgn type=application/octet-stream -> 422 (extension/type di luar
 *        allowlist ditolak).
 *   5.3-ContentType  type di luar allowlist (text/html) -> 422 ditolak DI TINGKAT TYPE.
 *   5.3-Filename / 5.1-CmdPath  nama file berisi path traversal ("../../etc/passwd.pdf") ->
 *        dicatat (lihat HASIL).
 *   5.1-SQLi / 5.1-XSS-Stored  description berisi kutip SQL / HTML -> 200 & tersimpan apa
 *        adanya sbg teks.
 *   5.2-MassAssign  field asing (empNumber lain, attachedBy klien) di body -> diabaikan.
 *   2.6  DELETE id yg tidak ada -> tidak crash (200 no-op atau 4xx, bukan 500).
 *   6.3  PATCH -> 405.  6.4  tanpa sesi -> 401.
 *   6.7  upload 2x file identik -> 2 entri independen (bukan dedup, by design).
 *   Semua attachment uji dihapus di akhir.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-462 (Medium), 2 temuan dlm 1 skrip:
 *   - File dgn DOUBLE EXTENSION ("bad.php.pdf", isi kode PHP) tapi type diklaim
 *     "application/pdf" -> DITERIMA (200) & tersimpan, bukti server hanya memeriksa field
 *     `type` yg diklaim klien, bukan isi file sesungguhnya (keluarga BG-003/MZ-renamed-pdf).
 *   - Nama file berisi path traversal ("../../etc/passwd.pdf") -> DITERIMA (200) & disimpan
 *     APA ADANYA (tanpa sanitasi) di field filename -- risiko tergantung bagaimana filename
 *     dipakai di endpoint download/disk (tidak diverifikasi lebih jauh di TC ini).
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/records/TC-MYINFO-ATTACHMENT-02-Verify-Attachment-API-Contract-Size-Limit-Extension-Allowlist-Filename-And-Injection.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession, openMyInfoFromMenu } from '../../../src/utils/myInfo';

type Attachment = { id: number; filename: string; fileType: string; size: number; attachedBy: number; attachedByName: string; description: string | null };

test('TC-MYINFO-ATTACHMENT-02: attachment API - contract, size limit, type allowlist, filename, injection', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-ATTACHMENT-02', 'Attachment API Contract Size Limit Type Allowlist Filename Injection', env.baseURL);
  const { ess, essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaAttApi');
  const anon = await request.newContext({ baseURL: env.baseURL });
  const req = essPage.request;
  const b64 = (s: string) => Buffer.from(s).toString('base64');
  const body = (name: string, type: string, content: string, description = '', over: Record<string, unknown> = {}) => ({ attachment: { name, type, size: content.length, base64: b64(content) }, description, ...over });

  try {
    const empNumber = await openMyInfoFromMenu(essPage);
    const api = `/web/index.php/api/v2/pim/employees/${empNumber}/screen/personal/attachments`;
    const createdIds: number[] = [];

    report.step('Kontrak create & read');
    const ok = await req.post(api, { data: body(`QaAttApi${Date.now() % 100000}.pdf`, 'application/pdf', '%PDF-1.4 valid content') });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: Attachment }).data;
    if (okData?.id) createdIds.push(okData.id);
    report.check('6.1 / 6.2 / 1.1-C [U117] POST valid -> 200 + id/filename/fileType/size', ok.status() === 200 && !!okData?.id && !!okData?.filename && okData?.fileType === 'application/pdf', `status=${ok.status()}`);
    report.check('1.4 [U117] attachedByName = nama/username sesi sendiri (attachedBy adalah login user id, bukan empNumber)', !!okData?.attachedByName?.toLowerCase().includes(ess.username.toLowerCase()), `attachedByName=${okData?.attachedByName} username=${ess.username}`);
    const list = ((await (await req.get(`${api}?limit=20`)).json()) as { data: Attachment[] }).data;
    report.check('1.1-R [U117] GET list -> attachment muncul', list.some((a) => a.id === okData?.id), `jumlah=${list.length}`);

    report.step('Batas ukuran & allowlist type');
    const oversize = await req.post(api, { data: body('big.pdf', 'application/pdf', 'A'.repeat(2 * 1024 * 1024)) });
    report.check('3.1 / 3.3 / 5.3-Oversize [U117] File 2MB -> 422 (batas ukuran ditegakkan)', oversize.status() === 422, `status=${oversize.status()}`);
    const badExt = await req.post(api, { data: body('bad.exe', 'application/octet-stream', 'MZ fake exe') });
    report.check('5.3-BadExt [U117] .exe type=octet-stream -> 422 (di luar allowlist)', badExt.status() === 422, `status=${badExt.status()}`);
    const badType = await req.post(api, { data: body('mismatch.html', 'text/html', '<script>alert(1)</script>') });
    report.check('5.3-ContentType [U117] type=text/html -> 422 (di luar allowlist)', badType.status() === 422, `status=${badType.status()}`);

    report.step('Double extension & path traversal pada nama file');
    const doubleExt = await req.post(api, { data: body('bad.php.pdf', 'application/pdf', '<?php echo 1; ?>') });
    const doubleExtData = ((await doubleExt.json().catch(() => ({}))) as { data?: Attachment }).data;
    if (doubleExtData?.id) createdIds.push(doubleExtData.id);
    report.check('5.3-DoubleExt [U117] "bad.php.pdf" berisi kode PHP, type diklaim pdf -> DITOLAK (isi divalidasi)', doubleExt.status() === 422, `status=${doubleExt.status()}`);
    const traversalName = `../../etc/passwd-${Date.now() % 100000}.pdf`;
    const traversal = await req.post(api, { data: body(traversalName, 'application/pdf', '%PDF-1.4') });
    const traversalData = ((await traversal.json().catch(() => ({}))) as { data?: Attachment }).data;
    if (traversalData?.id) createdIds.push(traversalData.id);
    report.check('5.3-Filename / 5.1-CmdPath [U117] Nama file path traversal -> ditolak ATAU disanitasi (bukan disimpan apa adanya)', traversal.status() === 422 || (traversal.status() === 200 && traversalData?.filename !== traversalName), `status=${traversal.status()} filename=${traversalData?.filename}`);

    report.step('Injeksi pada description');
    for (const [label, text] of [['5.1-SQLi', `QaAtt' OR '1'='1`], ['5.1-XSS-Stored', '<img src=x onerror=alert(1)>']] as const) {
      const r = await req.post(api, { data: body(`QaAttInj${Date.now() % 100000}.pdf`, 'application/pdf', '%PDF-1.4', text) });
      const rData = ((await r.json().catch(() => ({}))) as { data?: Attachment }).data;
      if (rData?.id) createdIds.push(rData.id);
      report.check(`${label} [U117] description -> 200 & tersimpan identik sbg teks`, r.status() === 200 && rData?.description === text, `status=${r.status()}`);
    }

    report.step('Mass assignment, idempotency, ghost id, method, sesi');
    const massName = `QaAttMass${Date.now() % 100000}.pdf`;
    const mass = await req.post(api, { data: body(massName, 'application/pdf', '%PDF-1.4', '', { empNumber: empNumber + 1, attachedBy: 1 }) });
    const massData = ((await mass.json().catch(() => ({}))) as { data?: Attachment }).data;
    if (massData?.id) createdIds.push(massData.id);
    report.check('5.2-MassAssign [U117] empNumber/attachedBy asing di body -> ditolak (422) atau diabaikan (tetap milik sendiri)', mass.status() === 422 || (mass.status() === 200 && !!massData?.attachedByName?.toLowerCase().includes(ess.username.toLowerCase())), `status=${mass.status()} attachedByName=${massData?.attachedByName}`);

    const dupName = `QaAttDup${Date.now() % 100000}.pdf`;
    const dup1 = await req.post(api, { data: body(dupName, 'application/pdf', '%PDF-1.4 dup') });
    const dup2 = await req.post(api, { data: body(dupName, 'application/pdf', '%PDF-1.4 dup') });
    const dup1Id = ((await dup1.json().catch(() => ({}))) as { data?: Attachment }).data?.id;
    const dup2Id = ((await dup2.json().catch(() => ({}))) as { data?: Attachment }).data?.id;
    if (dup1Id) createdIds.push(dup1Id);
    if (dup2Id) createdIds.push(dup2Id);
    report.check('6.7 [U117] Upload file identik 2x -> 2 entri independen dgn id berbeda (bukan dedup, by design)', dup1.status() === 200 && dup2.status() === 200 && dup1Id !== dup2Id, `id1=${dup1Id} id2=${dup2Id}`);

    const delGhost = await req.delete(api, { data: { ids: ['999999'] } });
    report.check('2.6 [U117] DELETE id tidak ada -> tidak crash (bukan 500)', delGhost.status() < 500, `status=${delGhost.status()}`);
    const patch = await req.patch(api, { data: {} });
    report.check('6.3 [U117] PATCH -> 405', patch.status() === 405, `status=${patch.status()}`);
    const noAuth = await anon.get(api);
    report.check('6.4 [U117] Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);

    if (createdIds.length) await req.delete(api, { data: { ids: createdIds } }).catch(() => null);
  } finally {
    await anon.dispose();
    await close();
  }
  report.print();
});
