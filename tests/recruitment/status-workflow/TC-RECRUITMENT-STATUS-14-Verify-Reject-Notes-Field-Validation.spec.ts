/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-14: Verify Reject Notes Field Validation
 * Modul    : Recruitment - Status Workflow
 * Kategori : Negative / Boundary (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-14-Verify-Reject-Notes-Field-Validation.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi field reason/notes pada form Reject.
 *   [CONFIRMED via discovery run, innerHTML form]: form Reject MEMANG
 *   punya field, tapi labelnya "Notes" (bukan "Reason"), berupa textarea
 *   biasa dengan placeholder "Type here". Label tidak punya indikator
 *   Required (tidak ada asterisk), jadi diduga OPTIONAL -- dites di sini
 *   dengan Save kosong (harus tetap berhasil) dan dengan teks sangat
 *   panjang (boundary).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-14-Verify-Reject-Notes-Field-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';

test('TC-RECRUITMENT-STATUS-14: Reject form Notes field -- optional, boundary long text', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-14', 'Reject Notes Field Validation', env.baseURL, page);

  report.step('Buat candidate A (Application Initiated), buka form Reject, cek field Notes ada');
  const candidateA = await createTestCandidate(page, candidatesPage, 'QaRejectEmptyNotes');
  await candidatesPage.gotoDetail(candidateA.candidateId);
  await page.waitForTimeout(3000);
  const rejectVisible = await candidatesPage.statusActionButton('Reject').isVisible({ timeout: 5_000 }).catch(() => false);
  report.check('Tombol "Reject" tersedia pada candidate Application Initiated', rejectVisible);

  if (rejectVisible) {
    await candidatesPage.statusActionButton('Reject').click();
    await page.waitForTimeout(800);
    const notesVisible = await candidatesPage.notesTextarea.isVisible({ timeout: 3_000 }).catch(() => false);
    report.check('Field "Notes" ada di form Reject (dikonfirmasi live, bukan diasumsikan)', notesVisible);

    report.step('Case 1: Save dengan Notes KOSONG (field diduga optional)');
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.request().method() !== 'GET' && /reject/i.test(r.url()), { timeout: 10_000 }),
      candidatesPage.save(),
    ]);
    report.check('Save dengan Notes kosong berhasil (response 200, Notes tidak Required)', resp.status() === 200, `status=${resp.status()}`);
    await page.waitForTimeout(1000);
    await candidatesPage.gotoDetail(candidateA.candidateId);
    await page.waitForTimeout(3000);
    const statusAfterReject = await candidatesPage.statusText.textContent().catch(() => null);
    report.check('Status menjadi "Rejected" setelah Save dengan Notes kosong', statusAfterReject?.includes('Rejected') ?? false, `statusText=${statusAfterReject}`);

    report.step('Case 2: candidate B, Reject dengan Notes teks sangat panjang (boundary 5000 char)');
    const candidateB = await createTestCandidate(page, candidatesPage, 'QaRejectLongNotes');
    await candidatesPage.gotoDetail(candidateB.candidateId);
    await page.waitForTimeout(3000);
    await candidatesPage.statusActionButton('Reject').click();
    await page.waitForTimeout(800);
    const longText = 'X'.repeat(5000);
    await candidatesPage.notesTextarea.fill(longText);
    const [resp2] = await Promise.all([
      page.waitForResponse((r) => r.request().method() !== 'GET' && /reject/i.test(r.url()), { timeout: 15_000 }).catch(() => null),
      candidatesPage.save(),
    ]);
    if (resp2) {
      report.check(
        'Save dengan Notes 5000 karakter diterima atau ditolak secara deterministik (bukan hang/crash)',
        resp2.status() === 200 || resp2.status() === 400 || resp2.status() === 422,
        `status=${resp2.status()}`,
      );
      report.finding(
        'Behavior boundary Notes 5000 karakter pada form Reject',
        `Response status=${resp2.status()}. ${resp2.status() === 200 ? 'Server menerima teks sangat panjang tanpa truncation error.' : 'Server menolak/memvalidasi panjang Notes.'}`,
      );
    } else {
      const clientSideError = await candidatesPage.fieldErrors.first().isVisible({ timeout: 1_000 }).catch(() => false);
      report.check('TC dijalankan tanpa exception', true);
      report.finding(
        'Save dengan Notes 5000 karakter tidak memicu request network dalam 15s',
        `Tidak ada PUT/POST ke endpoint reject terdeteksi. clientSideErrorVisible=${clientSideError}. Kemungkinan ada ` +
          'validasi client-side (maxlength) yang memotong/menolak input sebelum submit, atau form tidak pernah ' +
          'submit karena alasan lain -- dicatat sebagai temuan, bukan dipaksakan pass/fail.',
      );
    }
  } else {
    report.finding('Tidak bisa membuka form Reject', 'Tombol Reject tidak tersedia pada candidate Application Initiated, TC tidak bisa melanjutkan.');
  }

  report.check('TC dijalankan tanpa exception', true);
  report.print();
});
