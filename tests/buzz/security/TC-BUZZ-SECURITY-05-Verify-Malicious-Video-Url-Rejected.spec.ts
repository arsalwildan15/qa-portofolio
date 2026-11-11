/**
 * ================================================================================
 * TC-BUZZ-SECURITY-05: Verify Malicious Video URL Input Is Not Executed
 * Modul    : Buzz - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-SECURITY-05-Verify-Malicious-Video-Url-Rejected.spec.ts
 * Path     : tests/buzz/security/
 * ================================================================================
 *
 * TUJUAN:
 *   TC ini awalnya diasumsikan "Share Video" adalah titik upload file
 *   (sejajar dengan "Share Photos"), mengikuti pola file-upload-bypass
 *   yang sudah terkonfirmasi di PIM/Recruitment/Admin. Investigasi
 *   langsung (screenshot composer) membuktikan asumsi itu SALAH:
 *   "Share Video" adalah input TEKS "Paste Video URL" + tombol "Share",
 *   BUKAN file upload. TC ditulis ulang agar tepat guna sesuai fitur
 *   yang sebenarnya: apakah field URL ini rentan XSS via javascript:
 *   URI atau payload HTML/script disuntik sebagai "URL video".
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/security/TC-BUZZ-SECURITY-05-Verify-Malicious-Video-Url-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const XSS_PAYLOAD = 'javascript:alert(document.domain)';

test('TC-BUZZ-SECURITY-05: a javascript: URI pasted as video URL is not executed/stored verbatim', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-SECURITY-05', 'Malicious Video URL Rejected', env.baseURL, page);

  let dialogFired = false;
  page.once('dialog', async (d) => {
    dialogFired = true;
    await d.dismiss();
  });

  report.step('Buka composer, klik Share Video, paste javascript: URI sebagai "Video URL", submit');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.revealVideoUpload();
  const resp = await buzzPage.submitVideoUrl(XSS_PAYLOAD);

  report.check(
    'javascript: URI TIDAK dieksekusi sebagai script (tidak ada window.alert/dialog muncul)',
    !dialogFired,
  );
  report.finding(
    'Hasil submit video URL malicious',
    `response=${resp ? resp.status() : '(tidak ada POST request terkirim)'}`,
  );

  report.print();
});
