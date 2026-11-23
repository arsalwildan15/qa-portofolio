/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-18 — Verify Expense Update/Delete, Attachment Boundary And Injection
 * Modul    : Claim > Claim Detail (U105, expenses/attachments/actions)
 * Kategori : Positive (+) 1.1-U 1.1-D | Negative (-) 2.6 | Boundary (!) 3.3 | Security (S)
 *            5.1-CmdPath 5.3-ContentType 5.3-DoubleExt 5.3-Oversize 5.3-Filename
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-18-Verify-Expense-Update-Delete-Attachment-Boundary-And-Injection.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * LATAR: menutup 9 dari 12 kode GAP terakhir U105 Claim Detail (2 kode lain -- 5.3-BadExt
 * & 5.3-Rename -- sudah ditutup via perbaikan label literal di TC-CLAIM-ASSIGN-10 yg sudah
 * ADA, 1.7 jg ditambahkan label di sana; TC-CLAIM-ASSIGN-10 jg DIPERBAIKI bug script:
 * FIXTURES_DIR masih mengarah ke `tests/fixtures/uploads` yg SUDAH DIPINDAH ke
 * `tests/_global/fixtures/uploads` sejak refactor sebelumnya -- file fixture tidak pernah
 * ditemukan, TC gagal dgn ENOENT, perbaikan path, perilaku/bug BG-338 terverifikasi masih
 * reproduce identik). Dibuktikan LIVE 24 Nov 2026 via endpoint claim/requests/<id>/expenses
 * dan claim/requests/<id>/attachments {attachment:{name,type,size,base64}, description}:
 *   - PUT expenses/<id> -> 200, update berhasil (1.1-U).
 *   - DELETE expenses {ids:[...]} (bulk) -> 200, delete berhasil (1.1-D).
 *   - PUT/DELETE requests/<id> LANGSUNG (bukan expenses/attachments) -> 405, claim-level
 *     TIDAK punya endpoint update/delete langsung (edit hanya lewat expenses/attachments,
 *     delete hanya lewat action CANCEL) -- operasi pd record yg "salah" (endpoint yg tidak
 *     eksis utk level ini) konsisten ditolak (2.6).
 *   - Attachment 2MB (oversize) -> 422 ditolak, ada batas ukuran server-side (3.3 /
 *     5.3-Oversize, TIDAK ADA bug -- beda dgn PIM/My Info yg size limit-nya longgar).
 *   - Attachment Content-Type di luar allowlist (text/html) -> 422 ditolak (5.3-ContentType,
 *     ada allowlist).
 *   - Attachment double extension ("photo.jpg.php") -> 422 ditolak (5.3-DoubleExt).
 *   - Attachment nama file path traversal ("../../etc/passwd.pdf") -> DITERIMA (200) &
 *     disimpan APA ADANYA tanpa sanitasi -- pola SAMA PERSIS dgn BG-462 (My Info) & BG-463
 *     (PIM), SENGAJA FAILED (R3), BUG BARU (instans ke-3 pola ini, modul Claim).
 *   - Attachment nama file berisi karakter shell ("file;rm -rf /.pdf") -> DITERIMA (200) &
 *     disimpan apa adanya -- command injection via filename TIDAK tereksekusi (tidak ada
 *     proses shell yg memanggil filename ini), tapi tetap bukti TIDAK ADA sanitasi nama
 *     file sama sekali, bagian dari temuan yg sama (5.1-CmdPath).
 *
 * HASIL 24 Nov 2026: lolos sebagian besar, 2 gagal SENGAJA (5.1-CmdPath/5.3-Filename, BUG
 *   BARU -- instans ke-3 pola BG-462/BG-463). MENUTUP U105 SEPENUHNYA (digabung dgn
 *   perbaikan label di TC-CLAIM-ASSIGN-10) -> Claim mencapai ceiling final.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-18-Verify-Expense-Update-Delete-Attachment-Boundary-And-Injection.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

const API = '/web/index.php/api/v2/';

type AttachmentResp = { attachment?: { fileName?: string; fileType?: string } };

test('TC-CLAIM-ASSIGN-18: expense update/delete, attachment boundary, injection', async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-18', 'Expense Update Delete Attachment Boundary Injection', env.baseURL, page);
  const target = await pickLightlyUsedEmployee(page);
  await page.goto('/web/index.php/claim/assignClaim');

  const created = await page.request.post(`${API}claim/employees/${target.empNumber}/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
  const claimId = (await created.json().catch(() => null))?.data?.id as number | undefined;
  report.check('[Setup] Klaim baru berhasil dibuat', created.status() === 200 && !!claimId, `status=${created.status()} id=${claimId}`);
  if (!claimId) throw new Error('Setup gagal, tidak bisa lanjut');

  report.step('1.1-U / 1.1-D Expense -- update lalu delete');
  const exp = await page.request.post(`${API}claim/requests/${claimId}/expenses`, { data: { expenseTypeId: 1, date: '2026-07-07', amount: '100', note: null } });
  const expenseId = (await exp.json().catch(() => null))?.data?.id as number | undefined;
  report.check('[Setup] Expense line item berhasil dibuat', exp.status() === 200 && !!expenseId, `status=${exp.status()}`);
  if (expenseId) {
    const updateExp = await page.request.put(`${API}claim/requests/${claimId}/expenses/${expenseId}`, { data: { expenseTypeId: 1, date: '2026-07-07', amount: '200', note: 'updated' } });
    const updateBody = await updateExp.json().catch(() => null);
    report.check('1.1-U [U105] PUT expenses/<id> -> 200, amount ter-update', updateExp.status() === 200 && updateBody?.data?.amount === 200, `status=${updateExp.status()} amount=${updateBody?.data?.amount}`);

    const deleteExp = await page.request.delete(`${API}claim/requests/${claimId}/expenses`, { data: { ids: [expenseId] } });
    report.check('1.1-D [U105] DELETE expenses {ids:[...]} -> 200, expense terhapus', deleteExp.status() === 200, `status=${deleteExp.status()}`);
  }

  report.step('2.6 Operasi pd level yg salah -- PUT/DELETE langsung ke requests/<id>');
  const putDirect = await page.request.put(`${API}claim/requests/${claimId}`, { data: { claimEventId: 3, currencyId: 'AFN' } });
  const deleteDirect = await page.request.delete(`${API}claim/requests/${claimId}`);
  report.check('2.6 [U105] PUT langsung ke requests/<id> (bukan via expenses/attachments) -> 405, endpoint ini tidak eksis', putDirect.status() === 405, `status=${putDirect.status()}`);
  report.check('2.6 [U105] DELETE langsung ke requests/<id> -> 405, hapus klaim hanya lewat action CANCEL, bukan endpoint ini', deleteDirect.status() === 405, `status=${deleteDirect.status()}`);

  const b64 = (s: string) => Buffer.from(s).toString('base64');
  const attBody = (name: string, type: string, content: string) => ({ attachment: { name, type, size: content.length, base64: b64(content) }, description: '' });

  report.step('3.3 / 5.3-Oversize Attachment 2MB (oversize)');
  const oversize = await page.request.post(`${API}claim/requests/${claimId}/attachments`, { data: attBody('big.pdf', 'application/pdf', 'A'.repeat(2 * 1024 * 1024)) });
  report.check('3.3 / 5.3-Oversize [U105] Attachment 2MB -> 422 ditolak (ada batas ukuran server-side, tidak ada bug)', oversize.status() === 422, `status=${oversize.status()}`);

  report.step('5.3-ContentType Content-Type di luar allowlist');
  const badType = await page.request.post(`${API}claim/requests/${claimId}/attachments`, { data: attBody('mismatch.html', 'text/html', '<script>alert(1)</script>') });
  report.check('5.3-ContentType [U105] Content-Type text/html (di luar allowlist) -> 422 ditolak', badType.status() === 422, `status=${badType.status()}`);

  report.step('5.3-DoubleExt Nama file ekstensi ganda');
  const doubleExt = await page.request.post(`${API}claim/requests/${claimId}/attachments`, { data: attBody('photo.jpg.php', 'image/jpeg', '<?php echo 1; ?>') });
  report.check('5.3-DoubleExt [U105] "photo.jpg.php" (double extension) -> 422 ditolak', doubleExt.status() === 422, `status=${doubleExt.status()}`);

  report.step('5.1-CmdPath / 5.3-Filename Nama file path traversal & karakter shell');
  const traversalName = `../../etc/passwd-${Date.now() % 100000}.pdf`;
  const traversal = await page.request.post(`${API}claim/requests/${claimId}/attachments`, { data: attBody(traversalName, 'application/pdf', '%PDF-1.4') });
  const traversalData = ((await traversal.json().catch(() => ({}))) as { data?: AttachmentResp }).data;
  const traversalFileName = traversalData?.attachment?.fileName;
  report.check('5.1-CmdPath / 5.3-Filename [U105] Nama file path traversal -> ditolak ATAU disanitasi (bukan disimpan apa adanya) -- pola sama dgn BG-462 (My Info) & BG-463 (PIM), instans ke-3 di modul Claim kalau gagal', traversal.status() === 422 || (traversal.status() === 200 && !!traversalFileName && traversalFileName !== traversalName), `status=${traversal.status()} fileName=${traversalFileName}`);

  const cmdInjectName = `file;rm -rf /-${Date.now() % 100000}.pdf`;
  const cmdInject = await page.request.post(`${API}claim/requests/${claimId}/attachments`, { data: attBody(cmdInjectName, 'application/pdf', '%PDF-1.4') });
  const cmdInjectData = ((await cmdInject.json().catch(() => ({}))) as { data?: AttachmentResp }).data;
  const cmdInjectFileName = cmdInjectData?.attachment?.fileName;
  report.check('5.1-CmdPath [U105] Nama file berisi karakter shell -> ditolak ATAU disanitasi (bukan disimpan apa adanya)', cmdInject.status() === 422 || (cmdInject.status() === 200 && !!cmdInjectFileName && cmdInjectFileName !== cmdInjectName), `status=${cmdInject.status()} fileName=${cmdInjectFileName}`);

  report.print();
});
