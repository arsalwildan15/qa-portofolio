/**
 * ================================================================================
 * TC-BUZZ-SECURITY-11: Verify Rate Limiting On Rapid Post Creation
 * Modul    : Buzz - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-SECURITY-11-Verify-Rate-Limiting-Post-Creation.spec.ts
 * Path     : tests/buzz/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi rate limiting ADA pada POST /api/v2/buzz/posts saat
 *   dikirim berulang kali dalam waktu singkat -- hard check (bukan
 *   report.finding()-only), konsisten dengan TC-LOGIN-37 dan
 *   TC-RECRUITMENT-SECURITY-03: endpoint tanpa rate limiting adalah
 *   celah nyata, lebih parah di sini karena hasilnya BROADCAST ke
 *   seluruh karyawan (bukan cuma 1 record candidate/employee) --
 *   akun yang disalahgunakan bisa men-spam feed company-wide.
 *
 *   Jumlah request dibatasi ke 8 (bukan lebih) untuk mengurangi volume
 *   data sampah yang ditambahkan ke demo bersama ini, tetap cukup
 *   untuk mengamati ada/tidaknya throttle (429).
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/security/TC-BUZZ-SECURITY-11-Verify-Rate-Limiting-Post-Creation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const REQUEST_COUNT = 8;

test('TC-BUZZ-SECURITY-11: creating many posts in rapid succession is rate-limited', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-BUZZ-SECURITY-11', 'Rate Limiting Post Creation', env.baseURL, page);
  const url = `${env.baseURL}/web/index.php/api/v2/buzz/posts`;
  const marker = `QaRateLimitBuzz_${Date.now()}`;

  report.step(`[API] Kirim POST posts ${REQUEST_COUNT}x berturut-turut, teks ditandai "${marker}" untuk identifikasi`);
  const statuses: number[] = [];
  for (let i = 0; i < REQUEST_COUNT; i += 1) {
    const resp = await page.request.post(url, { data: { text: `${marker}_${i}`, type: 'text' } });
    statuses.push(resp.status());
  }

  const successCount = statuses.filter((s) => s === 200 || s === 201).length;
  const throttledCount = statuses.filter((s) => s === 429).length;
  const otherCount = statuses.length - successCount - throttledCount;

  report.check('TC dijalankan tanpa exception', true);
  report.check(`Semua ${REQUEST_COUNT} request diproses tanpa error 500`, statuses.every((s) => s !== 500), `statuses=${JSON.stringify(statuses)}`);
  report.check(
    `Rate limiting ADA pada POST buzz/posts (minimal 1 dari ${REQUEST_COUNT} request kena 429/throttle)`,
    throttledCount > 0,
    `throttled=${throttledCount}/${REQUEST_COUNT} | success=${successCount} | other=${otherCount} | ` +
      `statuses=${JSON.stringify(statuses)} (tanpa rate limiting, akun yang disalahgunakan bisa men-spam feed ` +
      'company-wide tanpa hambatan dari sisi server)',
  );

  report.finding('Identifikasi data test', `Semua post dari TC ini ditandai teks "${marker}" untuk memudahkan pembersihan manual kalau diperlukan.`);

  report.print();
});
