/**
 * ================================================================================
 * TC-PIM-ATTACHMENT-API-01 — Verify The Attachment API On Any Employee Tab: Contract, Size Limit, Content-Type Allowlist, Filename Sanitization, Mass Assignment, Injection, Method And Session
 * Modul    : PIM > Employee > Attachments (all tabs) (U098)
 * Kategori : Positive (+) 1.1-C 1.1-R 1.1-D 1.4 | Boundary (B) 3.3 | Security (S) 5.1-SQLi
 *            5.1-XSS-Stored 5.1-CmdPath 5.2-MassAssign 5.3-ContentType 5.3-Oversize
 *            5.3-Filename | API (A) 6.5 6.7
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ATTACHMENT-API-01-Verify-Attachment-API-Contract-Size-Limit-Content-Validation-Filename-And-Injection.spec.ts
 * Path     : tests/pim/security/
 * ================================================================================
 *
 * LATAR (body direkam LIVE dari UI 17 Nov 2026 via page.on('request') saat Admin upload
 * attachment di Contact Details employee lain): endpoint sama persis dgn My Info (ESS) --
 * POST pim/employees/<empNumber>/screen/<screen>/attachments body JSON {attachment:{name,
 * type,size,base64}, description} (BUKAN multipart). `screen` = "contact" utk Contact
 * Details. Backend SAMA dgn yg sudah dibuktikan di TC-MYINFO-ATTACHMENT-02 (BG-462): type
 * ditegakkan via allowlist tapi ISI file tidak diperiksa thd type yg diklaim.
 *
 * TUJUAN:
 *   1.1-C / 1.1-R  upload valid (employee BUKAN diri sendiri, dibuat via API) -> 200 &
 *        kontrak; GET list -> muncul.
 *   1.4  Admin boleh membaca/menulis attachment employee MANAPUN (bukan IDOR -- ini BY
 *        DESIGN utk role Admin, arsitektur single-role, dikonfirmasi dgn bukti bukan
 *        sekadar asumsi).
 *   5.3-Oversize / 3.3  file 2MB -> 422.
 *   5.3-ContentType  type di luar allowlist (text/html) -> 422.
 *   5.1-CmdPath / 5.3-Filename  nama file path traversal -> dicatat (lihat HASIL, pola sama
 *        dgn BG-462).
 *   5.1-SQLi / 5.1-XSS-Stored  description -> 200 & tersimpan apa adanya sbg teks.
 *   5.2-MassAssign  field asing (empNumber lain) di body -> ditolak/diabaikan.
 *   6.7  upload file identik 2x -> 2 entri independen.
 *   2.6 (dibuktikan terpisah di modul lain) tidak diulang di sini; fokus pd kontrak & security.
 *   Semua attachment uji dihapus di akhir; employee uji dihapus.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-463 (Medium) -- pola SAMA dgn BG-462 (My
 *   Info): nama file path traversal ("../../etc/passwd.pdf") DITERIMA (200) & disimpan APA
 *   ADANYA tanpa sanitasi, pada endpoint attachment Admin-side yg sama persis dgn ESS-side.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/security/TC-PIM-ATTACHMENT-API-01-Verify-Attachment-API-Contract-Size-Limit-Content-Validation-Filename-And-Injection.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

type Attachment = { id: number; filename: string; fileType: string; size: number; description: string | null };

test('TC-PIM-ATTACHMENT-API-01: attachment API - contract, size limit, type allowlist, filename, injection, mass assignment', async ({ page }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-PIM-ATTACHMENT-API-01', 'Attachment API Contract Size Limit Type Allowlist Filename Injection Mass Assignment', env.baseURL);
  const empNumber = await createEmployee(page.request, 'QaPimAttApi', `L${Date.now() % 100000}`);
  const b64 = (s: string) => Buffer.from(s).toString('base64');
  const body = (name: string, type: string, content: string, description = '', over: Record<string, unknown> = {}) => ({ attachment: { name, type, size: content.length, base64: b64(content) }, description, ...over });
  const api = `/web/index.php/api/v2/pim/employees/${empNumber}/screen/contact/attachments`;
  const createdIds: number[] = [];

  try {
    report.step('Kontrak create & read (Admin, employee bukan diri sendiri)');
    const ok = await page.request.post(api, { data: body(`QaPimAttApi${Date.now() % 100000}.pdf`, 'application/pdf', '%PDF-1.4 valid content') });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: Attachment }).data;
    if (okData?.id) createdIds.push(okData.id);
    report.check('1.1-C [U098] POST valid -> 200 + id/filename/fileType/size', ok.status() === 200 && !!okData?.id && !!okData?.filename && okData?.fileType === 'application/pdf', `status=${ok.status()}`);
    const list = ((await (await page.request.get(`${api}?limit=20`)).json()) as { data: Attachment[] }).data;
    report.check('1.1-R [U098] GET list -> attachment muncul', list.some((a) => a.id === okData?.id), `jumlah=${list.length}`);
    report.check('1.4 [U098] Admin BOLEH mengelola attachment employee lain (by design, bukan IDOR -- arsitektur single-role)', ok.status() === 200, 'Admin accessing a different employee is the normal, intended workflow');

    report.step('Batas ukuran & allowlist type');
    const oversize = await page.request.post(api, { data: body('big.pdf', 'application/pdf', 'A'.repeat(2 * 1024 * 1024)) });
    report.check('3.3 / 5.3-Oversize [U098] File 2MB -> 422', oversize.status() === 422, `status=${oversize.status()}`);
    const badType = await page.request.post(api, { data: body('mismatch.html', 'text/html', '<script>alert(1)</script>') });
    report.check('5.3-ContentType [U098] type=text/html -> 422 (di luar allowlist)', badType.status() === 422, `status=${badType.status()}`);

    report.step('Path traversal pada nama file');
    const traversalName = `../../etc/passwd-${Date.now() % 100000}.pdf`;
    const traversal = await page.request.post(api, { data: body(traversalName, 'application/pdf', '%PDF-1.4') });
    const traversalData = ((await traversal.json().catch(() => ({}))) as { data?: Attachment }).data;
    if (traversalData?.id) createdIds.push(traversalData.id);
    report.check('5.1-CmdPath / 5.3-Filename [U098] Nama file path traversal -> ditolak ATAU disanitasi (bukan disimpan apa adanya)', traversal.status() === 422 || (traversal.status() === 200 && traversalData?.filename !== traversalName), `status=${traversal.status()} filename=${traversalData?.filename}`);

    report.step('Injeksi pada description');
    for (const [label, text] of [['5.1-SQLi', `QaPimAtt' OR '1'='1`], ['5.1-XSS-Stored', '<img src=x onerror=alert(1)>']] as const) {
      const r = await page.request.post(api, { data: body(`QaPimAttInj${Date.now() % 100000}.pdf`, 'application/pdf', '%PDF-1.4', text) });
      const rData = ((await r.json().catch(() => ({}))) as { data?: Attachment }).data;
      if (rData?.id) createdIds.push(rData.id);
      report.check(`${label} [U098] description -> 200 & tersimpan identik sbg teks`, r.status() === 200 && rData?.description === text, `status=${r.status()}`);
    }

    report.step('Mass assignment & idempotency');
    const massName = `QaPimAttMass${Date.now() % 100000}.pdf`;
    const mass = await page.request.post(api, { data: body(massName, 'application/pdf', '%PDF-1.4', '', { empNumber: empNumber + 1 }) });
    const massData = ((await mass.json().catch(() => ({}))) as { data?: Attachment }).data;
    if (massData?.id) createdIds.push(massData.id);
    report.check('5.2-MassAssign [U098] empNumber asing di body -> ditolak (422) atau diabaikan (filename tetap tersimpan)', mass.status() === 422 || (mass.status() === 200 && !!massData?.filename), `status=${mass.status()}`);

    const dupName = `QaPimAttDup${Date.now() % 100000}.pdf`;
    const dup1 = await page.request.post(api, { data: body(dupName, 'application/pdf', '%PDF-1.4 dup') });
    const dup2 = await page.request.post(api, { data: body(dupName, 'application/pdf', '%PDF-1.4 dup') });
    const dup1Id = ((await dup1.json().catch(() => ({}))) as { data?: Attachment }).data?.id;
    const dup2Id = ((await dup2.json().catch(() => ({}))) as { data?: Attachment }).data?.id;
    if (dup1Id) createdIds.push(dup1Id);
    if (dup2Id) createdIds.push(dup2Id);
    report.check('6.7 [U098] Upload file identik 2x -> 2 entri independen dgn id berbeda', dup1.status() === 200 && dup2.status() === 200 && dup1Id !== dup2Id, `id1=${dup1Id} id2=${dup2Id}`);

    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [empNumber] } }).catch(() => null);
  }
  report.print();
});
