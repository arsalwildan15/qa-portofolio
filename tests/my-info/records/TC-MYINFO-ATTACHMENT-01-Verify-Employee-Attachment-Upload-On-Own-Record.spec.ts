/**
 * ================================================================================
 * TC-MYINFO-ATTACHMENT-01 — Verify An Employee's Attachment Upload On Their Own Record (Valid File And Renamed-Executable)
 * Modul    : My Info - Personal Details Attachments (ESS)
 * Kategori : Positive (+) 1.7 | Security (S) 5.3-Rename
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-ATTACHMENT-01-Verify-Employee-Attachment-Upload-On-Own-Record.spec.ts
 * Path     : tests/my-info/records/
 * ================================================================================
 *
 * TUJUAN (sesi ESS, record sendiri):
 *   1.7       Upload file valid (PDF) ke Attachments Personal Details -> POST
 *             pim/employees/<self>/screen/personal/attachments 200 & muncul di daftar.
 *   5.3-Rename Upload file executable (konten "MZ...") yg di-rename jadi .pdf -> HARUS ditolak
 *             (validasi isi file). Confirmed di sisi Admin sbg bug keluarga BG-003: validasi
 *             berbasis nama/tipe client, bukan isi. TC memeriksa apakah sisi file divalidasi
 *             ketika pengunggah adalah KARYAWAN sendiri. Bila file berbahaya diterima -> finding
 *             (konfirmasi gap app-wide), tidak hard-fail ganda atas bug yg sama.
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/records/TC-MYINFO-ATTACHMENT-01-Verify-Employee-Attachment-Upload-On-Own-Record.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { newEssSession, openMyInfoFromMenu, nextResponse } from '../../../src/utils/myInfo';

const VALID_PDF = Buffer.from('%PDF-1.4 valid attachment content for My Info test');
const FAKE_EXE = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // "MZ" DOS/PE header

test('TC-MYINFO-ATTACHMENT-01: an employee attachment upload on their own record', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-ATTACHMENT-01', 'Employee Attachment Upload On Own Record', env.baseURL, page);
  const stamp = Date.now() % 100000;

  report.step('Setup: akun ESS, buka My Info > Personal Details');
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaMyInfoAtt');
  const empNumber = await openMyInfoFromMenu(essPage);
  await essPage.goto(`/web/index.php/pim/viewPersonalDetails/empNumber/${empNumber}`);
  await essPage.locator('.oxd-layout-context').waitFor({ state: 'visible', timeout: 15_000 });
  await essPage.waitForLoadState('networkidle').catch(() => {});

  // The Attachments "+ Add" reveals an inline "Add Attachment" form on the same page (NOT a modal):
  // a file input appears and the attachment's own Save is the last "Save" button (confirmed live).
  const fileInput = essPage.locator('input[type="file"]');
  const attachmentSave = essPage.getByRole('button', { name: 'Save' }).last();
  const openAttachmentForm = async () => {
    await essPage.getByRole('button', { name: /Add/i }).last().click();
    await fileInput.waitFor({ state: 'attached', timeout: 10_000 });
  };

  report.step('[ESS UI] Upload PDF valid ke Attachments');
  await openAttachmentForm();
  await fileInput.setInputFiles({ name: `bukti-${stamp}.pdf`, mimeType: 'application/pdf', buffer: VALID_PDF });
  const post = nextResponse(essPage, '/screen/personal/attachments', 'POST');
  await attachmentSave.click();
  const resp = await post;
  report.check('1.7 / 6.1 POST attachments 200', resp?.status() === 200, `status=${resp?.status()}`);
  report.check('1.7 Attachment muncul di daftar', await isVisibleWithWait(essPage.getByText(`bukti-${stamp}.pdf`), 10_000));

  report.step('[ESS UI] Upload executable di-rename jadi .pdf');
  await openAttachmentForm();
  await fileInput.setInputFiles({ name: `virus-${stamp}.pdf`, mimeType: 'application/pdf', buffer: FAKE_EXE });
  const post2 = nextResponse(essPage, '/screen/personal/attachments', 'POST');
  await attachmentSave.click();
  const resp2 = await post2;
  const dialogError = await isVisibleWithWait(essPage.locator('.oxd-input-field-error-message, .oxd-input-group .oxd-text--span').filter({ hasText: /not allowed|invalid|attachment/i }).first(), 4_000);
  const accepted = resp2?.status() === 200;
  report.check('5.3-Rename Executable di-rename .pdf ditolak (validasi isi file)', !accepted || dialogError, `status=${resp2?.status()}, dialogError=${dialogError}`);
  if (accepted && !dialogError) report.finding('5.3-Rename Gap upload (keluarga BG-003)', 'File executable di-rename .pdf DITERIMA oleh Attachments karyawan sendiri -- validasi berbasis nama/tipe client, bukan isi, konsisten dgn BG-003.');

  await close();
  report.print();
});
