/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-14 — Verify Browser Back/Forward After Create Does Not Resubmit
 * Modul    : Claim - Assign Claim
 * Kategori : Edge Case (!) 4.3 - Navigasi Tidak Biasa (browser back/forward)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-14-Verify-Browser-Back-Forward-No-Resubmit.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik tombol Back browser setelah berhasil Create claim, lalu klik Forward
 *   lagi, TIDAK memicu resubmit/duplicate create, dan form yg muncul via Forward bersih
 *   (bukan form lama dgn data yg sudah ter-submit sebelumnya).
 *
 * [TEMUAN POSITIF, dikonfirmasi live] Form Create Claim adalah SPA single-route -- sukses
 * Create TIDAK push history state baru (URL tetap /claim/assignClaim, tidak redirect ke
 * halaman detail). Akibatnya:
 *   - Browser Back dari form ini kembali ke halaman SEBELUM form dibuka (mis. Dashboard),
 *     BUKAN ke "versi form yg belum di-submit" -- tidak ada state form apapun yg di-cache
 *     scr stale di history utk di-resubmit.
 *   - Browser Forward balik lagi ke /claim/assignClaim dgn form KOSONG/FRESH (bukan form yg
 *     masih terisi dgn data submit sebelumnya), krn Vue Router me-render ulang komponen dari
 *     awal, bukan me-restore DOM state lama.
 *   Kesimpulan: TIDAK ada risiko duplicate-submit-via-back/forward di form ini.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-14-Verify-Browser-Back-Forward-No-Resubmit.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

test('TC-CLAIM-ASSIGN-14: browser back after Create then forward does not resubmit or show stale filled data', async ({
  page,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-14', 'Browser Back/Forward No Resubmit', env.baseURL, page);

  report.step('Buat claim baru, catat jumlah claim employee ini SEBELUM navigasi back/forward');
  const target = await pickLightlyUsedEmployee(page);
  await assignClaimPage.goto();
  await assignClaimPage.selectEmployee(target.employeeId);
  await assignClaimPage.selectEvent('Travel Allowance');
  await assignClaimPage.selectCurrencyByIndex(1);
  const createResp = await assignClaimPage.create();
  report.check('[API] Claim pertama berhasil dibuat', createResp?.status() === 200, `status=${createResp?.status()}`);
  await page.waitForTimeout(1_000);

  let postFiredAfterNav = false;
  page.on('request', (r) => {
    if (/\/api\/v2\/claim\/employees\/\d+\/requests/.test(r.url()) && r.method() === 'POST') postFiredAfterNav = true;
  });

  report.step('Klik browser Back');
  await page.goBack();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  report.check('TIDAK ada POST create terkirim ulang hanya krn navigasi Back', postFiredAfterNav === false);

  report.step('Klik browser Forward -- harus kembali ke form Create yg BERSIH (bukan data lama)');
  await page.goForward();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  const textAfterForward = await page.locator('body').innerText();
  report.check('URL kembali ke halaman Create Claim Request', page.url().includes('/claim/assignClaim'), `url=${page.url()}`);
  report.check(
    'Form yg muncul via Forward BERSIH (menampilkan placeholder "-- Select --", bukan Event/Currency yg sudah terisi sebelumnya)',
    textAfterForward.includes('-- Select --'),
  );
  report.check('TIDAK ada POST create yg otomatis terkirim hanya krn navigasi Forward', postFiredAfterNav === false);

  report.print();
});
