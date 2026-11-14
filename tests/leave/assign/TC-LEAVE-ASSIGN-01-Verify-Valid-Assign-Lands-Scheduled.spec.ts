/**
 * ================================================================================
 * TC-LEAVE-ASSIGN-01 — Verify Valid Assign Leave Lands As "Scheduled" (No Approval Step)
 * Modul    : Leave - Assign Leave
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-ASSIGN-01-Verify-Valid-Assign-Lands-Scheduled.spec.ts
 * Path     : tests/leave/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi admin yg meng-assign leave LANGSUNG utk seorang
 *   employee (dgn balance cukup) menghasilkan request berstatus
 *   "Scheduled" SEGERA -- bukan "Pending Approval" seperti Apply Leave
 *   self-service -- krn ini adalah aksi administratif yg melewati
 *   approval step. Dikonfirmasi live sblm TC ini ditulis.
 *
 * [TEMUAN] Dikonfirmasi live: server kadang menolak tanggal weekday yg SUDAH lolos cek
 * real-time balance Apply Leave (bukan weekend, balance cukup) dgn 400 "Failed to Submit:
 * No Working Days Selected" saat di-assign lewat Assign Leave, utk employee shared demo ini
 * secara spesifik -- tidak konsisten antar tanggal/run. Diperlakukan sbg gejala
 * instabilitas/konfigurasi work-week employee shared demo (bukan bug skrip ini), sehingga
 * retry dgn tanggal lain dilakukan sebelum TC ini dianggap gagal.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/assign/TC-LEAVE-ASSIGN-01-Verify-Valid-Assign-Lands-Scheduled.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createLeaveEntitlement } from '../../../src/utils/createLeaveEntitlement';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';
import { uniqueLeaveWeekday } from '../../../src/data/testData';

test('TC-LEAVE-ASSIGN-01: assigning leave to an employee with sufficient balance lands as Scheduled immediately', async ({
  page,
  leaveEntitlementPage,
  assignLeavePage,
  leaveListPage,
}, testInfo) => {
  testInfo.setTimeout(240_000);
  // The date-retry loop below can legitimately hit a rejected candidate (4xx) before landing
  // on one that succeeds -- Chromium logs each as "Failed to load resource", expected noise
  // from the app's own in-page fetch, not evidence of a bug (see TestReport).
  const report = new TestReport('TC-LEAVE-ASSIGN-01', 'Valid Assign Lands Scheduled', env.baseURL, page, [
    /Failed to load resource.*4\d\d/,
  ]);

  report.step('Assign entitlement ke diri sendiri (employee target), cari tanggal weekday aman');
  const me = await getLoggedInEmployeeName(page);
  await createLeaveEntitlement(leaveEntitlementPage, me.employeeId, 'US - Vacation', '500');

  report.step('Buka Assign Leave, pilih employee, leave type; coba beberapa tanggal berbeda jika server menolak "No Working Days"');
  await assignLeavePage.goto();
  const assignedEmployeeName = await assignLeavePage.selectEmployee(me.employeeId);
  await assignLeavePage.selectLeaveType('US - Vacation');

  let response: Awaited<ReturnType<typeof assignLeavePage.submit>>['response'] = null;
  let overrideDialogShown = false;
  let usedDate = '';
  let lastErrorBody: unknown = null;
  // [TEMUAN] hasOverlap() kadang HANG total (bukan cuma lambat) utk employee ini --
  // dikonfirmasi live, kemungkinan krn employee shared demo ini sudah punya SANGAT banyak
  // leave request dari seluruh rangkaian TC yg berjalan hari ini, membuat query overlap
  // jadi berat. Tidak dipakai lagi di sini: jika tanggal kebetulan overlap, submit() akan
  // gagal dan loop ini otomatis coba tanggal lain -- resiliensi yg sudah ada tanpa perlu
  // pre-check tambahan yg justru jadi titik hang-nya sendiri. uniqueLeaveWeekday() sudah
  // menghindari weekend secara internal.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = uniqueLeaveWeekday(5 + attempt);
    await assignLeavePage.fillDateRange(candidate, candidate);
    const result = await assignLeavePage.submit();
    if (result.response?.status() === 200) {
      response = result.response;
      overrideDialogShown = result.overrideDialogShown;
      usedDate = candidate;
      break;
    }
    lastErrorBody = await result.response?.json().catch(() => null);
  }
  report.check(
    'Berhasil assign leave (status 200) dlm beberapa percobaan tanggal',
    response?.status() === 200,
    `usedDate=${usedDate}, employee="${assignedEmployeeName}", lastError=${JSON.stringify(lastErrorBody)}`,
  );
  report.check('TIDAK ada dialog override balance (balance cukup, sesuai ekspektasi)', overrideDialogShown === false);

  report.step('Verify via Leave List: status record baru adalah "Scheduled", BUKAN "Pending Approval"');
  await leaveListPage.goto();
  await leaveListPage.selectEmployee(me.employeeId);
  await leaveListPage.clearStatusChip();
  await leaveListPage.selectStatus('Scheduled');
  await leaveListPage.search();
  // [BUG SCRIPT, diperbaiki] rowByText('') pada usedDate kosong (semua percobaan assign
  // gagal di atas) match SEMUA baris krn string kosong adalah substring dari apapun --
  // membuat check ini false-positive PASS walau assign-nya sendiri sudah gagal. Guard
  // eksplisit: kalau usedDate kosong, lompati verifikasi list ini (check assign di atas yg
  // sudah gagal cukup utk menandai TC ini FAILED).
  const scheduledRow =
    usedDate !== '' && (await leaveListPage.rowByText(usedDate).first().isVisible({ timeout: 5_000 }).catch(() => false));
  report.check(
    'Record baru muncul dgn status "Scheduled" saat Leave List difilter ke Scheduled',
    scheduledRow,
    `usedDate=${usedDate}`,
  );

  report.print();
});
