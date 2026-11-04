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
 *   Mendokumentasikan ada/tidaknya rate limiting pada POST
 *   /api/v2/recruitment/candidates saat dikirim berulang kali dalam waktu
 *   singkat.
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

  if (throttledCount > 0) {
    report.finding(
      'Rate limiting TERDETEKSI pada POST candidates',
      `${throttledCount} dari ${REQUEST_COUNT} request kena 429/throttle. statuses=${JSON.stringify(statuses)}`,
    );
  } else {
    report.finding(
      '[RISIKO] TIDAK ADA rate limiting terdeteksi pada POST candidates',
      `Semua ${REQUEST_COUNT} request dalam waktu singkat diproses tanpa throttle (success=${successCount}, ` +
        `other=${otherCount}, statuses=${JSON.stringify(statuses)}). Endpoint create candidate bisa dibanjiri ` +
        'data sampah tanpa hambatan dari sisi server. Semua candidate yang dibuat di TC ini ditandai firstName ' +
        '"QaRateLimitTest" untuk memudahkan pembersihan manual kalau diperlukan.',
    );
  }

  report.print();
});
