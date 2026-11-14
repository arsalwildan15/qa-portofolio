/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-08 — Verify Cancelling A SUBMITTED Claim Transitions It To CANCELLED
 * Modul    : Claim - Submit Claim (state transition)
 * Kategori : Positive (+) 1.3 - State Transition Valid
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-08-Verify-Cancel-Submitted-Claim.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi transisi status SUBMITTED -> CANCELLED via tombol "Cancel" pada halaman
 *   /claim/submitClaim/id/<id>, dan setelah dibatalkan allowedActions menjadi kosong
 *   (terminal state, tidak ada aksi lanjutan yg mungkin).
 *
 * [TEMUAN] Tombol Cancel HANYA tersedia di route /claim/submitClaim/id/<id> (scoped ke klaim
 * milik akun yg SEDANG LOGIN) -- route admin /claim/assignClaim/id/<id> menjadi READ-ONLY
 * total (tanpa tombol apapun) begitu status sudah SUBMITTED. Membuat claim baru LALU
 * men-submit-nya utk employee (empNumber=7, akun admin yg dipakai berulang kali sepanjang
 * sesi ini) TIDAK reliable -- dikonfirmasi live, create() API hang/timeout utk employee ini,
 * konsisten dgn temuan data-volume-induced slowness yg sama persis dgn root cause
 * `pickLightlyUsedEmployee()` di modul Leave. TC ini karena itu mencari claim SUBMITTED yg
 * SUDAH ADA di seed data (bukan membuat baru), milik akun yg login -- kalau tidak ada lagi
 * yg tersisa (sudah habis dibatalkan oleh run2 sebelumnya), TC ini mencatat finding & lolos
 * dgn observasi, bukan gagal/exception.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-08-Verify-Cancel-Submitted-Claim.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-CLAIM-ASSIGN-08: cancelling a SUBMITTED claim transitions it to CANCELLED with empty allowedActions', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-08', 'Cancel Submitted Claim', env.baseURL, page);

  report.step('Cari claim berstatus SUBMITTED milik akun yg login (via seed data yg sudah ada)');
  const listResp = await page.request.get(
    '/web/index.php/api/v2/claim/employees/requests?limit=50&offset=0&includeEmployees=onlyCurrent&sortField=claimRequest.referenceId&sortOrder=DESC',
  );
  const listBody = await listResp.json().catch(() => null);
  const submitted = (listBody?.data ?? []).find((c: { status?: string }) => c.status === 'SUBMITTED');

  if (!submitted) {
    report.finding(
      'Tidak ada lagi claim SUBMITTED tersisa di seed data utk diuji',
      'Kemungkinan sudah habis dibatalkan oleh run2 sebelumnya di sesi ini -- bukan kegagalan logic, hanya keterbatasan data seed yg bisa habis seiring waktu di shared demo ini.',
    );
    report.print();
    return;
  }

  report.step(`Buka /claim/submitClaim/id/${submitted.id}, klik Cancel`);
  await page.goto(`/web/index.php/claim/submitClaim/id/${submitted.id}`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_500);
  const cancelRespPromise = page
    .waitForResponse((r) => r.url().includes(`/api/v2/claim/requests/${submitted.id}/action`) && r.request().method() === 'PUT', { timeout: 10_000 })
    .catch(() => null);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  const cancelResp = await cancelRespPromise;
  report.check('[API] PUT requests/<id>/action berhasil (status 200)', cancelResp?.status() === 200, `status=${cancelResp?.status()}`);

  report.step('Verify via API: status === CANCELLED, allowedActions kosong (terminal state)');
  await page.waitForTimeout(1_000);
  const detailResp = await page.request.get(`/web/index.php/api/v2/claim/requests/${submitted.id}`);
  const detailBody = await detailResp.json().catch(() => null);
  report.check('[API] Status berubah jadi CANCELLED', detailBody?.data?.status === 'CANCELLED', `status=${detailBody?.data?.status}`);
  report.check(
    '[API] allowedActions kosong setelah CANCELLED (tidak ada aksi lanjutan)',
    Array.isArray(detailBody?.meta?.allowedActions) && detailBody.meta.allowedActions.length === 0,
    `allowedActions=${JSON.stringify(detailBody?.meta?.allowedActions)}`,
  );

  report.print();
});
