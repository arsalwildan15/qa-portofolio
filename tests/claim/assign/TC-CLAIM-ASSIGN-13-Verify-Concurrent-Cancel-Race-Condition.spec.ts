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
 *   Memverifikasi 2 sesi (browser context terpisah, cookie login PEMILIK klaim yg sama) yg
 *   mengklik "Cancel" thd klaim SUBMITTED yg SAMA scr PARALEL tidak menyebabkan
 *   double-processing: HANYA SATU request yg 200, yg lain ditolak krn state sudah berubah.
 *
 * [TEMUAN POSITIF, dikonfirmasi live] Request pertama yg diproses: 200 (CANCELLED); request
 * kedua: 403 -- server mengevaluasi ulang state SAAT request diproses. State akhir CANCELLED
 * sekali, allowedActions kosong.
 *
 * RIWAYAT (2026-11-15): versi lama mengambil klaim SUBMITTED dari GET claim/employees/requests
 * (klaim SEMUA karyawan) sbg Admin -> bisa mendapat klaim milik akun ESS lain -> tombol Cancel
 * tidak ada -> timeout. Sekarang data dibuat sendiri via createEssClaim dan kedua sesi adalah
 * sesi PEMILIK klaim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-13-Verify-Concurrent-Cancel-Race-Condition.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { SubmitClaimPage } from '../../../src/pages';
import { createEssClaim } from '../../../src/utils/createEssClaim';

test('TC-CLAIM-ASSIGN-13: two parallel Cancel clicks on the same SUBMITTED claim result in exactly one successful cancellation', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-13', 'Concurrent Cancel Race Condition', env.baseURL, page);

  report.step('Setup: ESS punya klaim SUBMITTED (via API)');
  const { essPage, close, claimId } = await createEssClaim(page, browser, addEmployeePage, 'QaClmRaceCancel');

  report.step('Buka klaim yg sama di 2 sesi PEMILIK (context terpisah, cookie sama)');
  const context2 = await browser.newContext({ storageState: await essPage.context().storageState() });
  const essPage2 = await context2.newPage();
  const pages = [essPage, essPage2];
  const sessions = pages.map((p) => new SubmitClaimPage(p));
  await Promise.all(sessions.map((s) => s.gotoDetail(claimId)));
  for (const p of pages) {
    await p.getByRole('button', { name: 'Cancel', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
  }

  report.step('Klik "Cancel" di KEDUA sesi scr PARALEL, tangkap kedua respons PUT action');
  const [r1, r2] = await Promise.all(sessions.map((s) => s.clickAction('Cancel')));
  const statuses = [r1?.status(), r2?.status()];
  report.check(
    'Dari 2 request paralel, TEPAT 1 yg 200 dan 1 yg ditolak (bukan 2x 200)',
    statuses.filter((s) => s === 200).length === 1 && statuses.some((s) => s !== undefined && s !== 200),
    `statuses=${JSON.stringify(statuses)}`,
  );

  report.step('[ESS API] State akhir CANCELLED (sekali), allowedActions kosong');
  const detail = await (await essPage.request.get(`/web/index.php/api/v2/claim/requests/${claimId}`)).json().catch(() => null);
  report.check('[API] Status akhir CANCELLED', detail?.data?.status === 'CANCELLED', `status=${detail?.data?.status}`);
  report.check(
    '[API] allowedActions kosong (terminal state, tidak ada aksi ganda tersisa)',
    Array.isArray(detail?.meta?.allowedActions) && detail.meta.allowedActions.length === 0,
    `allowedActions=${JSON.stringify(detail?.meta?.allowedActions)}`,
  );

  await context2.close();
  await close();
  report.print();
});
