/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-13 — Verify Concurrent Cancel Requests On The Same Claim Don't Double-Process
 * Modul    : Claim - Submit Claim (Concurrency)
 * Kategori : Edge Case (!) 4.4 - Race Condition
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-13-Verify-Concurrent-Cancel-Race-Condition.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi 2 sesi (browser context terpisah, cookie login yg sama) yg menembak klik
 *   "Cancel" thd claim SUBMITTED yg SAMA scr PARALEL tidak menyebabkan double-processing --
 *   harus ada locking/state-check yg benar: HANYA SATU request yg berhasil (200), yg lain
 *   ditolak krn state sudah berubah saat request itu diproses, BUKAN keduanya "berhasil".
 *
 * [TEMUAN POSITIF, dikonfirmasi live] Dari 2 request PUT .../action (CANCEL) yg ditembak
 * BENAR-BENAR paralel (Promise.all pada 2 context berbeda) thd claim yg sama:
 *   - Request pertama yg diproses server: 200, claim berhasil CANCELLED.
 *   - Request kedua: 403 Unauthorized -- ditolak krn server mengevaluasi ulang state/otorisasi
 *     SAAT request itu diproses (claim sudah tidak lagi berstatus SUBMITTED yg mengizinkan
 *     CANCEL), bukan berdasarkan snapshot state di awal request.
 *   - State akhir: CANCELLED (sekali), allowedActions kosong -- tidak ada korupsi data,
 *     tidak ada double-cancel, tidak ada race condition yg merusak integritas data.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-13-Verify-Concurrent-Cancel-Race-Condition.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-CLAIM-ASSIGN-13: two parallel Cancel clicks on the same SUBMITTED claim result in exactly one successful cancellation', async ({
  page,
  browser,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-13', 'Concurrent Cancel Race Condition', env.baseURL, page);

  report.step('Cari claim berstatus SUBMITTED milik akun yg login (via seed data yg sudah ada)');
  const listResp = await page.request.get(
    '/web/index.php/api/v2/claim/employees/requests?limit=50&offset=0&includeEmployees=onlyCurrent&sortField=claimRequest.referenceId&sortOrder=DESC',
  );
  const listBody = await listResp.json().catch(() => null);
  const submitted = (listBody?.data ?? []).find((c: { status?: string }) => c.status === 'SUBMITTED');

  if (!submitted) {
    report.finding(
      'Tidak ada lagi claim SUBMITTED tersisa utk diuji',
      'Kemungkinan sudah habis dibatalkan oleh run2 sebelumnya di sesi ini -- keterbatasan data seed di shared demo, bukan kegagalan logic.',
    );
    report.print();
    return;
  }
  const claimId = submitted.id;

  report.step('Buka claim yg sama di 2 sesi browser context terpisah (cookie login sama)');
  const context2 = await browser.newContext({ storageState: await page.context().storageState() });
  const page2 = await context2.newPage();
  for (const p of [page, page2]) {
    await p.goto(`/web/index.php/claim/submitClaim/id/${claimId}`);
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(1_200);
  }

  report.step('Klik "Cancel" di KEDUA sesi scr PARALEL (Promise.all), tangkap kedua response PUT action');
  const resp1Promise = page.waitForResponse((r) => r.url().includes(`/claim/requests/${claimId}/action`) && r.request().method() === 'PUT', { timeout: 10_000 }).catch(() => null);
  const resp2Promise = page2.waitForResponse((r) => r.url().includes(`/claim/requests/${claimId}/action`) && r.request().method() === 'PUT', { timeout: 10_000 }).catch(() => null);
  await Promise.all([
    page.getByRole('button', { name: 'Cancel', exact: true }).click(),
    page2.getByRole('button', { name: 'Cancel', exact: true }).click(),
  ]);
  const [r1, r2] = await Promise.all([resp1Promise, resp2Promise]);
  const statuses = [r1?.status(), r2?.status()].sort();

  report.step('Verify: TEPAT SATU request berhasil (200), yg lain ditolak -- bukan keduanya sukses');
  report.check(
    'Dari 2 request paralel, TEPAT 1 yg 200 dan 1 yg ditolak (bukan 2x 200)',
    statuses.filter((s) => s === 200).length === 1 && statuses.some((s) => s !== 200),
    `statuses=${JSON.stringify(statuses)}`,
  );

  report.step('Verify via API: state akhir CANCELLED (sekali), allowedActions kosong -- tidak ada korupsi data');
  await page.waitForTimeout(1_000);
  const detailResp = await page.request.get(`/web/index.php/api/v2/claim/requests/${claimId}`);
  const detailBody = await detailResp.json().catch(() => null);
  report.check('[API] Status akhir CANCELLED', detailBody?.data?.status === 'CANCELLED', `status=${detailBody?.data?.status}`);
  report.check(
    '[API] allowedActions kosong (terminal state, tidak ada aksi ganda tersisa)',
    Array.isArray(detailBody?.meta?.allowedActions) && detailBody.meta.allowedActions.length === 0,
    `allowedActions=${JSON.stringify(detailBody?.meta?.allowedActions)}`,
  );

  await context2.close();
  report.print();
});
