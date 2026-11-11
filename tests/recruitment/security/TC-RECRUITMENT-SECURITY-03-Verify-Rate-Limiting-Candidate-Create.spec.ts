/**
 * ================================================================================
 * TC-RECRUITMENT-SECURITY-03: Verify Rate Limiting Candidate Create
 * Modul    : Recruitment - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-SECURITY-03-Verify-Rate-Limiting-Candidate-Create.spec.ts
 * Path     : tests/recruitment/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi rate limiting ADA pada POST /api/v2/recruitment/candidates
 *   saat dikirim berulang kali dalam waktu singkat (bukan sekadar
 *   mendokumentasikan ada/tidaknya — per 2026-11-11, TC ini diubah dari
 *   report.finding()-only menjadi hard check, konsisten dengan TC-LOGIN-37:
 *   endpoint mutasi data tanpa rate limiting adalah celah nyata — bisa
 *   dibanjiri data sampah/spam tanpa hambatan — dan harus FAIL + tercatat
 *   otomatis ke Bug-List selama kondisi ini masih benar, bukan cuma jadi
 *   catatan "finding" yang selalu PASS.
 *
 *   [PERINGATAN DESTRUKTIF, DIPATUHI]: TC ini MUTATIF dan menambah data ke
 *   demo publik. Setiap candidate yang dibuat di sini diberi nama depan
 *   persis "QaRateLimitTest" (bukan prefix acak lain) supaya mudah
 *   diidentifikasi dan dibersihkan manual kalau perlu. Jumlah request
 *   dibatasi ke 10 (bukan 20 seperti disarankan) untuk mengurangi volume
 *   data sampah yang ditambahkan ke demo bersama ini, tetap cukup untuk
 *   mengamati ada/tidaknya throttle (429) atau blokir.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/security/TC-RECRUITMENT-SECURITY-03-Verify-Rate-Limiting-Candidate-Create.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const REQUEST_COUNT = 10;

test('TC-RECRUITMENT-SECURITY-03: rate limiting on POST candidates under rapid repeated requests', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-RECRUITMENT-SECURITY-03', 'Rate Limiting Candidate Create', env.baseURL, page);
  const url = `${env.baseURL}/web/index.php/api/v2/recruitment/candidates`;

  report.step(`[API] Kirim POST candidates ${REQUEST_COUNT}x berturut-turut, nama ditandai "QaRateLimitTest" untuk identifikasi`);
  const statuses: number[] = [];
  for (let i = 0; i < REQUEST_COUNT; i += 1) {
    const resp = await page.request.post(url, {
      data: {
        firstName: 'QaRateLimitTest',
        lastName: `Batch${Date.now()}_${i}`,
        email: `qaratelimittest${Date.now()}_${i}@example.com`,
      },
    });
    statuses.push(resp.status());
  }

  const successCount = statuses.filter((s) => s === 200 || s === 201).length;
  const throttledCount = statuses.filter((s) => s === 429).length;
  const otherCount = statuses.length - successCount - throttledCount;

  report.check('TC dijalankan tanpa exception', true);
  report.check(`Semua ${REQUEST_COUNT} request diproses tanpa error 500`, statuses.every((s) => s !== 500), `statuses=${JSON.stringify(statuses)}`);

  report.check(
    `Rate limiting ADA pada POST candidates (minimal 1 dari ${REQUEST_COUNT} request kena 429/throttle)`,
    throttledCount > 0,
    `throttled=${throttledCount}/${REQUEST_COUNT} | success=${successCount} | other=${otherCount} | ` +
      `statuses=${JSON.stringify(statuses)} (tidak ada rate limiting berarti endpoint create candidate bisa ` +
      'dibanjiri data sampah/spam tanpa hambatan dari sisi server)',
  );

  report.finding(
    'Identifikasi data test',
    `Semua candidate yang dibuat di TC ini ditandai firstName "QaRateLimitTest" untuk memudahkan pembersihan ` +
      'manual kalau diperlukan.',
  );

  report.print();
});
