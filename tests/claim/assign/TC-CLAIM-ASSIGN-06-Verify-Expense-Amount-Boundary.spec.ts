/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-06 — Verify Expense Amount Boundary (Negative, Zero)
 * Modul    : Claim - Assign Claim (Expense detail)
 * Kategori : Boundary (B) 3.2
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-06-Verify-Expense-Amount-Boundary.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi batas nilai Amount pada form Add Expense:
 *   - Amount negatif (-100): diblokir CLIENT-SIDE, tidak ada request terkirim sama sekali
 *     (dikonfirmasi live via probe: field Amount menolak karakter "-" scr browser-level).
 *   - Amount 0: request TERKIRIM tapi ditolak SERVER-SIDE dgn 422
 *     ("invalidParamKeys": ["amount"]).
 *   Dua mekanisme penolakan berbeda, keduanya harus dikonfirmasi scr terpisah.
 *
 * [BUG APP, dikonfirmasi live] Saat server menolak amount=0 dgn 422, UX tetap menampilkan
 * toast "Error / Invalid Parameter" yg benar ke user dan halaman tetap interaktif (tombol
 * Cancel masih bisa diklik) -- TAPI frontend JUGA melempar uncaught exception minified ("fe",
 * tanpa stack trace krn build produksi tanpa sourcemap) ke console browser di belakang layar.
 * Bukan bug yg blocking/merusak UX, tapi tetap genuine code-quality issue: error path ini
 * seharusnya ditangani bersih tanpa unhandled exception. Dicatat sbg finding, TC ini
 * SENGAJA tidak mem-whitelist pageerror tsb -- check "no console error" akan gagal sbg bukti
 * nyata bug ini, bukan ditutupi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-06-Verify-Expense-Amount-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

test('TC-CLAIM-ASSIGN-06: expense amount boundary -- negative blocked client-side, zero rejected server-side (422)', async ({
  page,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-06', 'Expense Amount Boundary', env.baseURL, page);

  report.step('Buat claim baru utk pengujian');
  const target = await pickLightlyUsedEmployee(page);
  await assignClaimPage.goto();
  await assignClaimPage.selectEmployee(target.employeeId);
  await assignClaimPage.selectEvent('Travel Allowance');
  await assignClaimPage.selectCurrencyByIndex(1);
  const createResp = await assignClaimPage.create();
  const claimId = (await createResp?.json().catch(() => null))?.data?.id;
  report.check('[API] Claim baru berhasil dibuat', createResp?.status() === 200, `claimId=${claimId}`);
  await assignClaimPage.gotoDetail(claimId);

  report.step('Amount = -100 (negatif): harapannya diblokir client-side, tidak ada POST expenses');
  const negResp = await assignClaimPage.addExpense('Accommodation', '2026-30-11', '-100', 'negative amount test');
  report.check('TIDAK ada POST expenses terkirim utk amount negatif (diblokir client-side)', negResp === null, `status=${negResp?.status()}`);

  report.step('Amount = 0: harapannya POST terkirim tapi ditolak server dgn 422');
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  const zeroResp = await assignClaimPage.addExpense('Accommodation', '2026-30-11', '0', 'zero amount test');
  const zeroBody = await zeroResp?.json().catch(() => null);
  report.check('POST expenses dgn amount=0 ditolak server (422)', zeroResp?.status() === 422, `status=${zeroResp?.status()}`);
  report.check(
    'Error response menyebutkan "amount" sbg invalid param',
    zeroBody?.error?.data?.invalidParamKeys?.includes('amount'),
    `body=${JSON.stringify(zeroBody)}`,
  );

  report.finding(
    'Uncaught exception saat amount=0 ditolak server (bug minor, non-blocking)',
    'Toast error yg benar tetap tampil ke user dan halaman tetap interaktif, tapi frontend melempar unhandled exception minified ("fe") ke console browser di balik layar. Code-quality issue, bukan functional blocker.',
  );
  report.print();
});
